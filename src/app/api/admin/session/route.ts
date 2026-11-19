import { NextResponse } from "next/server";
import { readAdminRequest } from "@/lib/admin/guard";
import { adminJwtSecret } from "@/lib/admin/token";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await readAdminRequest(req);
  const configured = Boolean(
    adminJwtSecret() &&
      process.env.ADMIN_USERNAME?.trim() &&
      (process.env.ADMIN_PASSWORD ?? "").length >= 8
  );
  return NextResponse.json({
    ok: Boolean(session),
    configured,
    username: session?.username ?? null,
  });
}
