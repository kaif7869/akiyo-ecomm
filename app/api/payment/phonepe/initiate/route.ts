import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getPhonePeConfig,
  createPhonePePayload,
  generateUPIIntentUri,
} from "@/lib/phonepe";
import { products } from "@/data/products";
import {
  createPendingOrder,
  getOrderItemsFromCart,
  markOrderInitiationFailed,
} from "@/lib/order-store";
import { createOrderReceipt } from "@/lib/order-receipt";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
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

    const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const appUrl = configuredBaseUrl || new URL(request.url).origin;
    const merchantTransactionId = `AKY_${randomUUID().replace(/-/g, "")}`;
    const merchantUserId = `USER_${randomUUID().replace(/-/g, "")}`;

    const cleanName = customerName.trim();
    const cleanEmail = customerEmail.trim().toLowerCase();
    const cleanPhone = customerPhone.replace(/\D/g, "");

    // Store in order store (resilient: Neon Postgres if configured, memory cache fallback)
    await createPendingOrder({
      transactionId: merchantTransactionId,
      customerName: cleanName,
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      amountPence: pricedCart.amountPence,
      items: pricedCart.items,
    });

    const vpa = process.env.NEXT_PUBLIC_UPI_VPA || "9611556001@ybl";
    const vpaName = process.env.NEXT_PUBLIC_UPI_NAME || "Akiyo Digital Store";
    const bankName = process.env.NEXT_PUBLIC_UPI_BANK_NAME || "Airtel Payment Bank";
    const upiUri = generateUPIIntentUri(
      vpa,
      vpaName,
      pricedCart.amountPence / 100,
      merchantTransactionId
    );

    // Create signed token receipt for stateless cross-instance recovery
    const orderReceiptToken = createOrderReceipt(merchantTransactionId, pricedCart.amountPence, {
      customerEmail: cleanEmail,
      items: pricedCart.items,
    });

    const config = getPhonePeConfig();

    let responseJson: Record<string, unknown>;

    if (config) {
      try {
        const { base64Payload, checksum, apiUrl } = createPhonePePayload(
          {
            merchantTransactionId,
            merchantUserId,
            amount: pricedCart.amountPence,
            customerName: cleanName,
            customerEmail: cleanEmail,
            customerPhone: cleanPhone,
          },
          config,
          appUrl
        );

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

        const data = await phonePeResponse.json().catch(() => null);
        const redirectUrl = data?.data?.instrumentResponse?.redirectInfo?.url;

        if (phonePeResponse.ok && data?.success && typeof redirectUrl === "string") {
          responseJson = {
            success: true,
            mode: "phonepe_gateway",
            redirectUrl,
            merchantTransactionId,
            amount: pricedCart.amountPence,
          };
        } else {
          console.warn("PhonePe gateway did not provide a redirect URL:", data);
          await markOrderInitiationFailed(merchantTransactionId);
          // Fall back gracefully to direct PhonePe UPI QR / Intent
          responseJson = {
            success: true,
            mode: "upi_intent",
            qrData: upiUri,
            upiVpa: vpa,
            bankName,
            merchantTransactionId,
            amount: pricedCart.amountPence,
            phonepeNotice: data?.message || "Using instant PhonePe UPI checkout.",
          };
        }
      } catch (fetchErr) {
        console.warn("PhonePe gateway network request failed, falling back to UPI QR:", fetchErr);
        await markOrderInitiationFailed(merchantTransactionId);
        responseJson = {
          success: true,
          mode: "upi_intent",
          qrData: upiUri,
          upiVpa: vpa,
          bankName,
          merchantTransactionId,
          amount: pricedCart.amountPence,
          phonepeNotice: "Using instant PhonePe UPI checkout.",
        };
      }
    } else {
      // Gateway credentials not configured in environment, offer direct PhonePe UPI
      responseJson = {
        success: true,
        mode: "upi_intent",
        qrData: upiUri,
        upiVpa: vpa,
        bankName,
        merchantTransactionId,
        amount: pricedCart.amountPence,
      };
    }

    const res = NextResponse.json(responseJson);

    // Save pending order receipt token in cookie for serverless lambda callback verification
    if (orderReceiptToken) {
      res.cookies.set(`akiyo_pending_${merchantTransactionId}`, orderReceiptToken, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600, // 1 hour
      });
    }

    return res;
  } catch (error) {
    console.error("Payment initiation failed.", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to start payment. Please try again.",
      },
      { status: 500 }
    );
  }
}
