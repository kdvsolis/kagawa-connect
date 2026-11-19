import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import {
  ADMIN_PAGE_SIZE,
  PROFILE_COLUMNS,
  PROFILE_COLUMNS_LEGACY,
  PROFILE_COLUMNS_NO_BAN,
  mapAdminProfile,
  missingBanColumn,
  missingDiditColumn,
  pageQuery,
  type AdminProfile,
} from "@/lib/admin/map";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") === "worker" ? "worker" : "customer";
  const { page, q } = pageQuery(searchParams);
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;

  const list = (columns: string) => {
    let query = admin.client
      .from("profiles")
      .select(columns, { count: "exact" })
      .eq("role", role)
      .order("created_at", { ascending: false });
    if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
    return query.range(from, to);
  };

  let { data, error, count } = await list(PROFILE_COLUMNS);
  if (error && missingBanColumn(error.message)) {
    ({ data, error, count } = await list(PROFILE_COLUMNS_NO_BAN));
  }
  if (error && missingDiditColumn(error.message)) {
    ({ data, error, count } = await list(PROFILE_COLUMNS_LEGACY));
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Parameters<typeof mapAdminProfile>[0][];
  const ids = rows.map((row) => row.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const filter = `customer_id.in.(${ids.join(",")}),worker_id.in.(${ids.join(",")})`;
    const { data: jobs } = await admin.client
      .from("jobs")
      .select("customer_id, worker_id")
      .or(filter);
    for (const job of jobs ?? []) {
      const row = job as { customer_id: string; worker_id: string | null };
      if (role === "customer") {
        counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1);
      } else if (row.worker_id) {
        counts.set(row.worker_id, (counts.get(row.worker_id) ?? 0) + 1);
      }
    }
  }

  const users: AdminProfile[] = rows.map((row) =>
    mapAdminProfile(row, counts.get(row.id) ?? 0)
  );

  return NextResponse.json({
    users,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    total: count ?? users.length,
    usingServiceRole: admin.usingServiceRole,
  });
}
