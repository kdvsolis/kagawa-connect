import { createHmac, timingSafeEqual } from "crypto";

const ISSUER = "kagawa-admin";
const TTL_SEC = 60 * 60 * 12;

export type AdminSession = {
  sub: string;
  username: string;
  role: "admin";
  iss: typeof ISSUER;
  iat: number;
  exp: number;
};

export function adminJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!secret || secret.length < 16) return null;
  return secret;
}

export function signAdminToken(account: { id: string; username: string }) {
  const secret = adminJwtSecret();
  if (!secret) throw new Error("ADMIN_JWT_SECRET missing");
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSession = {
    sub: account.id,
    username: account.username,
    role: "admin",
    iss: ISSUER,
    iat: now,
    exp: now + TTL_SEC,
  };
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function readAdminToken(token: string | undefined | null): AdminSession | null {
  const secret = adminJwtSecret();
  if (!secret || !token || token === "1") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  const got = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  let payload: AdminSession;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSession;
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    payload.iss !== ISSUER ||
    payload.role !== "admin" ||
    !payload.sub ||
    !payload.username ||
    payload.exp < now
  ) {
    return null;
  }
  return payload;
}

export const ADMIN_COOKIE = "kagawa_admin";
export const ADMIN_COOKIE_MAX_AGE = TTL_SEC;
