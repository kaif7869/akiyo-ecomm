import "server-only";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "akiyo_admin_session";
const SESSION_LIFETIME_SECONDS = 12 * 60 * 60;

function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 16 && getSessionSecret());
}

export function verifyAdminPassword(password: string): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!isAdminConfigured() || !expectedPassword || password.length > 256) return false;

  const submittedDigest = createHash("sha256").update(password).digest();
  const expectedDigest = createHash("sha256").update(expectedPassword).digest();
  return timingSafeEqual(submittedDigest, expectedDigest);
}

export async function createAdminSession(): Promise<void> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Admin access is not configured.");

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
  const signature = createHmac("sha256", secret).update(`admin:${expiresAt}`).digest("base64url");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${expiresAt}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS,
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = getSessionSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const [expiryText, signature, extra] = token?.split(".") ?? [];
  const expiresAt = Number(expiryText);
  if (!expiryText || !signature || extra !== undefined || !Number.isSafeInteger(expiresAt)) return false;
  if (expiresAt <= Math.floor(Date.now() / 1000)) return false;

  const expected = createHmac("sha256", secret).update(`admin:${expiresAt}`).digest();
  const actual = Buffer.from(signature, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
