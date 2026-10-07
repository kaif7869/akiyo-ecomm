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
  const items = order?.items || verified.items || [];
  const customerEmail = order?.customerEmail || verified.customerEmail || "";
  const emailStatus = order?.emailStatus || "sent";

  return NextResponse.json(
    {
      verified: true,
      transactionId: verified.transactionId,
      amountPence: verified.amountPence,
      customerEmail,
      items,
      emailStatus,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
