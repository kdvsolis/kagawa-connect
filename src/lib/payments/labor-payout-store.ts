import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkoutIsPaid, sendLaborToGcash } from "@/lib/payments/disburse";

export type PayoutStatus = "checkout" | "sending" | "sent" | "failed";

export type LaborPayout = {
  reference: string;
  jobId: string;
  customerId: string;
  workerId: string;
  workerName: string;
  destinationNumber: string;
  destinationName: string;
  amountPhp: number;
  checkoutId: string;
  transferId?: string;
  status: PayoutStatus;
  error?: string;
  createdAt: string;
  sentAt?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __kagawaLaborPayouts: Map<string, LaborPayout> | undefined;
  // eslint-disable-next-line no-var
  var __kagawaPayoutLocks: Map<string, Promise<LaborPayout>> | undefined;
}

function memory() {
  if (!globalThis.__kagawaLaborPayouts) {
    globalThis.__kagawaLaborPayouts = new Map();
  }
  return globalThis.__kagawaLaborPayouts;
}

function locks() {
  if (!globalThis.__kagawaPayoutLocks) {
    globalThis.__kagawaPayoutLocks = new Map();
  }
  return globalThis.__kagawaPayoutLocks;
}

function fromRow(row: Record<string, unknown>): LaborPayout {
  return {
    reference: String(row.reference),
    jobId: String(row.job_id),
    customerId: String(row.customer_id),
    workerId: String(row.worker_id),
    workerName: String(row.worker_name),
    destinationNumber: String(row.destination_number),
    destinationName: String(row.destination_name),
    amountPhp: Number(row.amount_php),
    checkoutId: String(row.checkout_id ?? ""),
    transferId: row.transfer_id ? String(row.transfer_id) : undefined,
    status: row.status as PayoutStatus,
    error: row.error ? String(row.error) : undefined,
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
  };
}

async function persist(payout: LaborPayout) {
  memory().set(payout.reference, payout);
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { error } = await admin.client.from("labor_payouts").upsert({
    reference: payout.reference,
    job_id: payout.jobId,
    customer_id: payout.customerId,
    worker_id: payout.workerId,
    worker_name: payout.workerName,
    destination_number: payout.destinationNumber,
    destination_name: payout.destinationName,
    amount_php: payout.amountPhp,
    checkout_id: payout.checkoutId,
    transfer_id: payout.transferId ?? null,
    status: payout.status,
    error: payout.error ?? null,
    created_at: payout.createdAt,
    sent_at: payout.sentAt ?? null,
  });
  if (error && !/labor_payouts|schema cache|does not exist/i.test(error.message)) {
    payout.error = payout.error ?? error.message;
  }
}

export async function saveLaborPayout(payout: LaborPayout) {
  await persist(payout);
}

export async function getLaborPayout(reference: string) {
  const cached = memory().get(reference);
  if (cached) return cached;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.client
    .from("labor_payouts")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error || !data) return null;
  const payout = fromRow(data as Record<string, unknown>);
  memory().set(reference, payout);
  return payout;
}

/**
 * After PayMongo says the checkout is paid, send that same amount to the
 * worker GCash stored when the checkout was created. One send per reference.
 */
export async function settleLaborPayout(reference: string): Promise<LaborPayout | { error: string }> {
  const existing = locks().get(reference);
  if (existing) return existing;

  const run = (async () => {
    const payout = await getLaborPayout(reference);
    if (!payout) throw new Error("Unknown labor payout.");
    if (payout.status === "sent" && payout.transferId) return payout;

    const confirmed = await checkoutIsPaid(payout.checkoutId, payout.amountPhp);
    if (!confirmed.paid) {
      return { ...payout, error: confirmed.error };
    }

    const sending: LaborPayout = { ...payout, status: "sending", error: undefined };
    await persist(sending);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:43123";
    const sent = await sendLaborToGcash({
      reference: payout.reference,
      amountPhp: payout.amountPhp,
      destinationNumber: payout.destinationNumber,
      destinationName: payout.destinationName,
      callbackUrl: `${appUrl}/api/payments/webhook`,
    });
    if ("error" in sent) {
      const failed: LaborPayout = { ...sending, status: "failed", error: sent.error };
      await persist(failed);
      return failed;
    }
    const done: LaborPayout = {
      ...sending,
      status: "sent",
      transferId: sent.transferId,
      sentAt: new Date().toISOString(),
    };
    await persist(done);
    return done;
  })();

  locks().set(reference, run);
  try {
    return await run;
  } finally {
    locks().delete(reference);
  }
}
