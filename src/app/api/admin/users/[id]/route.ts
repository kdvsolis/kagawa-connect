import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import {
  PROFILE_COLUMNS,
  PROFILE_COLUMNS_LEGACY,
  PROFILE_COLUMNS_NO_BAN,
  mapAdminProfile,
  missingBanColumn,
  missingDiditColumn,
  safeId,
  type AdminJobRow,
} from "@/lib/admin/map";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type JobRow = {
  id: string;
  service_id: string;
  status: string;
  address: string;
  barangay: string;
  city: string;
  created_at: string;
  customer_id: string;
  worker_id: string | null;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(_req);
  if (denied) return denied;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id: rawId } = await ctx.params;
  const id = safeId(rawId);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404 });
  let { data, error } = await admin.client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error && missingBanColumn(error.message)) {
    ({ data, error } = await admin.client
      .from("profiles")
      .select(PROFILE_COLUMNS_NO_BAN)
      .eq("id", id)
      .maybeSingle());
  }
  if (error && missingDiditColumn(error.message)) {
    ({ data, error } = await admin.client
      .from("profiles")
      .select(PROFILE_COLUMNS_LEGACY)
      .eq("id", id)
      .maybeSingle());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const profile = mapAdminProfile(
    data as unknown as Parameters<typeof mapAdminProfile>[0]
  );
  const { data: jobRows, error: jobError } = await admin.client
    .from("jobs")
    .select(
      "id, service_id, status, address, barangay, city, created_at, customer_id, worker_id"
    )
    .or(`customer_id.eq.${id},worker_id.eq.${id}`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  const jobs = (jobRows ?? []) as JobRow[];
  const otherIds = new Set<string>();
  for (const job of jobs) {
    if (job.customer_id !== id) otherIds.add(job.customer_id);
    if (job.worker_id && job.worker_id !== id) otherIds.add(job.worker_id);
  }
  const names = new Map<string, string>();
  names.set(id, profile.name);
  if (otherIds.size > 0) {
    const { data: people } = await admin.client
      .from("profiles")
      .select("id, full_name")
      .in("id", [...otherIds]);
    for (const person of people ?? []) {
      const row = person as { id: string; full_name: string };
      names.set(row.id, row.full_name);
    }
  }

  const mapped: AdminJobRow[] = jobs.map((job) => ({
    id: job.id,
    serviceId: job.service_id,
    status: job.status,
    address: job.address,
    barangay: job.barangay,
    city: job.city,
    createdAt: job.created_at,
    customerId: job.customer_id,
    workerId: job.worker_id,
    customerName: names.get(job.customer_id) ?? job.customer_id.slice(0, 8),
    workerName: job.worker_id
      ? names.get(job.worker_id) ?? job.worker_id.slice(0, 8)
      : null,
  }));

  return NextResponse.json({
    profile,
    booked: mapped.filter((job) => job.customerId === id),
    worked: mapped.filter((job) => job.workerId === id),
    usingServiceRole: admin.usingServiceRole,
  });
}

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
  const body = (await req.json()) as {
    paused?: boolean;
    banned?: boolean;
    reason?: string;
  };
  if (typeof body.paused !== "boolean" && typeof body.banned !== "boolean") {
    return NextResponse.json({ error: "paused or banned boolean required" }, { status: 400 });
  }
  const patch: Record<string, string | boolean | null> = {};
  if (typeof body.paused === "boolean") patch.paused = body.paused;
  if (typeof body.banned === "boolean") {
    patch.banned = body.banned;
    patch.banned_at = body.banned ? new Date().toISOString() : null;
    patch.ban_reason = body.banned ? (body.reason?.trim().slice(0, 280) || "admin ban") : null;
    if (body.banned) {
      patch.paused = true;
      patch.online = false;
    }
  }
  const { error } = await admin.client.from("profiles").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...patch });
}
