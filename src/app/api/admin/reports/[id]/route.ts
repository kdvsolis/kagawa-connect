import { NextResponse } from "next/server";
import { safeId } from "@/lib/admin/map";
import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const STATUSES = new Set(["open", "reviewing", "resolved", "dismissed"]);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const { id: rawId } = await ctx.params;
  const id = safeId(rawId);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await req.json()) as { status?: string };
  if (!body.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "bad status" }, { status: 400 });
  }
  const resolved =
    body.status === "resolved" || body.status === "dismissed"
      ? new Date().toISOString()
      : null;
  const { error } = await admin.client
    .from("reports")
    .update({ status: body.status, resolved_at: resolved })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: body.status });
}
