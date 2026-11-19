import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { ADMIN_PAGE_SIZE, missingDiditColumn, pageQuery } from "@/lib/admin/map";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ReportRow = {
  id: string;
  reporter_id: string;
  reported_id: string | null;
  job_id: string | null;
  role: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  evidence_name?: string | null;
  evidence_data_url?: string | null;
};

type PersonRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  didit_session_id: string | null;
  didit_status: string | null;
  didit_vendor_data: string | null;
};

function person(row: PersonRow | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone ?? "",
    role: row.role,
    diditSessionId: row.didit_session_id ?? null,
    diditStatus: row.didit_status ?? null,
    diditVendorData: row.didit_vendor_data ?? null,
  };
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { page, q } = pageQuery(new URL(req.url).searchParams);
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;
  const list = (columns: string) =>
    admin.client
      .from("reports")
      .select(columns, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
  let { data, error, count } = await list(
    "id, reporter_id, reported_id, job_id, role, reason, details, status, created_at, evidence_name, evidence_data_url"
  );
  if (error && /evidence_/i.test(error.message) && /does not exist/i.test(error.message)) {
    ({ data, error, count } = await list(
      "id, reporter_id, reported_id, job_id, role, reason, details, status, created_at"
    ));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reports = (data ?? []) as unknown as ReportRow[];
  const profileIds = new Set<string>();
  const jobIds = new Set<string>();
  for (const report of reports) {
    profileIds.add(report.reporter_id);
    if (report.reported_id) profileIds.add(report.reported_id);
    if (report.job_id) jobIds.add(report.job_id);
  }

  const people = new Map<string, PersonRow>();
  if (profileIds.size > 0) {
    const first = await admin.client
      .from("profiles")
      .select(
        "id, full_name, phone, role, didit_session_id, didit_status, didit_vendor_data"
      )
      .in("id", [...profileIds]);
    const rows =
      first.error && missingDiditColumn(first.error.message)
        ? (
            await admin.client
              .from("profiles")
              .select("id, full_name, phone, role")
              .in("id", [...profileIds])
          ).data
        : first.data;
    for (const row of (rows ?? []) as unknown as PersonRow[]) people.set(row.id, row);
  }

  const jobs = new Map<
    string,
    {
      id: string;
      address: string;
      barangay: string;
      city: string;
      status: string;
      serviceId: string;
      createdAt: string;
    }
  >();
  if (jobIds.size > 0) {
    const { data: rows } = await admin.client
      .from("jobs")
      .select("id, address, barangay, city, status, service_id, created_at")
      .in("id", [...jobIds]);
    for (const row of rows ?? []) {
      const job = row as {
        id: string;
        address: string;
        barangay: string;
        city: string;
        status: string;
        service_id: string;
        created_at: string;
      };
      jobs.set(job.id, {
        id: job.id,
        address: job.address,
        barangay: job.barangay,
        city: job.city,
        status: job.status,
        serviceId: job.service_id,
        createdAt: job.created_at,
      });
    }
  }

  const qLower = q.toLowerCase();
  const mapped = reports
    .map((report) => ({
      id: report.id,
      reason: report.reason,
      details: report.details,
      evidenceName: report.evidence_name ?? null,
      evidenceDataUrl: report.evidence_data_url ?? null,
      status: report.status,
      role: report.role,
      createdAt: report.created_at,
      reporter: person(people.get(report.reporter_id)),
      reported: report.reported_id ? person(people.get(report.reported_id)) : null,
      job: report.job_id ? jobs.get(report.job_id) ?? null : null,
    }))
    .filter((report) => {
      if (!qLower) return true;
      const hay = [
        report.reason,
        report.details,
        report.reporter?.name,
        report.reported?.name,
        report.reporter?.phone,
        report.reported?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qLower);
    });

  return NextResponse.json({
    reports: mapped,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    total: q ? mapped.length : count ?? mapped.length,
    usingServiceRole: admin.usingServiceRole,
  });
}
