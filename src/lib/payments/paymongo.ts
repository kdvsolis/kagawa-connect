/**
 * PayMongo (PH) — GCash via Checkout Session.
 * Docs: https://developers.paymongo.com/
 *
 * Env:
 *   PAYMONGO_SECRET_KEY=sk_test_...
 *   PAYMONGO_WEBHOOK_SECRET=whsec_... (optional verify)
 *   NEXT_PUBLIC_APP_URL=http://127.0.0.1:43123
 */

import type { FeePayment } from "./types";

const PAYMONGO_API = "https://api.paymongo.com/v1";

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) return null;
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export function paymongoConfigured() {
  return Boolean(process.env.PAYMONGO_SECRET_KEY);
}

export async function createPaymongoCheckout(input: {
  amountPhp: number;
  reference: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; providerTxnId: string } | { error: string }> {
  const auth = authHeader();
  if (!auth) return { error: "PAYMONGO_SECRET_KEY not set" };

  const centavos = Math.round(input.amountPhp * 100);

  const res = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
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
          description: input.description,
          line_items: [
            {
              currency: "PHP",
              amount: centavos,
              name: "KaGawa booking fee",
              quantity: 1,
              description: input.reference,
            },
          ],
          payment_method_types: ["gcash", "paymaya", "card"],
          success_url: `${input.successUrl}?ref=${encodeURIComponent(input.reference)}`,
          cancel_url: `${input.cancelUrl}?ref=${encodeURIComponent(input.reference)}`,
          metadata: {
            kagawa_reference: input.reference,
            purpose: "booking_fee",
          },
        },
      },
    }),
  });

  const json = (await res.json()) as {
    data?: {
      id: string;
      attributes?: { checkout_url?: string };
    };
    errors?: { detail?: string }[];
  };

  if (!res.ok || !json.data?.attributes?.checkout_url) {
    return {
      error:
        json.errors?.[0]?.detail ??
        `PayMongo error (${res.status})`,
    };
  }

  return {
    checkoutUrl: json.data.attributes.checkout_url,
    providerTxnId: json.data.id,
  };
}

/** Map PayMongo webhook event → our reference if a customer payment was paid. */
export function parsePaymongoWebhook(body: unknown): {
  paid: boolean;
  reference?: string;
  providerTxnId?: string;
  eventType: string;
} {
  const event = body as {
    data?: {
      id?: string;
      attributes?: {
        type?: string;
        data?: {
          id?: string;
          attributes?: {
            status?: string;
            metadata?: { kagawa_reference?: string };
            payment_intent_id?: string;
          };
        };
      };
    };
  };

  const type = event.data?.attributes?.type ?? "";
  const inner = event.data?.attributes?.data;
  const status = inner?.attributes?.status;
  const reference = inner?.attributes?.metadata?.kagawa_reference;
  const eventType = type || "";
  const isTransfer = /transfer/i.test(eventType);
  const paid =
    !isTransfer &&
    (eventType.includes("payment.paid") ||
      eventType.includes("checkout_session.payment.paid") ||
      status === "paid");

  return {
    paid,
    reference,
    providerTxnId: inner?.id ?? event.data?.id,
    eventType,
  };
}

export function paymentIsLive(p: FeePayment) {
  return p.provider !== "demo_gcash" && p.status === "paid";
}
