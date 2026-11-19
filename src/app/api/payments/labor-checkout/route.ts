import { NextResponse } from "next/server";
import { createLaborCheckout, normalizeGcash } from "@/lib/payments/disburse";
import { saveLaborPayout } from "@/lib/payments/labor-payout-store";
import { paymongoReady } from "@/lib/runtime-mode";

export const runtime = "nodejs";

/**
 * Production labor checkout. Money lands in the KaGawa PayMongo wallet.
 * The paid webhook (or labor-settle) then sends that amount to the worker GCash.
 * Simulation never reaches this.
 */
export async function POST(req: Request) {
  if (!paymongoReady()) {
    return NextResponse.json(
      { error: "Labor payout runs only when KAGAWA_MODE=production and PAYMONGO_SECRET_KEY is set." },
      { status: 403 }
    );
  }

  const body = (await req.json()) as {
    jobId?: string;
    customerId?: string;
    workerId?: string;
    workerName?: string;
    destinationNumber?: string;
    amountPhp?: number;
  };

  const destination = normalizeGcash(body.destinationNumber ?? "");
  const amount = Number(body.amountPhp);
  const workerName = body.workerName?.trim() ?? "";
  if (!body.jobId || !body.customerId || !body.workerId || workerName.length < 2) {
    return NextResponse.json({ error: "Job and worker are required." }, { status: 400 });
  }
  if (!destination) {
    return NextResponse.json({ error: "Worker GCash must be a PH mobile." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json({ error: "Labor payout must be at least ₱100." }, { status: 400 });
  }

  const reference = `LP${Date.now().toString(36).toUpperCase()}`;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:43123";
  const created = await createLaborCheckout({
    amountPhp: amount,
    reference,
    jobId: body.jobId,
    successUrl: `${appUrl}/customer/job/${body.jobId}?payout=${reference}`,
    cancelUrl: `${appUrl}/customer/job/${body.jobId}?payout=cancel`,
  });
  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: 502 });
  }

  await saveLaborPayout({
    reference,
    jobId: body.jobId,
    customerId: body.customerId,
    workerId: body.workerId,
    workerName,
    destinationNumber: destination,
    destinationName: workerName,
    amountPhp: amount,
    checkoutId: created.checkoutId,
    status: "checkout",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    reference,
    checkoutUrl: created.checkoutUrl,
  });
}
