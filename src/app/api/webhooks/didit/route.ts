import { NextResponse } from "next/server";
import {
  alreadyProcessedEvent,
  applyDiditDecision,
  markProcessedEvent,
} from "@/lib/kyc/didit";
import { verifyDiditSignatureV2 } from "@/lib/kyc/didit-verify-sig";
import { patchProfileDiditByVendor } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type DiditWebhookBody = {
  event_id?: string;
  webhook_type?: string;
  timestamp?: number;
  session_id?: string;
  status?: string;
  vendor_data?: string;
  decision?: unknown;
  resubmit_info?: { nodes_to_resubmit?: unknown };
};

/**
 * Didit session webhooks (V3).
 * Register: POST /v3/webhook/destinations/ with public HTTPS URL
 * (localhost is rejected by Didit's SSRF guard — use ngrok / tunnel for local).
 */
export async function POST(req: Request) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return new Response("webhook secret not configured", { status: 503 });
  }

  const raw = await req.text();
  const sig = req.headers.get("x-signature-v2") ?? "";

  let parsed: DiditWebhookBody;
  try {
    parsed = JSON.parse(raw) as DiditWebhookBody;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  // 1–2. Canonicalise + constant-time HMAC vs X-Signature-V2
  if (!verifyDiditSignatureV2(parsed, sig, secret)) {
    return new Response("bad sig", { status: 401 });
  }

  // 3. Freshness from SIGNED body.timestamp (not X-Timestamp header)
  const ts = Number(parsed.timestamp);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
    return new Response("stale", { status: 401 });
  }

  // 4. Idempotency on event_id
  const eventId = parsed.event_id ?? `${parsed.session_id}:${parsed.timestamp}`;
  if (alreadyProcessedEvent(eventId)) {
    return new Response("ok");
  }
  markProcessedEvent(eventId);

  // 5. Apply decision (source of truth)
  const vendor = parsed.vendor_data?.trim();
  const status = parsed.status ?? "Unknown";

  if (vendor) {
    applyDiditDecision(vendor, status, {
      sessionId: parsed.session_id,
    });
    void patchProfileDiditByVendor(vendor, status, parsed.session_id);
  }

  switch (status) {
    case "Approved":
    case "Declined":
    case "In Review":
    case "Resubmitted":
    case "Kyc Expired":
    case "Abandoned":
    case "Expired":
    case "Not Started":
    case "In Progress":
    case "Awaiting User":
      break;
    default:
      break;
  }

  // 6. Ack fast
  return new Response("ok");
}

/** Health for console tests */
export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.DIDIT_WEBHOOK_SECRET?.trim()),
  });
}
