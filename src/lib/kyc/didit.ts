/**
 * Didit KYC — hosted ID check (server-side only for API key).
 * Docs: https://docs.didit.me
 *
 * workflow_id is per-session config (not a secret / not an env var).
 */

export const DIDIT_WORKFLOW_ID =
  "694339ba-b373-430c-aa3e-aef9bec1255c"; // "Fast ID check"

export const DIDIT_API_BASE = "https://verification.didit.me";

/** Didit session status literals (case-sensitive). */
export type DiditSessionStatus =
  | "Not Started"
  | "In Progress"
  | "Awaiting User"
  | "In Review"
  | "Approved"
  | "Declined"
  | "Resubmitted"
  | "Abandoned"
  | "Expired"
  | "Kyc Expired";

export type DiditSessionCreate = {
  session_id: string;
  session_token?: string;
  url: string;
  status: string;
  workflow_id?: string;
  vendor_data?: string;
};

export function diditConfigured() {
  return Boolean(process.env.DIDIT_API_KEY?.trim());
}

export function diditApiKey() {
  const key = process.env.DIDIT_API_KEY?.trim();
  if (!key) throw new Error("DIDIT_API_KEY is not set");
  return key;
}

export async function createDiditSession(input: {
  vendorData: string;
  callback?: string;
  metadata?: Record<string, unknown>;
}): Promise<DiditSessionCreate | { error: string; detail?: string; status: number }> {
  const res = await fetch(`${DIDIT_API_BASE}/v3/session/`, {
    method: "POST",
    headers: {
      "x-api-key": diditApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: DIDIT_WORKFLOW_ID,
      vendor_data: input.vendorData,
      ...(input.callback ? { callback: input.callback } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { error: "session_create_failed", detail, status: res.status };
  }

  return (await res.json()) as DiditSessionCreate;
}

export async function fetchDiditSessionDecision(sessionId: string): Promise<{
  status?: string;
  decision?: unknown;
  raw?: unknown;
  error?: string;
}> {
  const res = await fetch(
    `${DIDIT_API_BASE}/v3/session/${encodeURIComponent(sessionId)}/decision/`,
    {
      headers: { "x-api-key": diditApiKey() },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    return { error: await res.text() };
  }
  const raw = (await res.json()) as { status?: string; decision?: unknown };
  return { status: raw.status, decision: raw.decision, raw };
}

/** In-memory KYC decision store (webhook + poll). Single-process demo. */
type StoredDecision = {
  status: string;
  sessionId?: string;
  decision?: unknown;
  updatedAt: string;
};

const byVendor = new Map<string, StoredDecision>();
const processedEvents = new Set<string>();

export function alreadyProcessedEvent(eventId: string) {
  return processedEvents.has(eventId);
}

export function markProcessedEvent(eventId: string) {
  processedEvents.add(eventId);
  // Cap growth in long-running dev servers
  if (processedEvents.size > 5000) {
    const first = processedEvents.values().next().value;
    if (first) processedEvents.delete(first);
  }
}

export function applyDiditDecision(
  vendorData: string,
  status: string,
  opts?: { sessionId?: string; decision?: unknown }
) {
  if (!vendorData) return;
  byVendor.set(vendorData, {
    status,
    sessionId: opts?.sessionId,
    decision: opts?.decision,
    updatedAt: new Date().toISOString(),
  });
}

export function getDiditDecision(vendorData: string) {
  return byVendor.get(vendorData) ?? null;
}

export function getDiditDecisionBySession(sessionId: string) {
  for (const [vendor, row] of byVendor) {
    if (row.sessionId === sessionId) return { vendorData: vendor, ...row };
  }
  return null;
}

/** Whole-number floats (1.0) → integers — Didit X-Signature-V2 canonicalisation. */
export function shortenFloats(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [
        k,
        shortenFloats(x),
      ])
    );
  }
  if (typeof v === "number" && !Number.isInteger(v) && v % 1 === 0) {
    return Math.trunc(v);
  }
  return v;
}

/** Recursive lexicographic key sort (array order preserved). */
export function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.keys(v as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

export function canonicalWebhookBody(parsed: unknown) {
  return JSON.stringify(sortKeys(shortenFloats(parsed)));
}
