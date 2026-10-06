import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getPhonePeConfig,
  createPhonePePayload,
  generateUPIIntentUri,
  isPhonePeConfigured,
} from "@/lib/phonepe";
import { products } from "@/data/products";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const {
      customerName,
      customerEmail,
      customerPhone,
      items,
    } = input;

    if (
      typeof customerName !== "string" || customerName.trim().length < 2 || customerName.length > 100 ||
      typeof customerEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 254 ||
      typeof customerPhone !== "string" || !/^\d{10}$/.test(customerPhone.replace(/\D/g, "")) ||
      !Array.isArray(items) || items.length < 1 || items.length > 20
    ) {
      return NextResponse.json({ success: false, error: "Please provide valid checkout details." }, { status: 400 });
    }

    let amount = 0;
    const validatedItems: Array<{ id: string; title: string; price: number }> = [];
    for (const item of items) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ success: false, error: "Invalid cart item." }, { status: 400 });
      }
      const cartItem = item as Record<string, unknown>;
      const product = products.find((entry) => entry.id === cartItem.id);
      const quantity = cartItem.quantity;
      if (!product || !Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 10) {
        return NextResponse.json({ success: false, error: "Invalid cart item." }, { status: 400 });
      }
      amount += product.pricePence * Number(quantity);
      validatedItems.push({ id: product.id, title: product.title, price: product.pricePence });
    }

    const vpa = process.env.NEXT_PUBLIC_UPI_VPA;
    const vpaName = process.env.NEXT_PUBLIC_UPI_NAME || "Akiyo Digital Store";
    const bankName = process.env.NEXT_PUBLIC_UPI_BANK_NAME || "Airtel Payment Bank";
    if (!vpa || !/^[\w.-]+@[\w.-]+$/.test(vpa)) {
      return NextResponse.json({ success: false, error: "UPI payment is not configured." }, { status: 503 });
    }

    const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const appUrl = configuredBaseUrl || new URL(request.url).origin;
    const merchantTransactionId = `AKY_${randomUUID().replace(/-/g, "")}`;

    if (isPhonePeConfigured()) {
      const config = getPhonePeConfig();
      const { base64Payload, checksum, apiUrl } = createPhonePePayload(
        {
          merchantTransactionId,
          merchantUserId: `USER_${randomUUID().replace(/-/g, "")}`,
          amount,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.replace(/\D/g, ""),
          items: validatedItems,
        },
        config,
        appUrl
      );

      try {
        const phonePeResponse = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": checksum,
            accept: "application/json",
          },
          body: JSON.stringify({ request: base64Payload }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await phonePeResponse.json();
        if (phonePeResponse.ok && data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
          return NextResponse.json({
            success: true,
            mode: "phonepe_gateway",
            redirectUrl: data.data.instrumentResponse.redirectInfo.url,
            merchantTransactionId,
            amount,
          });
        }
      } catch {
        console.warn("PhonePe gateway unavailable; offering direct UPI QR instead.");
      }
    }

    const upiUri = generateUPIIntentUri(
      vpa,
      vpaName,
      amount / 100,
      merchantTransactionId
    );

    return NextResponse.json({
      success: true,
      mode: "upi_intent",
      qrData: upiUri,
      upiVpa: vpa,
      bankName,
      merchantTransactionId,
      amount,
    });
  } catch (error) {
    console.error("Payment initiation failed.", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to start payment. Please try again.",
      },
      { status: 500 }
    );
  }
}
