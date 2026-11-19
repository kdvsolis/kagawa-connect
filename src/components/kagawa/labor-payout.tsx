"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { formatPhp } from "@/lib/services";
import { isSimulation } from "@/lib/runtime-mode";

type PayoutView = {
  status: "checkout" | "sending" | "sent" | "failed";
  transferId?: string;
  error?: string;
};

/**
 * Production labor payment. Hidden in simulation so the 4242 happy path stays cash + Bayad Code.
 */
export function LaborPayout({
  jobId,
  customerId,
  workerId,
  workerName,
  destinationNumber,
  amountPhp,
}: {
  jobId: string;
  customerId: string;
  workerId: string;
  workerName: string;
  destinationNumber: string;
  amountPhp: number;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payout, setPayout] = useState<PayoutView | null>(null);

  useEffect(() => {
    if (isSimulation()) return;
    const reference = new URLSearchParams(window.location.search).get("payout");
    if (!reference || reference === "cancel") return;
    let stop = false;
    void (async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/payments/labor-settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const data = (await res.json()) as { payout?: PayoutView; error?: string };
        if (stop) return;
        if (!res.ok || !data.payout) throw new Error(data.error ?? t("customer.payoutFailed"));
        setPayout(data.payout);
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : t("customer.payoutFailed"));
      } finally {
        if (!stop) setBusy(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [t]);

  if (isSimulation()) return null;

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/labor-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          customerId,
          workerId,
          workerName,
          destinationNumber,
          amountPhp,
        }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? t("customer.payoutFailed"));
      }
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("customer.payoutFailed"));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <p className="font-display text-sm font-semibold">{t("customer.payoutTitle")}</p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("customer.payoutBody")}</p>
      {payout?.status === "sent" && (
        <p className="text-sm text-emerald-800">
          {t("customer.payoutSent", { id: payout.transferId ?? "" })}
        </p>
      )}
      {payout && payout.status !== "sent" && payout.status !== "failed" && (
        <p className="text-sm">{t("customer.payoutPending")}</p>
      )}
      {(error || payout?.status === "failed") && (
        <p className="text-sm text-destructive" role="alert">
          {error || payout?.error || t("customer.payoutFailed")}
        </p>
      )}
      {payout?.status !== "sent" && (
        <Button type="button" className="rounded-full" disabled={busy || amountPhp < 100} onClick={() => void pay()}>
          {busy ? t("customer.payoutWorking") : t("customer.payoutPay", { amount: formatPhp(amountPhp) })}
        </Button>
      )}
    </div>
  );
}
