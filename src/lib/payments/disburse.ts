import { paymongoReady } from "@/lib/runtime-mode";

const V1 = "https://api.paymongo.com/v1";
const V2 = "https://api.paymongo.com/v2";

/** PayMongo wallet BIC. Override if the live wallet returns a different one. */
const PAYMONGO_BIC = "PAEYPHM2XXX";
/** GCash on InstaPay. */
const GCASH_BIC = "GXCHPHM2XXX";

export type SourceAccount = { number: string; name: string; bic: string };

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim();
  if (!key) return null;
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export function phpToCentavos(amountPhp: number) {
  return Math.round(amountPhp * 100);
}

/** 09XXXXXXXXX. Accepts +639 / 639 forms. */
export function normalizeGcash(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) digits = `0${digits.slice(2)}`;
  if (/^09\d{9}$/.test(digits)) return digits;
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readAccount(node: unknown): SourceAccount | null {
  const rec = asRecord(node);
  if (!rec) return null;
  const number = String(rec.number ?? rec.account_number ?? "").trim();
  const name = String(rec.name ?? rec.account_name ?? "").trim();
  const bic = String(rec.bic ?? "").trim();
  if (number.length < 4 || name.length < 2) return null;
  return { number, name, bic: bic || PAYMONGO_BIC };
}

function findSource(node: unknown, depth = 0): SourceAccount | null {
  if (depth > 6) return null;
  const direct =
    readAccount(asRecord(node)?.source_account) ??
    readAccount(asRecord(node)?.account) ??
    readAccount(node);
  if (direct) return direct;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findSource(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const rec = asRecord(node);
  if (!rec) return null;
  for (const value of Object.values(rec)) {
    const found = findSource(value, depth + 1);
    if (found) return found;
  }
  return null;
}

export async function paymongoSourceAccount(): Promise<SourceAccount | { error: string }> {
  const number = process.env.PAYMONGO_SOURCE_ACCOUNT_NUMBER?.trim();
  const name = process.env.PAYMONGO_SOURCE_ACCOUNT_NAME?.trim();
  if (number && name) {
    return {
      number,
      name,
      bic: process.env.PAYMONGO_SOURCE_BIC?.trim() || PAYMONGO_BIC,
    };
  }

  const auth = authHeader();
  if (!auth) return { error: "PAYMONGO_SECRET_KEY not set" };
  const res = await fetch(`${V2}/wallets`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    return { error: `Could not read the PayMongo wallet (${res.status}).` };
  }
  const found = findSource(json);
  if (!found) {
    return {
      error:
        "No wallet account on this PayMongo key. Set PAYMONGO_SOURCE_ACCOUNT_NUMBER and PAYMONGO_SOURCE_ACCOUNT_NAME.",
    };
  }
  return found;
}

export async function createLaborCheckout(input: {
  amountPhp: number;
  reference: string;
  jobId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; checkoutId: string } | { error: string }> {
  if (!paymongoReady()) return { error: "PayMongo labor payout is production-only." };
  const auth = authHeader();
  if (!auth) return { error: "PAYMONGO_SECRET_KEY not set" };
  const centavos = phpToCentavos(input.amountPhp);
  if (centavos < 10000) {
    return { error: "Labor payout must be at least ₱100." };
  }

  const res = await fetch(`${V1}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: `KaGawa labor ${input.reference}`,
          line_items: [
            {
              currency: "PHP",
              amount: centavos,
              name: "Worker labor",
              quantity: 1,
              description: input.reference,
            },
          ],
          payment_method_types: ["gcash", "paymaya", "card"],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: {
            kagawa_reference: input.reference,
            purpose: "labor_payout",
            job_id: input.jobId,
          },
        },
      },
    }),
  });

  const json = (await res.json()) as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
    errors?: { detail?: string }[];
  };
  const checkoutUrl = json.data?.attributes?.checkout_url;
  const checkoutId = json.data?.id;
  if (!res.ok || !checkoutUrl || !checkoutId) {
    return { error: json.errors?.[0]?.detail ?? `PayMongo error (${res.status})` };
  }
  return { checkoutUrl, checkoutId };
}

/** Confirm the checkout PayMongo created is actually paid for this amount. */
export async function checkoutIsPaid(
  checkoutId: string,
  amountPhp: number
): Promise<{ paid: true } | { paid: false; error: string }> {
  const auth = authHeader();
  if (!auth) return { paid: false, error: "PAYMONGO_SECRET_KEY not set" };
  const res = await fetch(`${V1}/checkout_sessions/${checkoutId}`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) return { paid: false, error: `Checkout lookup failed (${res.status}).` };

  const paid = /"status"\s*:\s*"(paid|succeeded)"/.test(JSON.stringify(json));
  const centavos = phpToCentavos(amountPhp);
  const amountMatches = JSON.stringify(json).includes(String(centavos));
  if (!paid || !amountMatches) {
    return { paid: false, error: "PayMongo has not marked this labor payment paid." };
  }
  return { paid: true };
}

export async function sendLaborToGcash(input: {
  reference: string;
  amountPhp: number;
  destinationNumber: string;
  destinationName: string;
  callbackUrl: string;
}): Promise<{ transferId: string } | { error: string }> {
  if (!paymongoReady()) return { error: "Disbursement is off outside production." };
  const gcash = normalizeGcash(input.destinationNumber);
  if (!gcash) return { error: "Worker GCash must be a PH mobile (09XXXXXXXXX)." };
  const source = await paymongoSourceAccount();
  if ("error" in source) return source;
  const auth = authHeader();
  if (!auth) return { error: "PAYMONGO_SECRET_KEY not set" };

  const res = await fetch(`${V2}/batch_transfers`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      transfers: [
        {
          provider: "instapay",
          amount: phpToCentavos(input.amountPhp),
          currency: "PHP",
          purpose: "Disbursement",
          description: `KaGawa labor ${input.reference}`,
          reference_number: input.reference,
          source_account: source,
          destination_account: {
            number: gcash,
            name: input.destinationName.slice(0, 50),
            bic: process.env.PAYMONGO_GCASH_BIC?.trim() || GCASH_BIC,
          },
          callback_url: input.callbackUrl,
          metadata: { kagawa_reference: input.reference, purpose: "labor_payout" },
        },
      ],
    }),
  });

  const json = (await res.json().catch(() => null)) as {
    data?: { id?: string; transfers?: { id?: string }[] };
    errors?: { detail?: string }[];
  };
  const transferId = json.data?.transfers?.[0]?.id ?? json.data?.id;
  if (!res.ok || !transferId) {
    return { error: json.errors?.[0]?.detail ?? `Transfer failed (${res.status}).` };
  }
  return { transferId };
}
