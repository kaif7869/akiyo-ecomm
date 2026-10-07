import { NextResponse } from "next/server";
import {
  getPhonePeConfig,
  verifyPhonePeChecksum,
  isPhonePeV2Configured,
  checkPhonePeV2OrderStatus,
} from "@/lib/phonepe";
import { createOrderReceipt, verifyOrderReceipt } from "@/lib/order-receipt";
import {
  claimOrderEmail,
  confirmOrderPayment,
  getOrder,
  setOrderEmailStatus,
} from "@/lib/order-store";
import { sendOrderEmail } from "@/lib/order-email";

export async function POST(request: Request) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

    const contentType = request.headers.get("content-type") || "";
    let base64Response = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      base64Response = (formData.get("response") as string) || "";
    } else {
      const json = await request.json().catch(() => ({}));
      base64Response = json.response || "";
    }

    if (!base64Response) {
      return NextResponse.redirect(`${appUrl}/order-success?status=pending`, 303);
    }

    const config = getPhonePeConfig();
    const receivedChecksum = request.headers.get("x-verify") || "";
    if (config && receivedChecksum) {
      if (!verifyPhonePeChecksum(
        base64Response,
        receivedChecksum,
        config.saltKey,
        config.saltIndex
      )) {
        console.warn("PhonePe callback checksum verification failed.");
        return NextResponse.redirect(`${appUrl}/order-success?status=unverified`, 303);
      }
    }

    const decoded: unknown = JSON.parse(
      Buffer.from(base64Response, "base64").toString("utf-8")
    );
    if (!decoded || typeof decoded !== "object") {
      return NextResponse.redirect(`${appUrl}/order-success?status=unverified`, 303);
    }

    const result = decoded as {
      code?: unknown;
      data?: { merchantTransactionId?: unknown; amount?: unknown };
    };
    const transactionId = result.data?.merchantTransactionId;
    const amountPence = result.data?.amount;

    if (
      result.code !== "PAYMENT_SUCCESS" ||
      typeof transactionId !== "string" ||
      !/^AKY_[a-f0-9]{32}$/.test(transactionId) ||
      typeof amountPence !== "number" ||
      !Number.isSafeInteger(amountPence) ||
      amountPence <= 0
    ) {
      return NextResponse.redirect(`${appUrl}/order-success?status=pending`, 303);
    }

    let pendingOrder = await getOrder(transactionId);
    if (!pendingOrder) {
      // Fallback: Recover order details from signed cookie if database is not configured
      const cookieHeader = request.headers.get("cookie") || "";
      const cookieMatch = cookieHeader.match(new RegExp(`akiyo_pending_${transactionId}=([^;]+)`));
      if (cookieMatch) {
        const payload = verifyOrderReceipt(decodeURIComponent(cookieMatch[1]));
        if (payload && payload.transactionId === transactionId) {
          pendingOrder = {
            transactionId,
            customerName: "Customer",
            customerEmail: payload.customerEmail || "",
            customerPhone: "",
            amountPence: payload.amountPence,
            items: payload.items || [],
            paymentStatus: "pending",
            emailStatus: "pending",
          };
        }
      }
    }

    if (!pendingOrder || pendingOrder.amountPence !== amountPence) {
      return NextResponse.redirect(`${appUrl}/order-success?status=unverified`, 303);
    }

    const confirmed = await confirmOrderPayment(transactionId, amountPence);
    const paidOrder = confirmed || {
      ...pendingOrder,
      paymentStatus: "paid" as const,
    };

    if (paidOrder.emailStatus !== "sent") {
      const claimedOrder = await claimOrderEmail(transactionId);
      if (claimedOrder) {
        try {
          await sendOrderEmail(claimedOrder);
          await setOrderEmailStatus(transactionId, "sent");
        } catch (emailError) {
          console.error("Order email delivery failed.", emailError);
          await setOrderEmailStatus(transactionId, "failed");
        }
      }
    }

    const receipt = createOrderReceipt(transactionId, amountPence, {
      customerEmail: paidOrder.customerEmail,
      items: paidOrder.items,
    });

    if (!receipt) {
      return NextResponse.redirect(`${appUrl}/order-success?status=pending`, 303);
    }

    const response = NextResponse.redirect(
      `${appUrl}/order-success?receipt=${encodeURIComponent(receipt)}`,
      303
    );

    response.cookies.set(`akiyo_paid_${transactionId}`, receipt, {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
    });

    return response;
  } catch (error) {
    console.error("PhonePe callback verification failed.", error);
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    return NextResponse.redirect(`${appUrl}/order-success?status=unverified`, 303);
  }
}

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

  try {
    const url = new URL(request.url);
    const orderId =
      url.searchParams.get("merchantOrderId") ||
      url.searchParams.get("orderId") ||
      url.searchParams.get("transactionId");

    if (!orderId) {
      return NextResponse.redirect(`${appUrl}/order-success?status=pending`, 303);
    }

    let order = await getOrder(orderId);

    // If order was not yet found in DB, try recovering from signed cookie
    if (!order) {
      const cookieHeader = request.headers.get("cookie") || "";
      const cookieMatch = cookieHeader.match(new RegExp(`akiyo_pending_${orderId}=([^;]+)`));
      if (cookieMatch) {
        const payload = verifyOrderReceipt(decodeURIComponent(cookieMatch[1]));
        if (payload && payload.transactionId === orderId) {
          order = {
            transactionId: orderId,
            customerName: "Customer",
            customerEmail: payload.customerEmail || "",
            customerPhone: "",
            amountPence: payload.amountPence,
            items: payload.items || [],
            paymentStatus: "pending",
            emailStatus: "pending",
          };
        }
      }
    }

    // Check PhonePe V2 status if configured
    let isConfirmedPaid = order?.paymentStatus === "paid";
    let settledAmount = order?.amountPence || 2000;

    if (!isConfirmedPaid && isPhonePeV2Configured()) {
      try {
        const v2Status = await checkPhonePeV2OrderStatus(orderId);
        if (v2Status.paid) {
          isConfirmedPaid = true;
          if (v2Status.amount) settledAmount = v2Status.amount;
        }
      } catch (checkErr) {
        console.warn("V2 callback status check error:", checkErr);
      }
    }

    if (isConfirmedPaid && order) {
      const confirmed = await confirmOrderPayment(orderId, settledAmount);
      const paidOrder = confirmed || { ...order, paymentStatus: "paid" as const };

      if (paidOrder.emailStatus !== "sent") {
        const claimed = await claimOrderEmail(orderId);
        if (claimed) {
          try {
            await sendOrderEmail(claimed);
            await setOrderEmailStatus(orderId, "sent");
          } catch (mailErr) {
            console.error("Order delivery email failed:", mailErr);
          }
        }
      }

      const receipt = createOrderReceipt(orderId, settledAmount, {
        customerEmail: paidOrder.customerEmail,
        items: paidOrder.items,
      });

      const response = NextResponse.redirect(
        `${appUrl}/order-success?receipt=${encodeURIComponent(receipt)}`,
        303
      );

      response.cookies.set(`akiyo_paid_${orderId}`, receipt, {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400,
      });

      return response;
    }

    return NextResponse.redirect(
      `${appUrl}/order-success?status=pending&orderId=${orderId}`,
      303
    );
  } catch (err) {
    console.error("PhonePe GET callback error:", err);
    return NextResponse.redirect(`${appUrl}/order-success?status=unverified`, 303);
  }
}

