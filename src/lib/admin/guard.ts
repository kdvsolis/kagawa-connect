import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, readAdminToken, type AdminSession } from "@/lib/admin/token";

export async function readAdminRequest(req?: Request): Promise<AdminSession | null> {
  const header = req?.headers.get("authorization") ?? "";
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const jar = await cookies();
  return readAdminToken(bearer || jar.get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin(req?: Request): Promise<NextResponse | null> {
  const session = await readAdminRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
