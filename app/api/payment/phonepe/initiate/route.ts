import { NextResponse } from "next/server";
import {
  getPhonePeConfig,
  createPhonePePayload,
  generateUPIIntentUri,
} from "@/lib/phonepe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName = "Valued Customer",
      customerEmail = "customer@example.com",
      customerPhone = "9999999999",
      amount = 2000, // in paise (₹20)
      items = [],
    } = body;

    const config = getPhonePeConfig();
    const appUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";

    const merchantTransactionId = `AKY_${Date.now()}_${Math.floor(
      Math.random() * 1000
    )}`;
    const merchantUserId = `USER_${Date.now()}`;

    const { base64Payload, checksum, apiUrl } = createPhonePePayload(
      {
        merchantTransactionId,
        merchantUserId,
        amount,
        customerName,
        customerEmail,
        customerPhone,
        items,
      },
      config,
      appUrl
    );

    // Call PhonePe PG Standard Checkout endpoint
    try {
      const phonePeResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          accept: "application/json",
        },
        body: JSON.stringify({
          request: base64Payload,
        }),
      });

      const data = await phonePeResponse.json();

      if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
        return NextResponse.json({
          success: true,
          mode: "phonepe_gateway",
          redirectUrl: data.data.instrumentResponse.redirectInfo.url,
          merchantTransactionId,
          amount,
        });
      }
    } catch (networkError) {
      console.warn("PhonePe API direct call note:", networkError);
    }

    // Direct UPI intent & QR code fallback
    const vpa = process.env.NEXT_PUBLIC_UPI_VPA || "akiyoart@ybl";
    const vpaName = process.env.NEXT_PUBLIC_UPI_NAME || "Akiyo Art Store";
    const upiUri = generateUPIIntentUri(
      vpa,
      vpaName,
      amount / 100,
      merchantTransactionId
    );

    return NextResponse.json({
      success: true,
      mode: "upi_intent",
      upiUri,
      qrData: upiUri,
      merchantTransactionId,
      amount,
      redirectUrl: `${appUrl}/order-success?txnId=${merchantTransactionId}&amount=${
        amount / 100
      }&email=${encodeURIComponent(customerEmail)}`,
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate payment",
      },
      { status: 500 }
    );
  }
}
