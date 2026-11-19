import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for admin routes.
 * Prefers the service-role key. Falls back to the publishable key only so a
 * demo project without that key still loads after the admin cookie check.
 * Never import this from a client component.
 */
export function getSupabaseAdmin(): {
  client: SupabaseClient;
  usingServiceRole: boolean;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const key = service || publishable;
  if (!url || !key) return null;
  return {
    usingServiceRole: Boolean(service),
    client: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

/** Update Didit status by vendor key. Does not store the decision payload or ID images. */
export async function patchProfileDiditByVendor(
  vendorData: string,
  status: string,
  sessionId?: string
) {
  const admin = getSupabaseAdmin();
  if (!admin || !vendorData) return;
  const approved = status === "Approved";
  const patch: Record<string, string | boolean | null> = {
    didit_status: status,
    didit_checked_at: new Date().toISOString(),
    verified: approved,
    verification_status: approved
      ? "approved"
      : status === "Declined"
        ? "rejected"
        : "pending",
  };
  if (sessionId) patch.didit_session_id = sessionId;
  await admin.client
    .from("profiles")
    .update(patch)
    .eq("didit_vendor_data", vendorData);
}
