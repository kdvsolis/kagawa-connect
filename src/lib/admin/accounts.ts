import { randomUUID } from "crypto";
import { hashPassword, passwordsMatch, verifyPassword } from "@/lib/admin/password";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminAccount = { id: string; username: string };

function envAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 8) return null;
  return { username, password };
}

function fromEnv(username: string, password: string): AdminAccount | null {
  const env = envAdmin();
  if (!env) return null;
  if (username !== env.username || !passwordsMatch(password, env.password)) return null;
  return { id: "env-admin", username: env.username };
}

export async function authenticateAdmin(
  rawUsername: string,
  password: string
): Promise<
  | { account: AdminAccount }
  | { error: "invalid" | "unavailable" | "bad_input"; message?: string }
> {
  const username = rawUsername.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 8) {
    return { error: "bad_input" };
  }

  const admin = getSupabaseAdmin();
  if (!admin?.usingServiceRole) {
    const account = fromEnv(username, password);
    return account ? { account } : { error: "invalid" };
  }

  const { data, error } = await admin.client
    .from("admin_accounts")
    .select("id, username, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    if (/does not exist|permission denied/i.test(error.message)) {
      const account = fromEnv(username, password);
      return account ? { account } : { error: "unavailable", message: error.message };
    }
    return { error: "unavailable", message: error.message };
  }

  if (!data) {
    const { count, error: countError } = await admin.client
      .from("admin_accounts")
      .select("id", { count: "exact", head: true });
    if (countError) return { error: "unavailable", message: countError.message };
    const env = envAdmin();
    if ((count ?? 0) === 0 && env && username === env.username && passwordsMatch(password, env.password)) {
      const id = randomUUID();
      const { error: insertError } = await admin.client.from("admin_accounts").insert({
        id,
        username,
        password_hash: hashPassword(password),
      });
      if (insertError) return { error: "unavailable", message: insertError.message };
      return { account: { id, username } };
    }
    return { error: "invalid" };
  }

  const row = data as { id: string; username: string; password_hash: string };
  if (!verifyPassword(password, row.password_hash)) return { error: "invalid" };
  return { account: { id: row.id, username: row.username } };
}
