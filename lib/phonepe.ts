import crypto from "crypto";
import axios from "axios";

export interface PhonePeInitiateRequest {
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number; // in Paise (e.g. 2000 paise = ₹20)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{ id: string; title: string; price: number }>;
}

export interface PhonePeV2Config {
  clientId: string;
  clientSecret: string;
  clientVersion: number;
  env: "UAT" | "PRODUCTION";
  oauthUrl: string;
  payUrl: string;
  orderStatusUrl: (merchantOrderId: string) => string;
}

export interface PhonePeConfig {
  merchantId: string;
  saltKey: string;
  saltIndex: string;
  env: "UAT" | "PRODUCTION";
  baseUrl: string;
}

// Global in-memory cache for PhonePe V2 OAuth Access Token
let cachedV2Token: { token: string; expiresAt: number } | null = null;

/**
 * Checks if PhonePe V2 OAuth credentials are configured
 */
export function isPhonePeV2Configured(): boolean {
  const clientId = process.env.PHONEPE_CLIENT_ID?.trim() || process.env.PHONEPE_MERCHANT_ID?.trim();
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET?.trim() || process.env.PHONEPE_SALT_KEY?.trim();
  return Boolean(clientId && clientSecret);
}

/**
 * Resolves PhonePe V2 Configuration
 */
export function getPhonePeV2Config(): PhonePeV2Config | null {
  const clientId = process.env.PHONEPE_CLIENT_ID?.trim() || process.env.PHONEPE_MERCHANT_ID?.trim();
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET?.trim() || process.env.PHONEPE_SALT_KEY?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  const rawEnv = (process.env.PHONEPE_ENV || "UAT").toUpperCase().trim();
  const env: "UAT" | "PRODUCTION" = rawEnv === "PRODUCTION" ? "PRODUCTION" : "UAT";
  const clientVersion = Number(process.env.PHONEPE_CLIENT_VERSION || 1) || 1;

  if (env === "PRODUCTION") {
    return {
      clientId,
      clientSecret,
      clientVersion,
      env: "PRODUCTION",
      oauthUrl: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      payUrl: "https://api.phonepe.com/apis/pg/checkout/v2/pay",
      orderStatusUrl: (orderId: string) =>
        `https://api.phonepe.com/apis/pg/checkout/v2/order/${orderId}/status`,
    };
  }

  return {
    clientId,
    clientSecret,
    clientVersion,
    env: "UAT",
    oauthUrl: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    payUrl: "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay",
    orderStatusUrl: (orderId: string) =>
      `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${orderId}/status`,
  };
}

/**
 * Requests or retrieves a cached OAuth token from PhonePe V2
 */
export async function getPhonePeV2Token(
  config?: PhonePeV2Config | null
): Promise<string | null> {
  const cfg = config || getPhonePeV2Config();
  if (!cfg) return null;

  // Use cached token if valid for at least 60 more seconds
  const now = Date.now();
  if (cachedV2Token && cachedV2Token.expiresAt > now + 60000) {
    return cachedV2Token.token;
  }

  try {
    const requestHeaders = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const requestBodyJson = {
      client_id: cfg.clientId,
      client_version: cfg.clientVersion,
      client_secret: cfg.clientSecret,
      grant_type: "client_credentials",
    };

    const requestBody = new URLSearchParams(
      requestBodyJson as unknown as Record<string, string>
    ).toString();

    const response = await axios.post(cfg.oauthUrl, requestBody, {
      headers: requestHeaders,
      timeout: 10000,
    });

    const data = response.data;
    const token =
      data?.access_token ||
      data?.data?.access_token ||
      data?.encrypted_access_token;

    if (token && typeof token === "string") {
      const expiresIn = Number(data?.expires_in || 3600);
      cachedV2Token = {
        token,
        expiresAt: now + expiresIn * 1000,
      };
      return token;
    }

    console.warn("PhonePe V2 token endpoint returned unexpected format:", data);
    return null;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.warn("PhonePe V2 OAuth error:", error.response?.data || error.message);
    } else {
      console.warn("PhonePe V2 OAuth request error:", error);
    }
    return null;
  }
}

/**
 * Initiates payment via PhonePe V2 Standard Checkout (/checkout/v2/pay)
 */
export async function createPhonePeV2Payment(
  params: PhonePeInitiateRequest,
  appUrl: string,
  config?: PhonePeV2Config | null
): Promise<{
  success: boolean;
  redirectUrl?: string;
  merchantOrderId: string;
  amount: number;
  error?: string;
}> {
  const cfg = config || getPhonePeV2Config();
  if (!cfg) {
    return {
      success: false,
      merchantOrderId: params.merchantTransactionId,
      amount: params.amount,
      error: "PhonePe V2 configuration missing.",
    };
  }

  const token = await getPhonePeV2Token(cfg);
  if (!token) {
    return {
      success: false,
      merchantOrderId: params.merchantTransactionId,
      amount: params.amount,
      error: "Unable to authenticate with PhonePe OAuth.",
    };
  }

  const redirectUrl = `${appUrl}/api/payment/phonepe/callback?merchantOrderId=${params.merchantTransactionId}`;

  const requestBody = {
    merchantOrderId: params.merchantTransactionId,
    amount: params.amount,
    expireAfter: 1200,
    metaInfo: {
      udf1: params.customerName || "Customer",
      udf2: params.customerEmail || "",
      udf3: params.customerPhone || "",
      udf4: "Akiyo Digital Art Order",
      udf5: "24h Guaranteed Delivery",
    },
    paymentFlow: {
      type: "PG_CHECKOUT",
      message: `Payment for Akiyo Digital Art Order ${params.merchantTransactionId}`,
      merchantUrls: {
        redirectUrl,
      },
      paymentModeConfig: {
        version: "V2",
        enabledPaymentModes: [
          {
            type: "UPI",
            flows: ["INTENT", "QR"],
            apps: ["phonepe", "gpay", "paytm"],
          },
          {
            type: "CARD",
            types: ["CREDIT_CARD", "DEBIT_CARD"],
            networks: ["VISA", "MASTER_CARD", "RUPAY"],
          },
          {
            type: "NET_BANKING",
          },
        ],
      },
    },
  };

  try {
    const response = await axios.post(cfg.payUrl, requestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      timeout: 12000,
    });

    const data = response.data;
    const checkoutUrl =
      data?.data?.redirectUrl ||
      data?.redirectUrl ||
      data?.data?.instrumentResponse?.redirectInfo?.url;

    if (checkoutUrl && typeof checkoutUrl === "string") {
      return {
        success: true,
        redirectUrl: checkoutUrl,
        merchantOrderId: params.merchantTransactionId,
        amount: params.amount,
      };
    }

    console.warn("PhonePe V2 pay API succeeded but no redirectUrl found:", data);
    return {
      success: false,
      merchantOrderId: params.merchantTransactionId,
      amount: params.amount,
      error: data?.message || "No redirect URL provided by PhonePe.",
    };
  } catch (error: unknown) {
    let errorMsg = "PhonePe V2 payment initiation failed.";
    if (axios.isAxiosError(error)) {
      console.warn("PhonePe V2 pay error response:", error.response?.data || error.message);
      errorMsg = error.response?.data?.message || error.message;
    } else if (error instanceof Error) {
      errorMsg = error.message;
    }
    return {
      success: false,
      merchantOrderId: params.merchantTransactionId,
      amount: params.amount,
      error: errorMsg,
    };
  }
}

/**
 * Checks order payment status via PhonePe V2 Order Status API
 */
export async function checkPhonePeV2OrderStatus(
  merchantOrderId: string,
  config?: PhonePeV2Config | null
): Promise<{
  paid: boolean;
  state?: string;
  amount?: number;
  error?: string;
}> {
  const cfg = config || getPhonePeV2Config();
  if (!cfg) {
    return { paid: false, error: "V2 configuration missing." };
  }

  const token = await getPhonePeV2Token(cfg);
  if (!token) {
    return { paid: false, error: "Authentication failed." };
  }

  try {
    const url = cfg.orderStatusUrl(merchantOrderId);
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      params: { details: false },
      timeout: 6000,
    });

    const data = response.data;
    const state =
      data?.data?.state ||
      data?.state ||
      data?.data?.paymentState ||
      data?.code;
    const amount = data?.data?.amount || data?.amount;

    const isPaid =
      state === "COMPLETED" ||
      state === "PAYMENT_SUCCESS" ||
      data?.code === "PAYMENT_SUCCESS";

    return {
      paid: isPaid,
      state: String(state || "UNKNOWN"),
      amount: typeof amount === "number" ? amount : undefined,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.warn("PhonePe V2 status error:", error.response?.data || error.message);
    }
    return { paid: false, error: "Status check network error." };
  }
}

// ============================================================================
// PhonePe V1 Fallback & Checksum Utilities (for backward compatibility)
// ============================================================================

export function isPhonePeConfigured(): boolean {
  return [
    process.env.PHONEPE_MERCHANT_ID,
    process.env.PHONEPE_SALT_KEY,
    process.env.PHONEPE_SALT_INDEX,
  ].every((value) => Boolean(value?.trim()));
}

export function getPhonePeConfig(): PhonePeConfig | null {
  if (!isPhonePeConfigured()) {
    return null;
  }

  const rawEnv = (process.env.PHONEPE_ENV || "UAT").toUpperCase().trim();
  const env: "UAT" | "PRODUCTION" = rawEnv === "PRODUCTION" ? "PRODUCTION" : "UAT";

  return {
    merchantId: process.env.PHONEPE_MERCHANT_ID!.trim(),
    saltKey: process.env.PHONEPE_SALT_KEY!.trim(),
    saltIndex: process.env.PHONEPE_SALT_INDEX!.trim(),
    env,
    baseUrl:
      env === "PRODUCTION"
        ? "https://api.phonepe.com/apis/hermes"
        : "https://api-preprod.phonepe.com/apis/pg-sandbox",
  };
}

/**
 * Creates SHA256 signature for PhonePe V1 requests
 */
export function generatePhonePeChecksum(
  base64Payload: string,
  endpoint: string,
  saltKey: string,
  saltIndex: string
): string {
  const dataToHash = base64Payload + endpoint + saltKey;
  const hash = crypto.createHash("sha256").update(dataToHash).digest("hex");
  return `${hash}###${saltIndex}`;
}

/**
 * Validates callback signature from PhonePe V1
 */
export function verifyPhonePeChecksum(
  base64Response: string,
  receivedChecksum: string,
  saltKey: string,
  saltIndex: string
): boolean {
  const calculatedHash = crypto
    .createHash("sha256")
    .update(base64Response + saltKey)
    .digest("hex");
  const expectedChecksum = `${calculatedHash}###${saltIndex}`;
  const expected = Buffer.from(expectedChecksum);
  const received = Buffer.from(receivedChecksum);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

/**
 * Builds PhonePe V1 PAY_PAGE payload
 */
export function createPhonePePayload(
  params: PhonePeInitiateRequest,
  config: PhonePeConfig,
  appUrl: string
) {
  const redirectUrl = `${appUrl}/api/payment/phonepe/callback`;

  const payload = {
    merchantId: config.merchantId,
    merchantTransactionId: params.merchantTransactionId,
    merchantUserId: params.merchantUserId,
    amount: params.amount,
    redirectUrl,
    redirectMode: "POST",
    callbackUrl: redirectUrl,
    mobileNumber: params.customerPhone?.replace(/\D/g, "") || "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const buffer = Buffer.from(JSON.stringify(payload));
  const base64Payload = buffer.toString("base64");
  const checksum = generatePhonePeChecksum(
    base64Payload,
    "/pg/v1/pay",
    config.saltKey,
    config.saltIndex
  );

  return {
    payload,
    base64Payload,
    checksum,
    apiUrl: `${config.baseUrl}/pg/v1/pay`,
  };
}

/**
 * Generates instant Indian UPI Intent / QR URL
 */
export function generateUPIIntentUri(
  vpa: string,
  name: string,
  amountInRupees: number,
  orderId: string
): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: amountInRupees.toFixed(2),
    cu: "INR",
    tn: `Akiyo Order ${orderId}`,
  });
  return `upi://pay?${params.toString()}`;
}

