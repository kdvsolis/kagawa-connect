"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import type { FeePayment } from "@/lib/payments/types";
import {
  formatCardGroups,
  isSimulation,
  simCardNumber,
} from "@/lib/runtime-mode";

export function BookingFeePay({
  customerId,
  amount,
  currency,
  onPaid,
}: {
  customerId: string;
  amount: number;
  currency: "PHP" | "EUR";
  onPaid: (payment: FeePayment) => void;
}) {
  const t = useT();
  const simulation = isSimulation();
  const [card, setCard] = useState(formatCardGroups(simCardNumber()));
  const [exp, setExp] = useState("12/34");
  const [cvc, setCvc] = useState("123");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState<FeePayment | null>(null);

  async function payCard() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/sim-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          cardNumber: card,
          exp,
          cvc,
          amount,
          currency,
        }),
      });
      const data = (await res.json()) as { payment?: FeePayment; error?: string };
      if (!res.ok || !data.payment) {
        throw new Error(data.error ?? t("fee.simDeclined"));
      }
      setPaid(data.payment);
      onPaid(data.payment);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("fee.simDeclined"));
    } finally {
      setBusy(false);
    }
  }

  async function payLive() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, preferPaymongo: true }),
      });
      const data = (await res.json()) as {
        payment?: FeePayment;
        error?: string;
      };
      if (!res.ok || !data.payment?.checkoutUrl) {
        throw new Error(data.error ?? t("fee.productionMissing"));
      }
      window.location.href = data.payment.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("fee.productionMissing"));
      setBusy(false);
    }
  }

  if (paid) {
    return (
      <p className="rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
        {t("fee.paid")} · {paid.reference}
      </p>
    );
  }

  if (!simulation) {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="font-display text-sm font-semibold">{t("fee.payNow")}</p>
        <p className="text-[11px] text-muted-foreground">{t("fee.productionBody")}</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="button" className="rounded-full" disabled={busy} onClick={() => void payLive()}>
          {t("fee.openGcash")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-display text-sm font-semibold">
        <CreditCard className="h-4 w-4" />
        {t("fee.simTitle")}
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("fee.simBody")}</p>
      <Input
        inputMode="numeric"
        autoComplete="cc-number"
        value={card}
        onChange={(e) => setCard(e.target.value)}
        aria-label={t("fee.cardNumber")}
        className="h-11 rounded-xl font-mono"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={exp}
          onChange={(e) => setExp(e.target.value)}
          aria-label={t("fee.exp")}
          placeholder="MM/YY"
          className="h-11 rounded-xl"
        />
        <Input
          value={cvc}
          onChange={(e) => setCvc(e.target.value)}
          aria-label={t("fee.cvc")}
          placeholder="CVC"
          className="h-11 rounded-xl"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="button" className="w-full rounded-full" disabled={busy} onClick={() => void payCard()}>
        {t("fee.payCard")}
      </Button>
    </div>
  );
}
