import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateAdmin } from "@/lib/admin/accounts";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminJwtSecret,
  signAdminToken,
} from "@/lib/admin/token";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!adminJwtSecret()) {
    return NextResponse.json(
      { error: "Set ADMIN_JWT_SECRET (at least 16 characters)." },
      { status: 503 }
    );
  }

  const body = (await req.json()) as { username?: string; password?: string };
  const result = await authenticateAdmin(body.username ?? "", body.password ?? "");
  if ("error" in result) {
    const status = result.error === "invalid" || result.error === "bad_input" ? 401 : 503;
    const error =
      result.error === "unavailable"
        ? result.message ?? "Admin accounts are unavailable."
        : "Wrong username or password.";
    return NextResponse.json({ error }, { status });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signAdminToken(result.account), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  return NextResponse.json({
    ok: true,
    username: result.account.username,
  });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
