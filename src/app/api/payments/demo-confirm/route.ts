import { NextResponse } from "next/server";
import { markReferencePaid } from "../webhook/route";

export const runtime = "nodejs";

/**
 * Dry-run only: simulates GCash success and stamps a proof reference.
 * Still creates an auditable paid mark (reference + timestamp + demo txn id).
 * Disable in production by setting PAYMENTS_ALLOW_DEMO=false when live keys exist.
 */
export async function POST(req: Request) {
  const allow =
    process.env.PAYMENTS_ALLOW_DEMO !== "false" &&
    !process.env.PAYMONGO_SECRET_KEY;

  // Allow demo confirm even with PayMongo if explicitly enabled
  const force = process.env.PAYMENTS_ALLOW_DEMO === "true";
  if (!allow && !force) {
    return NextResponse.json(
      { error: "Demo confirm disabled. Use real GCash / PayMongo webhook." },
      { status: 403 }
    );
  }

  const body = (await req.json()) as { reference?: string };
  if (!body.reference) {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }

  const providerTxnId = `demo_txn_${Date.now()}`;
  markReferencePaid(body.reference, providerTxnId);

  return NextResponse.json({
    ok: true,
    reference: body.reference,
    providerTxnId,
    paidAt: new Date().toISOString(),
    proof: {
      channel: "demo_gcash",
      note: "Simulated settlement — replace with PayMongo webhook in production",
    },
  });
}
