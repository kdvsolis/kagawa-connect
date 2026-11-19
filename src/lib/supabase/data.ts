import type { SafetyReport } from "@/lib/reports";
import type { ChatMessage, Job, ServiceId, UserProfile } from "@/lib/types";
import { coordsForArea } from "@/lib/geo";
import { getSupabase } from "./client";
import type { DbJob, DbMessage, DbProfile } from "./types";

export type ProfileWithSkills = UserProfile & { email?: string | null };

function mapProfile(row: DbProfile, skills: ServiceId[] = []): ProfileWithSkills {
  const fallback = coordsForArea(row.barangay, row.city);
  const hourly =
    row.hourly_rate != null && row.hourly_rate !== undefined
      ? Number(row.hourly_rate)
      : undefined;
  const day =
    row.day_rate != null && row.day_rate !== undefined
      ? Number(row.day_rate)
      : undefined;
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone ?? "",
    role: row.role,
    barangay: row.barangay,
    city: row.city,
    rating: Number(row.rating),
    jobsCompleted: row.jobs_completed,
    verified: row.verified,
    onboardingComplete:
      row.onboarding_complete ?? row.verified ?? undefined,
    paused: row.paused ?? undefined,
    banned: row.banned ?? undefined,
    banReason: row.ban_reason ?? null,
    bio: row.bio ?? undefined,
    online: row.online,
    launchJobsRemaining: row.launch_jobs_remaining,
    skills: row.role === "worker" ? skills : undefined,
    hourlyRate:
      hourly != null && !Number.isNaN(hourly) && hourly > 0
        ? hourly
        : undefined,
    dayRate:
      day != null && !Number.isNaN(day) && day > 0 ? day : undefined,
    priorityOnline: Boolean(row.priority_online),
    email: row.email,
    diditSessionId: row.didit_session_id ?? null,
    diditStatus: row.didit_status ?? null,
    diditVendorData: row.didit_vendor_data ?? null,
    diditCheckedAt: row.didit_checked_at ?? null,
    lat: row.lat ?? fallback?.lat,
    lng: row.lng ?? fallback?.lng,
  };
}

function mapJob(row: DbJob): Job {
  const fallback = coordsForArea(row.barangay, row.city);
  return {
    id: row.id,
    serviceId: row.service_id as ServiceId,
    customerId: row.customer_id,
    workerId: row.worker_id ?? undefined,
    status: row.status,
    address: row.address,
    barangay: row.barangay,
    city: row.city,
    notes: row.notes,
    estimatedHours: Number(row.estimated_hours),
    pricingMode: "hourly",
    hourlyRate: Number(row.hourly_rate),
    bookingFee: Number(row.booking_fee),
    bookingFeePaid:
      typeof row.booking_fee_paid === "boolean" ? row.booking_fee_paid : true,
    bookingFeePaidAt: row.booking_fee_paid_at ?? undefined,
    materialsEstimate: Number(row.materials_estimate),
    tip: Number(row.tip),
    bayadCode: row.bayad_code ?? undefined,
    customerRating: row.customer_rating ?? undefined,
    workerRating: row.worker_rating ?? undefined,
    lat: row.lat ?? fallback?.lat,
    lng: row.lng ?? fallback?.lng,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

function mapMessage(row: DbMessage): ChatMessage {
  return {
    id: row.id,
    jobId: row.job_id,
    senderId: row.sender_id,
    body: row.body,
    flagged: row.flagged,
    createdAt: row.created_at,
  };
}

export type LoadResult =
  | {
      ok: true;
      source: "supabase";
      customers: ProfileWithSkills[];
      workers: ProfileWithSkills[];
      jobs: Job[];
    }
  | { ok: false; source: "none"; error: string; missingTables?: boolean };

export async function loadMarketplace(): Promise<LoadResult> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, source: "none", error: "Supabase not configured" };
  }

  const [{ data: profiles, error: pErr }, { data: skills, error: sErr }, { data: jobs, error: jErr }] =
    await Promise.all([
      sb.from("profiles").select("*").order("full_name"),
      sb.from("worker_skills").select("*"),
      sb.from("jobs").select("*").order("created_at", { ascending: false }),
    ]);

  const err = pErr || sErr || jErr;
  if (err) {
    const missingTables =
      err.code === "PGRST205" ||
      /could not find the table/i.test(err.message);
    return {
      ok: false,
      source: "none",
      error: err.message,
      missingTables,
    };
  }

  const skillMap = new Map<string, ServiceId[]>();
  for (const row of skills ?? []) {
    const list = skillMap.get(row.worker_id) ?? [];
    list.push(row.service_id as ServiceId);
    skillMap.set(row.worker_id, list);
  }

  const mapped = (profiles ?? []).map((p) =>
    mapProfile(p as DbProfile, skillMap.get(p.id) ?? [])
  );

  return {
    ok: true,
    source: "supabase",
    customers: mapped.filter((p) => p.role === "customer"),
    workers: mapped.filter((p) => p.role === "worker"),
    jobs: (jobs ?? []).map((j) => mapJob(j as DbJob)),
  };
}

export async function loadMessagesForJobs(
  jobIds: string[]
): Promise<ChatMessage[]> {
  const sb = getSupabase();
  if (!sb || jobIds.length === 0) return [];
  const { data, error } = await sb
    .from("messages")
    .select("*")
    .in("job_id", jobIds)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map((m) => mapMessage(m as DbMessage));
}

export async function insertMessage(
  msg: ChatMessage
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { error } = await sb.from("messages").insert({
    id: msg.id,
    job_id: msg.jobId,
    sender_id: msg.senderId,
    body: msg.body,
    flagged: msg.flagged,
    created_at: msg.createdAt,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function insertJob(job: Job): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { error } = await sb.from("jobs").insert({
    id: job.id,
    service_id: job.serviceId,
    customer_id: job.customerId,
    worker_id: job.workerId ?? null,
    status: job.status,
    address: job.address,
    barangay: job.barangay,
    city: job.city,
    notes: job.notes,
    estimated_hours: job.estimatedHours,
    hourly_rate: job.hourlyRate,
    booking_fee: job.bookingFee,
    booking_fee_paid: job.bookingFeePaid,
    booking_fee_paid_at: job.bookingFeePaidAt ?? null,
    materials_estimate: job.materialsEstimate,
    tip: job.tip,
    bayad_code: job.bayadCode ?? null,
    lat: job.lat ?? null,
    lng: job.lng ?? null,
    created_at: job.createdAt,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function patchJob(
  id: string,
  patch: Partial<Job>
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const row: Partial<DbJob> = {};
  if (patch.status != null) row.status = patch.status;
  if (patch.workerId !== undefined) row.worker_id = patch.workerId ?? null;
  if (patch.bayadCode !== undefined) row.bayad_code = patch.bayadCode ?? null;
  if (patch.acceptedAt !== undefined) row.accepted_at = patch.acceptedAt ?? null;
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt ?? null;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt ?? null;
  if (patch.customerRating !== undefined)
    row.customer_rating = patch.customerRating ?? null;
  if (patch.workerRating !== undefined)
    row.worker_rating = patch.workerRating ?? null;
  if (patch.tip !== undefined) row.tip = patch.tip;
  if (patch.hourlyRate !== undefined) row.hourly_rate = patch.hourlyRate;
  if (patch.bookingFeePaid !== undefined)
    row.booking_fee_paid = patch.bookingFeePaid;
  if (patch.bookingFeePaidAt !== undefined)
    row.booking_fee_paid_at = patch.bookingFeePaidAt ?? null;
  if (patch.lat !== undefined) row.lat = patch.lat ?? null;
  if (patch.lng !== undefined) row.lng = patch.lng ?? null;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.barangay !== undefined) row.barangay = patch.barangay;
  if (patch.city !== undefined) row.city = patch.city;

  const { error } = await sb.from("jobs").update(row).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function patchWorkerOnline(
  id: string,
  online: boolean
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { error } = await sb.from("profiles").update({ online }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function patchProfileLocation(
  id: string,
  lat: number,
  lng: number
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { error } = await sb.from("profiles").update({ lat, lng }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function bumpCompletedCounts(
  customerId: string,
  workerId: string | undefined
) {
  const sb = getSupabase();
  if (!sb) return;

  const { data: customer } = await sb
    .from("profiles")
    .select("jobs_completed")
    .eq("id", customerId)
    .maybeSingle();
  if (customer) {
    await sb
      .from("profiles")
      .update({ jobs_completed: (customer.jobs_completed ?? 0) + 1 })
      .eq("id", customerId);
  }

  if (!workerId) return;
  const { data: worker } = await sb
    .from("profiles")
    .select("jobs_completed, launch_jobs_remaining")
    .eq("id", workerId)
    .maybeSingle();
  if (worker) {
    await sb
      .from("profiles")
      .update({
        jobs_completed: (worker.jobs_completed ?? 0) + 1,
        launch_jobs_remaining: Math.max(0, (worker.launch_jobs_remaining ?? 0) - 1),
      })
      .eq("id", workerId);
  }
}

/** Persist a finished onboarding profile, including the Didit reference (no ID image). */
function missingColumn(error: { message: string } | null, columnPrefix: string) {
  if (!error) return false;
  const message = error.message;
  return (
    new RegExp(columnPrefix, "i").test(message) &&
    /does not exist|could not find|schema cache/i.test(message)
  );
}

export async function insertOnboardedProfile(input: {
  profile: UserProfile;
  email?: string;
  diditSessionId?: string | null;
  diditStatus?: string | null;
  diditVendorData?: string | null;
  diditCheckedAt?: string | null;
  skills?: ServiceId[];
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const approved = input.diditStatus === "Approved";
  const row = {
    id: input.profile.id,
    full_name: input.profile.name,
    role: input.profile.role,
    phone: input.profile.phone || null,
    email: input.email?.trim() || null,
    barangay: input.profile.barangay,
    city: input.profile.city,
    verified: approved,
    onboarding_complete: true,
    verification_status: approved
      ? "approved"
      : input.diditStatus === "Declined"
        ? "rejected"
        : "pending",
    bio: input.profile.bio ?? null,
    online: false,
    hourly_rate: input.profile.hourlyRate ?? null,
    day_rate: input.profile.dayRate ?? null,
    didit_session_id: input.diditSessionId ?? null,
    didit_status: input.diditStatus ?? null,
    didit_vendor_data: input.diditVendorData ?? null,
    didit_checked_at: input.diditCheckedAt ?? null,
  };
  let { error } = await sb.from("profiles").upsert(row);
  if (missingColumn(error, "didit_")) {
    const {
      didit_session_id: _session,
      didit_status: _status,
      didit_vendor_data: _vendor,
      didit_checked_at: _checked,
      ...legacy
    } = row;
    ({ error } = await sb.from("profiles").upsert(legacy));
  }
  if (error) return { ok: false, error: error.message };
  if (input.profile.role === "worker" && input.skills && input.skills.length > 0) {
    await sb.from("worker_skills").upsert(
      input.skills.map((service_id) => ({
        worker_id: input.profile.id,
        service_id,
      }))
    );
  }
  return { ok: true };
}

export async function insertReport(
  report: SafetyReport
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { error } = await sb.from("reports").insert({
    id: report.id,
    reporter_id: report.reporterId,
    reported_id: report.reportedId ?? null,
    job_id: report.jobId ?? null,
    role: report.role,
    reason: report.reason,
    details: report.details,
    status: report.status,
    created_at: report.createdAt,
    evidence_name: report.evidenceName ?? null,
    evidence_data_url: report.evidenceDataUrl ?? null,
  });
  if (missingColumn(error, "evidence_")) {
    const retry = await sb.from("reports").insert({
      id: report.id,
      reporter_id: report.reporterId,
      reported_id: report.reportedId ?? null,
      job_id: report.jobId ?? null,
      role: report.role,
      reason: report.reason,
      details: report.details,
      status: report.status,
      created_at: report.createdAt,
    });
    return retry.error ? { ok: false, error: retry.error.message } : { ok: true };
  }
  return error ? { ok: false, error: error.message } : { ok: true };
}
