import { NextResponse } from "next/server";
import {
  isSimulation,
  simCardNumber,
} from "@/lib/runtime-mode";
import {
  makeFeeReference,
  makeReceiptCode,
  type FeePayment,
} from "@/lib/payments/types";

export const runtime = "nodejs";

/**
 * Happy-path card charge. Only while KAGAWA_MODE=simulation.
 * Production ignores this route and uses PayMongo.
 */
export async function POST(req: Request) {
  if (!isSimulation()) {
    return NextResponse.json(
      { error: "Simulation card is off. Use PayMongo." },
      { status: 403 }
    );
  }

  const body = (await req.json()) as {
    customerId?: string;
    cardNumber?: string;
    exp?: string;
    cvc?: string;
    amount?: number;
    currency?: string;
  };

  if (!body.customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }

  const card = (body.cardNumber ?? "").replace(/\D/g, "");
  const exp = (body.exp ?? "").replace(/\s/g, "");
  const cvc = (body.cvc ?? "").replace(/\D/g, "");
  if (card !== simCardNumber()) {
    return NextResponse.json(
      { error: "Card declined. Simulation accepts the test card only." },
      { status: 402 }
    );
  }
  if (!/^\d{2}\/\d{2}$/.test(exp) || cvc.length < 3) {
    return NextResponse.json({ error: "Check expiry and CVC." }, { status: 400 });
  }

  const amount = Number(body.amount);
  const now = new Date().toISOString();
  const payment: FeePayment = {
    id: crypto.randomUUID(),
    reference: makeFeeReference(),
    receiptCode: makeReceiptCode(),
    amountPhp: Number.isFinite(amount) && amount > 0 ? amount : 0,
    currency: body.currency === "EUR" ? "EUR" : "PHP",
    status: "paid",
    provider: "simulation",
    customerId: body.customerId,
    providerTxnId: `sim_${card.slice(-4)}_${Date.now()}`,
    createdAt: now,
    paidAt: now,
    proofNote: "Simulation card. Not sent to PayMongo.",
  };

  return NextResponse.json({ payment, mode: "simulation" });
}
