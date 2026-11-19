import crypto from "node:crypto";
import { canonicalWebhookBody } from "./didit";

/** Verify X-Signature-V2 HMAC-SHA256 (constant-time). */
export function verifyDiditSignatureV2(
  parsedBody: unknown,
  signatureHeader: string,
  secret: string
): boolean {
  if (!secret || !signatureHeader) return false;
  const canonical = canonicalWebhookBody(parsedBody);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(canonical, "utf8")
    .digest("hex");
  if (signatureHeader.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signatureHeader, "utf8")
    );
  } catch {
    return false;
  }
}
