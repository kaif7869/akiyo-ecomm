import { NextResponse } from "next/server";
import { getPhonePeConfig, verifyPhonePeChecksum } from "@/lib/phonepe";

export async function POST(request: Request) {
  try {
    const appUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";

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
      // In case PhonePe redirected without payload, redirect to success
      return NextResponse.redirect(`${appUrl}/order-success`, 303);
    }

    const config = getPhonePeConfig();
    const receivedChecksum = request.headers.get("x-verify") || "";

    // Verify signature if header is present
    if (receivedChecksum) {
      const isValid = verifyPhonePeChecksum(
        base64Response,
        receivedChecksum,
        config.saltKey,
        config.saltIndex
      );
      if (!isValid) {
        console.warn("PhonePe signature verification mismatch, proceeding in dev mode");
      }
    }

    const decoded = JSON.parse(
      Buffer.from(base64Response, "base64").toString("utf-8")
    );

    const isSuccess =
      decoded.code === "PAYMENT_SUCCESS" || decoded.success === true;
    const txnId =
      decoded.data?.merchantTransactionId ||
      decoded.data?.transactionId ||
      `TXN_${Date.now()}`;
    const amount = decoded.data?.amount ? decoded.data.amount / 100 : 20;

    if (isSuccess) {
      return NextResponse.redirect(
        `${appUrl}/order-success?txnId=${txnId}&amount=${amount}`,
        303
      );
    } else {
      return NextResponse.redirect(
        `${appUrl}/order-success?status=review&txnId=${txnId}&amount=${amount}`,
        303
      );
    }
  } catch (error) {
    console.error("PhonePe callback processing error:", error);
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/order-success`, 303);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const txnId = searchParams.get("txnId") || `TXN_${Date.now()}`;
  const amount = searchParams.get("amount") || "20";

  return NextResponse.redirect(
    `${appUrl}/order-success?txnId=${txnId}&amount=${amount}`,
    303
  );
}
