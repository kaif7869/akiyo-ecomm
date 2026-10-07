import crypto from "crypto";

export interface PhonePeInitiateRequest {
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number; // in Paise (e.g. 2000 paise = ₹20)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{ id: string; title: string; price: number }>;
}

export interface PhonePeConfig {
  merchantId: string;
  saltKey: string;
  saltIndex: string;
  env: "UAT" | "PRODUCTION";
  baseUrl: string;
}

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
 * Creates SHA256 signature for PhonePe requests
 * Pattern: SHA256(base64Payload + endpoint + saltKey) + "###" + saltIndex
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
 * Validates callback signature from PhonePe
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
 * Builds PhonePe standard PAY_PAGE payload
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
 * Example: upi://pay?pa=akiyo@ybl&pn=Akiyo%20Wallpapers&am=20&cu=INR&tn=Art%20Pack
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
