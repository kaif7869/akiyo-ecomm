import { NextResponse } from "next/server";
import crypto from "crypto";
import { getPhonePeConfig } from "@/lib/phonepe";
import { getOrder, confirmOrderPayment, setOrderEmailStatus } from "@/lib/order-store";
import { createOrderReceipt } from "@/lib/order-receipt";
import { sendOrderEmail } from "@/lib/order-email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const transactionId = url.searchParams.get("transactionId");

    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json({ paid: false, error: "Missing transactionId" }, { status: 400 });
    }

    const order = await getOrder(transactionId);

    if (order && order.paymentStatus === "paid") {
      const receipt = createOrderReceipt(transactionId, order.amountPence, {
        customerEmail: order.customerEmail,
        items: order.items,
      });

      return NextResponse.json({
        paid: true,
        status: "paid",
        receipt,
        order: {
          transactionId,
          customerEmail: order.customerEmail,
          amountPence: order.amountPence,
        },
      });
    }

    // If PhonePe credentials are configured, query PhonePe standard check-status API
    const config = getPhonePeConfig();
    if (config) {
      try {
        const path = `/pg/v1/status/${config.merchantId}/${transactionId}`;
        const hash = crypto
          .createHash("sha256")
          .update(path + config.saltKey)
          .digest("hex");
        const checksum = `${hash}###${config.saltIndex}`;

        const phonePeResp = await fetch(`${config.baseUrl}${path}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": checksum,
            "X-MERCHANT-ID": config.merchantId,
            accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        });

        const data = await phonePeResp.json().catch(() => null);

        if (data?.code === "PAYMENT_SUCCESS" && data?.success) {
          const amountPence = data.data?.amount || order?.amountPence || 2000;
          const paidOrder = await confirmOrderPayment(transactionId, amountPence) || order;

          if (paidOrder) {
            try {
              await sendOrderEmail(paidOrder);
              await setOrderEmailStatus(transactionId, "sent");
            } catch (err) {
              console.warn("Status route email error:", err);
            }

            const receipt = createOrderReceipt(transactionId, amountPence, {
              customerEmail: paidOrder.customerEmail,
              items: paidOrder.items,
            });

            return NextResponse.json({
              paid: true,
              status: "paid",
              receipt,
              order: {
                transactionId,
                customerEmail: paidOrder.customerEmail,
                amountPence,
              },
            });
          }
        }
      } catch (checkErr) {
        // phonepe check status network timeout or pending
      }
    }

    return NextResponse.json({
      paid: false,
      status: "pending",
    });
  } catch (err) {
    return NextResponse.json(
      { paid: false, error: err instanceof Error ? err.message : "Status check failed" },
      { status: 500 }
    );
  }
}
