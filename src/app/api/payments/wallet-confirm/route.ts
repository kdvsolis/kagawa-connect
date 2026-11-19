import { NextResponse } from "next/server";
import { isPlausibleTxnId } from "@/lib/payments/wallets";
import type { FeeWalletId } from "@/lib/payments/types";
import { markReferencePaid } from "../webhook/route";

export const runtime = "nodejs";

const WALLETS: FeeWalletId[] = ["gotyme", "gcash", "maya"];

/**
 * Customer self-attests QR payment with a wallet transaction / reference number.
 * Soft format check only — no bank webhook (personal QR path).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      reference?: string;
      txnId?: string;
      wallet?: string;
    };

    if (!body.reference?.trim()) {
      return NextResponse.json({ error: "reference required" }, { status: 400 });
    }
    if (!body.txnId || !isPlausibleTxnId(body.txnId)) {
      return NextResponse.json(
        { error: "Enter a valid transaction / reference number from your wallet." },
        { status: 400 }
      );
    }

    const wallet = (WALLETS.includes(body.wallet as FeeWalletId)
      ? body.wallet
      : "gotyme") as FeeWalletId;

    const providerTxnId = body.txnId.trim().replace(/\s+/g, "");
    markReferencePaid(body.reference.trim(), providerTxnId);

    return NextResponse.json({
      ok: true,
      reference: body.reference.trim(),
      providerTxnId,
      wallet,
      paidAt: new Date().toISOString(),
      proof: {
        channel: "wallet_qr",
        wallet,
        note: "Customer-confirmed QR payment with wallet txn id",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "wallet-confirm failed" },
      { status: 500 }
    );
  }
}
