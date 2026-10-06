import { NextResponse } from "next/server";
import { getPhonePeConfig, verifyPhonePeChecksum } from "@/lib/phonepe";
import { createOrderReceipt } from "@/lib/order-receipt";
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
    if (!receivedChecksum || !verifyPhonePeChecksum(
      base64Response,
      receivedChecksum,
      config.saltKey,
      config.saltIndex
    )) {
      return NextResponse.redirect(`${appUrl}/order-success?status=unverified`, 303);
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

    const pendingOrder = await getOrder(transactionId);
    if (!pendingOrder || pendingOrder.amountPence !== amountPence) {
      return NextResponse.redirect(`${appUrl}/order-success?status=unverified`, 303);
    }

    const paidOrder = await confirmOrderPayment(transactionId, amountPence);
    if (!paidOrder) {
      return NextResponse.redirect(`${appUrl}/order-success?status=unverified`, 303);
    }

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

    const receipt = createOrderReceipt(transactionId, amountPence);
    if (!receipt) {
      return NextResponse.redirect(`${appUrl}/order-success?status=pending`, 303);
    }
    return NextResponse.redirect(
      `${appUrl}/order-success?receipt=${encodeURIComponent(receipt)}`,
      303
    );
  } catch (error) {
    console.error("PhonePe callback verification failed.", error);
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    return NextResponse.redirect(`${appUrl}/order-success?status=unverified`, 303);
  }
}

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

  return NextResponse.redirect(
    `${appUrl}/order-success?status=pending`,
    303
  );
}
