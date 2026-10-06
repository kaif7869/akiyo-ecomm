import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPhonePeConfig, createPhonePePayload } from "@/lib/phonepe";
import { products } from "@/data/products";
import {
  createPendingOrder,
  getOrderItemsFromCart,
  markOrderInitiationFailed,
} from "@/lib/order-store";

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

    const pricedCart = getOrderItemsFromCart(
      items as Array<{ id: unknown; quantity: unknown }>,
      products
    );
    if (!pricedCart) {
      return NextResponse.json({ success: false, error: "Your cart contains an unavailable item." }, { status: 400 });
    }

    let config;
    try {
      config = getPhonePeConfig();
    } catch {
      return NextResponse.json(
        { success: false, error: "PhonePe checkout is not configured. Please contact the store." },
        { status: 503 }
      );
    }

    const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const appUrl = configuredBaseUrl || new URL(request.url).origin;
    const merchantTransactionId = `AKY_${randomUUID().replace(/-/g, "")}`;
    const merchantUserId = `USER_${randomUUID().replace(/-/g, "")}`;

    await createPendingOrder({
      transactionId: merchantTransactionId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.replace(/\D/g, ""),
      amountPence: pricedCart.amountPence,
      items: pricedCart.items,
    });

    const { base64Payload, checksum, apiUrl } = createPhonePePayload(
      {
        merchantTransactionId,
        merchantUserId,
        amount: pricedCart.amountPence,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.replace(/\D/g, ""),
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
      const redirectUrl = data.data?.instrumentResponse?.redirectInfo?.url;
      if (phonePeResponse.ok && data.success && typeof redirectUrl === "string") {
        return NextResponse.json({
          success: true,
          mode: "phonepe_gateway",
          redirectUrl,
          merchantTransactionId,
          amount: pricedCart.amountPence,
        });
      }
      if (!phonePeResponse.ok || !data.success) {
        await markOrderInitiationFailed(merchantTransactionId);
      }
      return NextResponse.json(
        { success: false, error: "PhonePe could not start this payment. Please try again." },
        { status: 502 }
      );
    } catch {
      return NextResponse.json(
        { success: false, error: "PhonePe is temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }
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
