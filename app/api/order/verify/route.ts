import { NextResponse } from "next/server";
import { verifyOrderReceipt } from "@/lib/order-receipt";

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

  return NextResponse.json(
    { verified: true, transactionId: verified.transactionId, amountPence: verified.amountPence },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
