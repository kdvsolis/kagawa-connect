import { NextResponse } from "next/server";
import {
  createPaymongoCheckout,
  paymongoConfigured,
} from "@/lib/payments/paymongo";
import { paymongoReady } from "@/lib/runtime-mode";
import {
  makeFeeReference,
  makeReceiptCode,
  type FeePayment,
  type FeeWalletId,
} from "@/lib/payments/types";
import { SETTINGS } from "@/lib/services";

export const runtime = "nodejs";

const WALLETS: FeeWalletId[] = ["gotyme", "gcash", "maya"];

/**
 * Creates a booking-fee payment.
 * Default: wallet QR (GoTyme / GCash / Maya) — customer scans + pastes txn ref.
 * Optional: PAYMONGO_SECRET_KEY → live checkout URL instead.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      customerId?: string;
      jobId?: string;
      wallet?: string;
      preferPaymongo?: boolean;
    };

    if (!body.customerId) {
      return NextResponse.json(
        { error: "customerId required" },
        { status: 400 }
      );
    }

    const wallet = (WALLETS.includes(body.wallet as FeeWalletId)
      ? body.wallet
      : "gotyme") as FeeWalletId;

    const reference = makeFeeReference();
    const receiptCode = makeReceiptCode();
    const amountPhp = SETTINGS.bookingFeePhp;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      "http://127.0.0.1:43123";

    const base: FeePayment = {
      id: crypto.randomUUID(),
      reference,
      receiptCode,
      amountPhp,
      currency: "PHP",
      status: "pending",
      provider: "wallet_qr",
      wallet,
      customerId: body.customerId,
      jobId: body.jobId,
      createdAt: new Date().toISOString(),
    };

    if (body.preferPaymongo && !(paymongoReady() && paymongoConfigured())) {
      return NextResponse.json(
        {
          error:
            "PayMongo is not configured. Set KAGAWA_MODE=production and PAYMONGO_SECRET_KEY.",
        },
        { status: 503 }
      );
    }

    if (body.preferPaymongo && paymongoReady() && paymongoConfigured()) {
      const created = await createPaymongoCheckout({
        amountPhp,
        reference,
        description: `KaGawa booking fee ${reference}`,
        successUrl: `${appUrl}/customer/fee/success`,
        cancelUrl: `${appUrl}/customer/fee/cancel`,
      });

      if ("error" in created) {
        return NextResponse.json(
          { error: created.error, payment: base },
          { status: 502 }
        );
      }

      const payment: FeePayment = {
        ...base,
        provider: "paymongo",
        wallet: undefined,
        status: "processing",
        checkoutUrl: created.checkoutUrl,
        providerTxnId: created.providerTxnId,
        proofNote: "Awaiting PayMongo confirmation",
      };

      return NextResponse.json({ payment, mode: "paymongo" });
    }

    const payment: FeePayment = {
      ...base,
      proofNote: `Scan ${wallet} QR · put ${reference} in Notes · paste txn # to confirm`,
    };

    return NextResponse.json({ payment, mode: "wallet_qr" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "create-fee failed" },
      { status: 500 }
    );
  }
}
