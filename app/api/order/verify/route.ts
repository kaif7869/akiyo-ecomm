import { NextResponse } from "next/server";
import { verifyOrderReceipt } from "@/lib/order-receipt";
import { getOrder } from "@/lib/order-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const receipt = new URL(request.url).searchParams.get("receipt") || undefined;
  const verified = verifyOrderReceipt(receipt);
  if (!verified) {
    return NextResponse.json(
      { verified: false },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const order = await getOrder(verified.transactionId);
  if (!order || order.paymentStatus !== "paid" || order.amountPence !== verified.amountPence) {
    return NextResponse.json(
      { verified: false },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  return NextResponse.json(
    {
      verified: true,
      transactionId: order.transactionId,
      amountPence: order.amountPence,
      customerEmail: order.customerEmail,
      items: order.items,
      emailStatus: order.emailStatus,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
