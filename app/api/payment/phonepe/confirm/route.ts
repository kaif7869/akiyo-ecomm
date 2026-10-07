import { NextResponse } from "next/server";
import {
  claimOrderEmail,
  confirmOrderPayment,
  getOrder,
  setOrderEmailStatus,
  createPendingOrder,
  getOrderItemsFromCart,
  type OrderRecord,
} from "@/lib/order-store";
import { createOrderReceipt } from "@/lib/order-receipt";
import { sendOrderEmail } from "@/lib/order-email";
import { products } from "@/data/products";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const {
      merchantTransactionId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      amount,
    } = input;

    if (!merchantTransactionId || typeof merchantTransactionId !== "string") {
      return NextResponse.json({ success: false, error: "Missing order reference." }, { status: 400 });
    }

    let order = await getOrder(merchantTransactionId);

    if (!order && Array.isArray(items) && items.length > 0) {
      const pricedCart = getOrderItemsFromCart(
        items as Array<{ id: unknown; quantity: unknown }>,
        products
      );
      if (pricedCart) {
        await createPendingOrder({
          transactionId: merchantTransactionId,
          customerName: typeof customerName === "string" ? customerName.trim() : "Customer",
          customerEmail: typeof customerEmail === "string" ? customerEmail.trim().toLowerCase() : "",
          customerPhone: typeof customerPhone === "string" ? customerPhone.replace(/\D/g, "") : "",
          amountPence: pricedCart.amountPence,
          items: pricedCart.items,
        });
        order = await getOrder(merchantTransactionId);
      }
    }

    const amountPence = order
      ? order.amountPence
      : typeof amount === "number" && Number.isSafeInteger(amount) && amount > 0
        ? amount
        : 2000;

    let paidOrder: OrderRecord;
    const confirmedOrder = await confirmOrderPayment(merchantTransactionId, amountPence);

    if (confirmedOrder) {
      paidOrder = confirmedOrder;
    } else if (order) {
      paidOrder = { ...order, paymentStatus: "paid" };
    } else {
      paidOrder = {
        transactionId: merchantTransactionId,
        customerName: typeof customerName === "string" ? customerName.trim() : "Customer",
        customerEmail: typeof customerEmail === "string" ? customerEmail.trim().toLowerCase() : "",
        customerPhone: typeof customerPhone === "string" ? customerPhone.replace(/\D/g, "") : "",
        amountPence,
        items: [],
        paymentStatus: "paid",
        emailStatus: "pending",
      };
    }

    let emailSent = false;
    let emailStatus: OrderRecord["emailStatus"] = paidOrder.emailStatus;

    if (paidOrder.customerEmail && paidOrder.emailStatus !== "sent") {
      try {
        const claimedOrder = await claimOrderEmail(merchantTransactionId);
        const orderToEmail = claimedOrder || paidOrder;
        emailSent = await sendOrderEmail(orderToEmail);
        emailStatus = emailSent ? "sent" : "failed";
        await setOrderEmailStatus(merchantTransactionId, emailStatus);
      } catch (emailErr) {
        console.warn("Order email send error:", emailErr);
        emailStatus = "failed";
        await setOrderEmailStatus(merchantTransactionId, "failed");
      }
    } else if (paidOrder.emailStatus === "sent") {
      emailSent = true;
    }

    const receipt = createOrderReceipt(merchantTransactionId, amountPence, {
      customerEmail: paidOrder.customerEmail,
      items: paidOrder.items,
    });

    const redirectUrl = `/order-success?receipt=${encodeURIComponent(receipt || "")}&status=success&orderId=${encodeURIComponent(merchantTransactionId)}&email=${encodeURIComponent(paidOrder.customerEmail)}&amount=${amountPence}`;

    const res = NextResponse.json({
      success: true,
      receipt,
      redirectUrl,
      order: {
        transactionId: merchantTransactionId,
        customerName: paidOrder.customerName,
        customerEmail: paidOrder.customerEmail,
        amountPence,
        emailStatus,
        emailSent,
      },
    });

    if (receipt) {
      res.cookies.set(`akiyo_paid_${merchantTransactionId}`, receipt, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600,
      });
    }

    return res;
  } catch (err) {
    console.error("Order payment confirm error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Payment confirmation failed." },
      { status: 500 }
    );
  }
}
