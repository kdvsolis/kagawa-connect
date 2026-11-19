/**
 * Demo login credentials (temporary).
 * Prefill on /accounts — remove defaults when real auth ships.
 * Matches seeded profile UUIDs in supabase/migrations.
 */

export const DEMO_PASSWORD = "kagawa123";

export type DemoAccount = {
  username: string;
  password: string;
  id: string;
  role: "customer" | "worker";
  name: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: "ana",
    password: DEMO_PASSWORD,
    id: "a0000000-0000-4000-8000-000000000001",
    role: "customer",
    name: "Ana Reyes",
  },
  {
    username: "ben",
    password: DEMO_PASSWORD,
    id: "a0000000-0000-4000-8000-000000000005",
    role: "customer",
    name: "Ben Cruz",
  },
  {
    username: "juan",
    password: DEMO_PASSWORD,
    id: "a0000000-0000-4000-8000-000000000002",
    role: "worker",
    name: "Juan Dela Cruz",
  },
  {
    username: "maria",
    password: DEMO_PASSWORD,
    id: "a0000000-0000-4000-8000-000000000003",
    role: "worker",
    name: "Maria Santos",
  },
  {
    username: "rico",
    password: DEMO_PASSWORD,
    id: "a0000000-0000-4000-8000-000000000004",
    role: "worker",
    name: "Rico Mendoza",
  },
  {
    username: "worker",
    password: DEMO_PASSWORD,
    id: "a0000000-0000-4000-8000-000000000006",
    role: "worker",
    name: "Paolo Garcia",
  },
  {
    username: "liza",
    password: DEMO_PASSWORD,
    id: "a0000000-0000-4000-8000-000000000007",
    role: "worker",
    name: "Liza Reyes",
  },
];

export function findDemoAccount(
  username: string,
  password: string
): DemoAccount | null {
  const u = username.trim().toLowerCase();
  const p = password;
  const byUser = DEMO_ACCOUNTS.find((a) => a.username === u);
  if (byUser && byUser.password === p) return byUser;

  // Also accept full demo email (ana@kagawa.demo)
  const local = u.includes("@") ? u.split("@")[0] : u;
  const byEmailLocal = DEMO_ACCOUNTS.find((a) => a.username === local);
  if (byEmailLocal && byEmailLocal.password === p) return byEmailLocal;

  return null;
}
