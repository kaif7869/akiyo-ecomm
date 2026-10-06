import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const RECEIPT_LIFETIME_MS = 24 * 60 * 60 * 1000;

type ReceiptPayload = {
  transactionId: string;
  amountPence: number;
  expiresAt: number;
};

function getReceiptSecret(): string | null {
  const secret = process.env.ORDER_RECEIPT_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function createOrderReceipt(transactionId: string, amountPence: number): string | null {
  const secret = getReceiptSecret();
  if (!secret) return null;

  const payload: ReceiptPayload = {
    transactionId,
    amountPence,
    expiresAt: Date.now() + RECEIPT_LIFETIME_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyOrderReceipt(receipt: string | undefined): ReceiptPayload | null {
  const secret = getReceiptSecret();
  if (!secret || !receipt || receipt.length > 2048) return null;

  const [encodedPayload, receivedSignature, extra] = receipt.split(".");
  if (!encodedPayload || !receivedSignature || extra !== undefined) return null;

  const expectedSignature = createHmac("sha256", secret).update(encodedPayload).digest();
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(receivedSignature, "base64url");
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ReceiptPayload;
    if (
      typeof payload.transactionId !== "string" ||
      !Number.isSafeInteger(payload.amountPence) ||
      payload.amountPence <= 0 ||
      !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
