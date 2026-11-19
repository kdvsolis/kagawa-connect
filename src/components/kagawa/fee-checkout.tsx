"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  QrCode,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FeePayment, FeeWalletId } from "@/lib/payments/types";
import { FEE_WALLETS, walletQrSrc } from "@/lib/payments/wallets";
import { SETTINGS, formatPhp } from "@/lib/services";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";
import { cn } from "@/lib/utils";

function WalletQrImage({
  wallet,
  label,
}: {
  wallet: FeeWalletId;
  label: string;
}) {
  const t = useT();
  const [missing, setMissing] = useState(false);
  const src = walletQrSrc(wallet);

  if (missing) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/60 p-6 text-center">
        <QrCode className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-semibold">{t("fee.qrMissingTitle")}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("fee.qrMissingBody")}
        </p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      className="aspect-square w-full rounded-2xl border border-border bg-white object-contain p-2"
      onError={() => setMissing(true)}
      onLoad={(e) => {
        const img = e.currentTarget;
        // Tiny / empty assets still count as missing
        if (img.naturalWidth < 32 || img.naturalHeight < 32) setMissing(true);
      }}
    />
  );
}

export function FeeCheckout({
  onPaid,
}: {
  onPaid: (payment: FeePayment) => void;
}) {
  const t = useT();
  const customerId = useKagawa((s) => s.customerId);
  const upsertPayment = useKagawa((s) => s.upsertFeePayment);
  const [wallet, setWallet] = useState<FeeWalletId>("gotyme");
  const [payment, setPayment] = useState<FeePayment | null>(null);
  const [txnId, setTxnId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function startPay(nextWallet: FeeWalletId = wallet) {
    setBusy(true);
    setError(null);
    setTxnId("");
    try {
      const res = await fetch("/api/payments/create-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, wallet: nextWallet }),
      });
      const data = (await res.json()) as {
        payment?: FeePayment;
        error?: string;
      };
      if (!res.ok || !data.payment) {
        throw new Error(data.error ?? "Could not start payment");
      }
      setPayment(data.payment);
      setWallet(data.payment.wallet ?? nextWallet);
      upsertPayment(data.payment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment error");
    } finally {
      setBusy(false);
    }
  }

  async function switchWallet(id: FeeWalletId) {
    setWallet(id);
    if (payment && payment.status !== "paid") {
      await startPay(id);
    }
  }

  async function confirmWallet() {
    if (!payment) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/wallet-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: payment.reference,
          txnId,
          wallet,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        providerTxnId?: string;
        paidAt?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Confirm failed");
      }
      const paid: FeePayment = {
        ...payment,
        status: "paid",
        wallet,
        provider: "wallet_qr",
        providerTxnId: data.providerTxnId,
        paidAt: data.paidAt ?? new Date().toISOString(),
        proofNote: t("fee.proofWallet", {
          wallet: t(`fee.wallet.${wallet}`),
        }),
      };
      setPayment(paid);
      upsertPayment(paid);
      onPaid(paid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm error");
    } finally {
      setBusy(false);
    }
  }

  async function copyRef() {
    if (!payment) return;
    try {
      await navigator.clipboard.writeText(payment.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!payment || payment.status === "paid") return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/payments/status?reference=${encodeURIComponent(payment.reference)}`
        );
        const data = (await res.json()) as {
          status?: string;
          providerTxnId?: string;
          paidAt?: string;
        };
        if (data.status === "paid") {
          const paid: FeePayment = {
            ...payment,
            status: "paid",
            providerTxnId: data.providerTxnId ?? payment.providerTxnId,
            paidAt: data.paidAt ?? new Date().toISOString(),
          };
          setPayment(paid);
          upsertPayment(paid);
          onPaid(paid);
        }
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [payment, onPaid, upsertPayment]);

  if (payment?.status === "paid") {
    return (
      <div className="space-y-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 font-display font-semibold text-emerald-950">
          <CheckCircle2 className="h-5 w-5" />
          {t("fee.paidProof")}
        </p>
        <ReceiptBlock payment={payment} />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-accent/50 bg-accent/10 p-4">
      <p className="font-display text-sm font-semibold">
        {t("fee.title", { fee: formatPhp(SETTINGS.bookingFeePhp) })}
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t("fee.bodyQr")}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {FEE_WALLETS.map((w) => {
          const selected = wallet === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => void switchWallet(w.id)}
              className={cn(
                "relative rounded-xl border px-2 py-2.5 text-center text-[11px] font-semibold transition",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground",
                w.featured && !selected && "ring-1 ring-primary/40"
              )}
            >
              {w.featured && (
                <span
                  className={cn(
                    "absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    selected
                      ? "bg-white text-primary"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {t("fee.recommended")}
                </span>
              )}
              {t(`fee.wallet.${w.id}`)}
            </button>
          );
        })}
      </div>

      {!payment ? (
        <Button
          type="button"
          className="w-full rounded-full"
          disabled={busy}
          onClick={() => void startPay(wallet)}
        >
          {busy ? t("common.loading") : t("fee.showQr")}
        </Button>
      ) : (
        <div className="space-y-3">
          <WalletQrImage
            wallet={wallet}
            label={t(`fee.wallet.${wallet}`)}
          />

          <div className="rounded-xl bg-secondary/80 px-3 py-2 text-xs space-y-2">
            <p className="flex items-center gap-1 text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              {t("fee.qrStepsTitle")}
            </p>
            <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>{t("fee.qrStep1", { wallet: t(`fee.wallet.${wallet}`) })}</li>
              <li>{t("fee.qrStep2")}</li>
              <li>{t("fee.qrStep3")}</li>
            </ol>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p>
                <span className="text-muted-foreground">{t("fee.reference")}: </span>
                <span className="font-mono font-semibold">{payment.reference}</span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0 rounded-full"
                onClick={() => void copyRef()}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                {copied ? t("common.copied") : t("fee.copyRef")}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="fee-txn">
              {t("fee.txnLabel")}
            </label>
            <Input
              id="fee-txn"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder={t("fee.txnPlaceholder")}
              className="h-11 rounded-xl font-mono"
              autoComplete="off"
            />
          </div>

          <Button
            type="button"
            className="w-full rounded-full"
            disabled={busy || txnId.trim().length < 6}
            onClick={() => void confirmWallet()}
          >
            {busy ? t("common.loading") : t("fee.confirmPaid")}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ReceiptBlock({ payment }: { payment: FeePayment }) {
  const t = useT();
  return (
    <div className="space-y-1 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-xs">
      <p className="flex items-center gap-1 font-semibold text-emerald-950">
        <Receipt className="h-3.5 w-3.5" />
        {t("fee.receiptTitle")}
      </p>
      <p>
        {t("fee.receipt")}:{" "}
        <span className="font-mono">{payment.receiptCode}</span>
      </p>
      <p>
        {t("fee.reference")}:{" "}
        <span className="font-mono">{payment.reference}</span>
      </p>
      {payment.wallet && (
        <p>
          {t("fee.via")}: {t(`fee.wallet.${payment.wallet}`)}
        </p>
      )}
      <p>
        {t("fee.amount")}: {formatPhp(payment.amountPhp)}
      </p>
      {payment.providerTxnId && (
        <p>
          {t("fee.providerTxn")}:{" "}
          <span className="font-mono break-all">{payment.providerTxnId}</span>
        </p>
      )}
      {payment.paidAt && (
        <p>
          {t("fee.paidAt")}: {new Date(payment.paidAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
