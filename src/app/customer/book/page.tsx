"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { LocationPicker } from "@/components/kagawa/location-picker";
import { BookingFeePay } from "@/components/kagawa/booking-fee-pay";
import { SafetyBridgeNotice } from "@/components/kagawa/safety-bridge-notice";
import { useEmergencyNumber } from "@/components/kagawa/use-emergency-number";
import { ServiceIcon } from "@/components/kagawa/service-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  suggestServicesFromText,
  type ServiceSuggestion,
} from "@/lib/ai/suggest-service";
import { useT } from "@/lib/i18n";
import { formatMoney, quoteBookingFee } from "@/lib/markets";
import { useKagawa } from "@/lib/store";
import {
  SERVICES,
  estimateJobTotal,
  formatPhp,
  getService,
} from "@/lib/services";
import { serviceDescKey, serviceNameKey } from "@/lib/service-label";
import { isSimulation } from "@/lib/runtime-mode";
import type { FeePayment } from "@/lib/payments/types";
import type { PricingMode, ServiceId } from "@/lib/types";
import { cn } from "@/lib/utils";

function BookForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const createBooking = useKagawa((s) => s.createBooking);
  const updateMyLocation = useKagawa((s) => s.updateMyLocation);
  const customerId = useKagawa((s) => s.customerId);
  const customers = useKagawa((s) => s.customers);
  const customer =
    customers.find((c) => c.id === customerId) ?? customers[0];

  const initial = (params.get("service") as ServiceId) || "cleaning";
  const [serviceId, setServiceId] = useState<ServiceId>(
    getService(initial) ? initial : "cleaning"
  );
  const service = getService(serviceId)!;
  const [pricingMode, setPricingMode] = useState<PricingMode>("hourly");
  const [hours, setHours] = useState(service.minHours);
  const [address, setAddress] = useState("Avenida Maisonnave 31");
  const [barangay, setBarangay] = useState(customer?.barangay ?? "Centro");
  const [city, setCity] = useState(
    (customer?.city ?? "Alicante").split(",")[0].trim() || "Alicante"
  );
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paidFee, setPaidFee] = useState<FeePayment | null>(null);
  const [safetyAck, setSafetyAck] = useState(false);
  const guideRate =
    pricingMode === "daily"
      ? Math.round(service.hourlyRate * 8)
      : service.hourlyRate;
  const minUnits = pricingMode === "daily" ? 1 : service.minHours;
  const maxUnits = pricingMode === "daily" ? 7 : 12;
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    customer?.lat != null && customer?.lng != null
      ? { lat: customer.lat, lng: customer.lng }
      : null
  );
  const emergency = useEmergencyNumber({ lat: pin?.lat, lng: pin?.lng });
  const [aiSuggestions, setAiSuggestions] = useState<ServiceSuggestion[] | null>(
    null
  );
  const [aiProvider, setAiProvider] = useState<string | null>(null);

  const feeQuote = useMemo(
    () => quoteBookingFee(city, pin?.lat, pin?.lng),
    [city, pin?.lat, pin?.lng]
  );
  const estimate = useMemo(
    () =>
      estimateJobTotal({
        hourlyRate: guideRate,
        hours,
        bookingFee: feeQuote.amount,
        materials,
      }),
    [guideRate, hours, materials, feeQuote.amount]
  );

  const localSuggestions = useMemo(
    () => suggestServicesFromText(notes, 3),
    [notes]
  );
  const suggestions = aiSuggestions ?? localSuggestions;
  const top = suggestions[0] ?? null;

  // Instant local keywords, then Groq refine (if GROQ_API_KEY on server)
  useEffect(() => {
    const q = notes.trim();
    if (q.length < 8) {
      setAiSuggestions(null);
      setAiProvider(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/ai/suggest-service", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: q }),
          });
          const data = (await res.json()) as {
            suggestions?: ServiceSuggestion[];
            provider?: string;
          };
          if (res.ok && data.suggestions?.length) {
            setAiSuggestions(data.suggestions);
            setAiProvider(data.provider ?? null);
          }
        } catch {
          /* keep local */
        }
      })();
    }, 450);
    return () => window.clearTimeout(handle);
  }, [notes]);

  function onServiceChange(id: ServiceId, suggestedHours?: number) {
    setServiceId(id);
    const s = getService(id);
    if (!s) return;
    if (pricingMode === "daily") {
      setHours(1);
      return;
    }
    setHours(
      suggestedHours != null
        ? Math.min(12, Math.max(s.minHours, suggestedHours))
        : s.minHours
    );
  }

  function applySuggestion() {
    if (!top) return;
    onServiceChange(top.serviceId, top.suggestedHours);
  }

  function setMode(mode: PricingMode) {
    setPricingMode(mode);
    setHours(mode === "daily" ? 1 : service.minHours);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!safetyAck) return;
    setFormError(null);
    if (customer?.banned) {
      setFormError(t("common.bannedAccount"));
      return;
    }
    if (isSimulation() && paidFee?.status !== "paid") {
      setFormError(t("fee.simRequired"));
      return;
    }
    setSubmitting(true);
    let job;
    try {
      job = createBooking({
      serviceId,
      address,
      barangay,
      city,
      notes: notes || t(serviceDescKey(serviceId)),
      estimatedHours: hours,
      pricingMode,
      unitRate: guideRate,
      materialsEstimate: materials,
      lat: pin?.lat,
      lng: pin?.lng,
      feePayment: paidFee ?? undefined,
    });
    } catch (err) {
      setSubmitting(false);
      setFormError(
        err instanceof Error && err.message === "banned"
          ? t("common.bannedAccount")
          : t("common.notFound")
      );
      return;
    }
    router.push(`/customer/job/${job.id}`);
  }

  return (
    <Screen withNav="customer">
      <AppHeader title={t("customer.bookTitle")} backHref="/customer" showLang />
      <form onSubmit={submit} className="space-y-6 px-4 py-5">
        <div className="space-y-2">
          <Label htmlFor="notes">{t("suggest.describeTitle")}</Label>
          <Textarea
            id="notes"
            className="mt-1.5"
            placeholder={t("suggest.placeholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("suggest.hint")}
          </p>

          {top && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t("suggest.bestMatch")}
              </p>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold">
                    {t(serviceNameKey(top.serviceId))}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {top.tipText || t(top.tipKey)}
                    {aiProvider === "groq" ? ` · ${t("suggest.viaGroq")}` : ""}
                  </p>
                  {pricingMode === "hourly" && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("suggest.hoursHint", { n: top.suggestedHours })}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={applySuggestion}
                >
                  {serviceId === top.serviceId
                    ? t("suggest.applied")
                    : t("suggest.useThis")}
                </Button>
              </div>
              {suggestions.length > 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggestions.slice(1).map((s) => (
                    <button
                      key={s.serviceId}
                      type="button"
                      onClick={() =>
                        onServiceChange(s.serviceId, s.suggestedHours)
                      }
                      className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold"
                    >
                      {t(serviceNameKey(s.serviceId))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("customer.service")}
          </Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onServiceChange(s.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center transition",
                  serviceId === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/30",
                  top?.serviceId === s.id &&
                    serviceId !== s.id &&
                    "ring-1 ring-primary/40"
                )}
              >
                <ServiceIcon id={s.id} className="h-4 w-4" />
                <span className="text-[10px] font-medium leading-tight">
                  {t(serviceNameKey(s.id))}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(serviceDescKey(serviceId))}
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <Label>{t("customer.pricingMode")}</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["hourly", "daily"] as PricingMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMode(mode)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    pricingMode === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  )}
                >
                  {mode === "hourly"
                    ? t("customer.modeHourly")
                    : t("customer.modeDaily")}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("customer.pricingHint")}
            </p>
          </div>
          <div>
            <Label htmlFor="hours">
              {pricingMode === "daily"
                ? t("customer.estimatedDays")
                : t("customer.estimatedHours")}
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setHours((h) => Math.max(minUnits, h - 1))}
              >
                −
              </Button>
              <Input
                id="hours"
                type="number"
                min={minUnits}
                max={maxUnits}
                value={hours}
                onChange={(e) =>
                  setHours(
                    Math.max(minUnits, Number(e.target.value) || minUnits)
                  )
                }
                className="text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setHours((h) => Math.min(maxUnits, h + 1))}
              >
                +
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("customer.guideRate", {
                rate: formatPhp(guideRate),
                unit:
                  pricingMode === "daily"
                    ? t("customer.perDay")
                    : t("common.perHour"),
              })}
            </p>
          </div>

          <LocationPicker
            value={{ address, barangay, city, pin }}
            onChange={(loc) => {
              setAddress(loc.address);
              setBarangay(loc.barangay);
              setCity(loc.city);
              setPin(loc.pin);
              if (loc.pin) updateMyLocation(loc.pin.lat, loc.pin.lng);
            }}
          />
          <div>
            <Label htmlFor="materials">{t("customer.materials")}</Label>
            <Input
              id="materials"
              type="number"
              min={0}
              className="mt-1.5"
              value={materials}
              onChange={(e) => setMaterials(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-display text-sm font-semibold">
            {t("customer.estimate")}
          </p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("customer.labor")}</dt>
              <dd>{formatPhp(estimate.labor)}</dd>
            </div>
            {estimate.materials > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t("customer.materialsLine")}
                </dt>
                <dd>{formatPhp(estimate.materials)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("customer.bookingFee")}</dt>
              <dd>
                {formatMoney(feeQuote.amount, feeQuote.market.currency)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <dt>{t("customer.cashTotal")}</dt>
              <dd>
                {formatPhp(estimate.labor + estimate.materials + estimate.tip)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {t("customer.cashHint")}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t("customer.feeRule", {
              percent: feeQuote.percent,
              country: feeQuote.market.name,
              wage: formatMoney(
                feeQuote.market.dailyMinWage,
                feeQuote.market.currency
              ),
              fee: formatMoney(feeQuote.amount, feeQuote.market.currency),
            })}
          </p>
        </div>

        <BookingFeePay
          customerId={customer?.id ?? customerId}
          amount={feeQuote.amount}
          currency={feeQuote.market.currency}
          onPaid={setPaidFee}
        />

        <SafetyBridgeNotice
          variant="book"
          city={city}
          lat={pin?.lat}
          lng={pin?.lng}
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card px-3 py-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--primary)]"
            checked={safetyAck}
            onChange={(e) => setSafetyAck(e.target.checked)}
            required
          />
          <span className="text-xs leading-relaxed text-foreground">
            {t("safety.bookAck", { number: emergency.number || "…" })}
          </span>
        </label>

        {formError && (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-full font-semibold"
          disabled={submitting || !safetyAck}
        >
          {t("customer.findWorker")}
        </Button>
      </form>
    </Screen>
  );
}

export default function BookPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <Screen withNav="customer">
          <AppHeader title={t("customer.bookTitle")} backHref="/customer" />
          <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
        </Screen>
      }
    >
      <BookForm />
    </Suspense>
  );
}
