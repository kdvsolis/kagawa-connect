import { NextResponse } from "next/server";
import { settleLaborPayout } from "@/lib/payments/labor-payout-store";
import { parsePaymongoWebhook } from "@/lib/payments/paymongo";
import { paymongoReady } from "@/lib/runtime-mode";

export const runtime = "nodejs";

/**
 * PayMongo (or compatible) webhook.
 * Confirms fee paid → client/store should poll GET status by reference,
 * or this can push to Supabase when service role is configured.
 *
 * For the PWA demo, we also expose the last confirmed ref in a tiny
 * in-memory map so /api/payments/status can see it on the same server.
 */

declare global {
  // eslint-disable-next-line no-var
  var __kagawaPaidRefs: Map<string, { providerTxnId?: string; at: string }> | undefined;
}

function paidMap() {
  if (!globalThis.__kagawaPaidRefs) {
    globalThis.__kagawaPaidRefs = new Map();
  }
  return globalThis.__kagawaPaidRefs;
}

export function markReferencePaid(
  reference: string,
  providerTxnId?: string
) {
  paidMap().set(reference, {
    providerTxnId,
    at: new Date().toISOString(),
  });
}

export function getPaidMark(reference: string) {
  return paidMap().get(reference) ?? null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = parsePaymongoWebhook(body);

    if (parsed.paid && parsed.reference) {
      markReferencePaid(parsed.reference, parsed.providerTxnId);
      if (paymongoReady() && parsed.reference.startsWith("LP")) {
        const payout = await settleLaborPayout(parsed.reference);
        return NextResponse.json({
          ok: true,
          reference: parsed.reference,
          providerTxnId: parsed.providerTxnId,
          payout,
        });
      }
      return NextResponse.json({
        ok: true,
        reference: parsed.reference,
        providerTxnId: parsed.providerTxnId,
      });
    }

    // Also accept simple internal payload: { reference, providerTxnId }
    const simple = body as { reference?: string; providerTxnId?: string; paid?: boolean };
    if (simple.paid && simple.reference) {
      markReferencePaid(simple.reference, simple.providerTxnId);
      return NextResponse.json({ ok: true, reference: simple.reference });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "webhook failed" },
      { status: 400 }
    );
  }
}
