import { NextResponse } from "next/server";
import { getLaborPayout, settleLaborPayout } from "@/lib/payments/labor-payout-store";
import { paymongoReady } from "@/lib/runtime-mode";

export const runtime = "nodejs";

/** Re-check PayMongo, then send labor to the worker. Safe to call more than once. */
export async function POST(req: Request) {
  if (!paymongoReady()) {
    return NextResponse.json({ error: "Production PayMongo only." }, { status: 403 });
  }
  const body = (await req.json()) as { reference?: string };
  if (!body.reference) {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }
  try {
    const payout = await settleLaborPayout(body.reference);
    if ("error" in payout && !("reference" in payout)) {
      return NextResponse.json({ error: payout.error }, { status: 404 });
    }
    return NextResponse.json({ payout });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Payout failed." },
      { status: 400 }
    );
  }
}

export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference required" }, { status: 400 });
  }
  const payout = await getLaborPayout(reference);
  if (!payout) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ payout });
}
