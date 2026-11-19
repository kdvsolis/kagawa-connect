export const ADMIN_PAGE_SIZE = 20;

export type AdminProfile = {
  id: string;
  name: string;
  phone: string;
  role: "customer" | "worker";
  barangay: string;
  city: string;
  rating: number;
  jobsCompleted: number;
  verified: boolean;
  paused: boolean;
  banned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  diditSessionId: string | null;
  diditStatus: string | null;
  diditVendorData: string | null;
  diditCheckedAt: string | null;
  createdAt: string;
  jobCount?: number;
};

export type AdminJobRow = {
  id: string;
  serviceId: string;
  status: string;
  address: string;
  barangay: string;
  city: string;
  createdAt: string;
  customerId: string;
  workerId: string | null;
  customerName: string;
  workerName: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: "customer" | "worker";
  barangay: string;
  city: string;
  rating: number | string;
  jobs_completed: number;
  verified: boolean;
  paused: boolean | null;
  banned?: boolean | null;
  banned_at?: string | null;
  ban_reason?: string | null;
  didit_session_id?: string | null;
  didit_status?: string | null;
  didit_vendor_data?: string | null;
  didit_checked_at?: string | null;
  created_at: string;
};

export const PROFILE_COLUMNS =
  "id, full_name, phone, role, barangay, city, rating, jobs_completed, verified, paused, didit_session_id, didit_status, didit_vendor_data, didit_checked_at, banned, banned_at, ban_reason, created_at";

/** Didit columns present, ban columns not migrated yet. */
export const PROFILE_COLUMNS_NO_BAN =
  "id, full_name, phone, role, barangay, city, rating, jobs_completed, verified, paused, didit_session_id, didit_status, didit_vendor_data, didit_checked_at, created_at";

/** Used only when the Didit migration has not been applied yet. */
export const PROFILE_COLUMNS_LEGACY =
  "id, full_name, phone, role, barangay, city, rating, jobs_completed, verified, paused, created_at";

export function missingDiditColumn(message: string) {
  return /didit_/i.test(message) && /does not exist/i.test(message);
}

export function missingBanColumn(message: string) {
  return /ban/i.test(message) && /does not exist/i.test(message);
}

export function mapAdminProfile(row: ProfileRow, jobCount?: number): AdminProfile {
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
    paused: Boolean(row.paused),
    banned: Boolean(row.banned),
    bannedAt: row.banned_at ?? null,
    banReason: row.ban_reason ?? null,
    diditSessionId: row.didit_session_id ?? null,
    diditStatus: row.didit_status ?? null,
    diditVendorData: row.didit_vendor_data ?? null,
    diditCheckedAt: row.didit_checked_at ?? null,
    createdAt: row.created_at,
    jobCount,
  };
}

export function safeId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

export function pageQuery(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const q = (searchParams.get("q") || "")
    .replace(/[%_,.()"'\\]/g, " ")
    .trim()
    .slice(0, 80);
  return { page, q };
}
