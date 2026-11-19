"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, MapPin, Navigation, Power, Star, Wallet } from "lucide-react";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { ContactActions } from "@/components/kagawa/contact-actions";
import { JobChat } from "@/components/kagawa/job-chat";
import { JobLocationMap } from "@/components/kagawa/job-location-map";
import { ReportForm } from "@/components/kagawa/report-form";
import { SafetyBridgeNotice } from "@/components/kagawa/safety-bridge-notice";
import { JobStatusBadge } from "@/components/kagawa/job-status";
import { ServiceIcon } from "@/components/kagawa/service-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistance, readBrowserLocation, resolveCoords } from "@/lib/geo";
import { useT } from "@/lib/i18n";
import { isValidPhPhone, normalizePhone } from "@/lib/onboarding";
import { useKagawa } from "@/lib/store";
import { SETTINGS, formatPhp } from "@/lib/services";
import { serviceNameKey } from "@/lib/service-label";
import { cn } from "@/lib/utils";

export default function WorkerHome() {
  const t = useT();
  const activeWorkerId = useKagawa((s) => s.activeWorkerId);
  const workers = useKagawa((s) => s.workers);
  const jobs = useKagawa((s) => s.jobs);
  const customers = useKagawa((s) => s.customers);
  const worker =
    workers.find((w) => w.id === activeWorkerId) ?? workers[0];
  const openJobsForWorker = useKagawa((s) => s.openJobsForWorker);
  const openJobs = openJobsForWorker();
  const myJobs = jobs.filter((j) => j.workerId === activeWorkerId);
  const toggleOnline = useKagawa((s) => s.toggleWorkerOnline);
  const setWorkerPriority = useKagawa((s) => s.setWorkerPriority);
  const updateMyLocation = useKagawa((s) => s.updateMyLocation);
  const setWorkerRates = useKagawa((s) => s.setWorkerRates);
  const setWorkerContactPhone = useKagawa((s) => s.setWorkerContactPhone);
  const acceptJob = useKagawa((s) => s.acceptJob);
  const updateJobStatus = useKagawa((s) => s.updateJobStatus);
  const startJob = useKagawa((s) => s.startJob);
  const completeJobWithCode = useKagawa((s) => s.completeJobWithCode);
  const rateJob = useKagawa((s) => s.rateJob);
  const workerEarningsPreview = useKagawa((s) => s.workerEarningsPreview);
  const refreshFromSupabase = useKagawa((s) => s.refreshFromSupabase);
  const messages = useKagawa((s) => s.messages);

  const [codeByJob, setCodeByJob] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState(false);
  const [locLabel, setLocLabel] = useState<string | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [rateByJob, setRateByJob] = useState<Record<string, number>>({});
  const [editHourly, setEditHourly] = useState("");
  const [editDay, setEditDay] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [ratesSaved, setRatesSaved] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const prevOpen = useRef(0);
  const online = worker?.online ?? false;
  const priority = worker?.priorityOnline ?? false;

  useEffect(() => {
    if (!worker) return;
    setEditHourly(String(worker.hourlyRate ?? ""));
    setEditDay(worker.dayRate ? String(worker.dayRate) : "");
    setEditPhone(worker.phone ?? "");
  }, [worker?.id, worker?.hourlyRate, worker?.dayRate, worker?.phone]);

  useEffect(() => {
    void refreshFromSupabase();
    const id = setInterval(() => void refreshFromSupabase(), 8000);
    return () => clearInterval(id);
  }, [refreshFromSupabase]);

  useEffect(() => {
    if (!online) {
      prevOpen.current = openJobs.length;
      return;
    }
    if (openJobs.length > prevOpen.current) {
      setFlash(true);
      try {
        navigator.vibrate?.([120, 60, 120]);
      } catch {
        /* ignore */
      }
      const timer = setTimeout(() => setFlash(false), 2500);
      prevOpen.current = openJobs.length;
      return () => clearTimeout(timer);
    }
    prevOpen.current = openJobs.length;
  }, [openJobs.length, online]);

  const active = myJobs.find((j) =>
    ["accepted", "en_route", "in_progress", "awaiting_payment"].includes(j.status)
  );
  const completedToday = myJobs.filter((j) => j.status === "completed");
  const needsCustomerRating = completedToday.filter((j) => !j.customerRating);

  async function shareGps() {
    setLocBusy(true);
    try {
      const loc = await readBrowserLocation();
      updateMyLocation(loc.lat, loc.lng);
      setLocLabel(
        t("gps.pinned", {
          lat: loc.lat.toFixed(4),
          lng: loc.lng.toFixed(4),
        })
      );
    } catch {
      setLocLabel(t("gps.denied"));
    } finally {
      setLocBusy(false);
    }
  }

  function submitCode(jobId: string) {
    const result = completeJobWithCode(jobId, codeByJob[jobId] ?? "");
    if (!result.ok) {
      setErrors((e) => ({ ...e, [jobId]: result.error ?? "Error" }));
    } else {
      setErrors((e) => {
        const next = { ...e };
        delete next[jobId];
        return next;
      });
    }
  }

  if (!worker) {
    return (
      <Screen withNav="worker">
        <AppHeader title={t("worker.title")} showLang />
        <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
      </Screen>
    );
  }

  return (
    <Screen withNav="worker">
      <AppHeader
        title={t("worker.title")}
        showLang
        right={
          <Link
            href="/accounts"
            className="rounded-full bg-accent/40 px-2.5 py-1 text-[11px] font-semibold text-accent-foreground"
          >
            {t("common.switchAccount")}
          </Link>
        }
      />

      <div className="space-y-5 px-4 py-5">
        <div
          className={cn(
            "rounded-2xl border p-4 transition",
            online
              ? "border-emerald-300 bg-emerald-50"
              : "border-border bg-card",
            flash && "animate-pulse-soft ring-2 ring-accent"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold">{worker.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {worker.barangay}, {worker.city}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ★ {worker.rating.toFixed(1)} ·{" "}
                {t("worker.launchBoost", {
                  n: worker.launchJobsRemaining ?? 0,
                })}
              </p>
            </div>
            <Button
              onClick={toggleOnline}
              className={cn(
                "h-12 rounded-full px-5 font-semibold",
                online
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              )}
            >
              <Power className="mr-1.5 h-4 w-4" />
              {online ? t("common.online") : t("common.offline")}
            </Button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t("worker.onlineHint")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={locBusy}
              onClick={() => void shareGps()}
            >
              <Navigation className="mr-1 h-3.5 w-3.5" />
              {t("gps.shareLocation")}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {locLabel ??
                (worker.lat != null
                  ? t("gps.active")
                  : t("gps.neededForNearby"))}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setWorkerPriority(!priority)}
            className={cn(
              "mt-3 flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
              priority
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-background/60"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
                priority ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full bg-white shadow transition",
                  priority ? "translate-x-4" : "translate-x-0"
                )}
              />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {t("worker.priorityTitle")}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                {t("worker.priorityHint", { sec: SETTINGS.priorityWindowSec })}
              </span>
            </span>
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="font-display font-semibold">{t("worker.myRates")}</p>
          <p className="text-[11px] text-muted-foreground">
            {t("worker.myRatesHint")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium" htmlFor="whr">
                {t("worker.hourlyRate")}
              </label>
              <Input
                id="whr"
                inputMode="numeric"
                className="mt-1 h-10 rounded-xl"
                value={editHourly}
                onChange={(e) => setEditHourly(e.target.value.replace(/\D/g, ""))}
                placeholder="350"
              />
            </div>
            <div>
              <label className="text-xs font-medium" htmlFor="wdr">
                {t("worker.dayRate")}
              </label>
              <Input
                id="wdr"
                inputMode="numeric"
                className="mt-1 h-10 rounded-xl"
                value={editDay}
                onChange={(e) => setEditDay(e.target.value.replace(/\D/g, ""))}
                placeholder="2500"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={() => {
              const hr = Number(editHourly);
              if (!hr || hr < 50) return;
              const dr = editDay ? Number(editDay) : null;
              setWorkerRates(hr, dr);
              setRatesSaved(true);
              setTimeout(() => setRatesSaved(false), 2000);
            }}
          >
            {ratesSaved ? t("worker.ratesSaved") : t("worker.saveRates")}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="font-display font-semibold">{t("worker.myContact")}</p>
          <p className="text-[11px] text-muted-foreground">
            {t("worker.myContactHint")}
          </p>
          <div>
            <label className="text-xs font-medium" htmlFor="wphone">
              {t("onboarding.phone")}
            </label>
            <Input
              id="wphone"
              inputMode="tel"
              className={cn(
                "mt-1 h-10 rounded-xl",
                phoneError && "border-destructive"
              )}
              value={editPhone}
              onChange={(e) => {
                setEditPhone(e.target.value);
                setPhoneError(false);
              }}
              placeholder="0917 123 4567"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={() => {
              if (!isValidPhPhone(editPhone)) {
                setPhoneError(true);
                return;
              }
              setWorkerContactPhone(normalizePhone(editPhone));
              setPhoneSaved(true);
              setTimeout(() => setPhoneSaved(false), 2000);
            }}
          >
            {phoneSaved ? t("worker.contactSaved") : t("worker.saveContact")}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Bell className="h-3 w-3" /> {t("worker.openNearby")}
            </p>
            <p className="font-display mt-1 text-2xl font-bold">
              {online ? openJobs.length : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Wallet className="h-3 w-3" /> {t("worker.doneSession")}
            </p>
            <p className="font-display mt-1 text-2xl font-bold">
              {completedToday.length}
            </p>
          </div>
        </div>

        {!online && (
          <p className="rounded-xl bg-secondary/80 px-3 py-2 text-sm text-secondary-foreground">
            {t("worker.offlineMsg")}
          </p>
        )}

        {online && (
          <section>
            <h3 className="font-display text-lg font-semibold">
              {t("worker.incoming")}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("gps.nearbyRadius")}
            </p>
            {openJobs.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("worker.incomingEmpty", { city: worker.city })}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {openJobs.map((job) => {
                  const labor = job.hourlyRate * job.estimatedHours;
                  return (
                    <li
                      key={job.id}
                      className="rounded-2xl border border-accent/50 bg-accent/10 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                          <ServiceIcon id={job.serviceId} />
                        </span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-display font-semibold">
                              {t(serviceNameKey(job.serviceId))}
                            </p>
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              {formatDistance(job.distanceKm)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {job.barangay}, {job.city} · ~{job.estimatedHours}{" "}
                            {t("common.hours")}
                          </p>
                          <p className="mt-1 text-sm">{job.notes}</p>
                          <p className="mt-2 text-sm font-semibold text-primary">
                            {formatPhp(labor)}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="mt-3 w-full rounded-full font-semibold"
                        onClick={() => acceptJob(job.id)}
                      >
                        {t("worker.accept")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {active && (
          <section className="space-y-3">
            <h3 className="font-display text-lg font-semibold">
              {t("worker.activeJob")}
            </h3>
            <div className="rounded-2xl border border-primary/30 bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-semibold">
                  {t(serviceNameKey(active.serviceId))}
                </p>
                <JobStatusBadge status={active.status} />
              </div>
              <p className="mt-2 text-sm">{active.notes}</p>

              {(() => {
                const earn = workerEarningsPreview(active);
                const jobPin = resolveCoords(
                  active.lat,
                  active.lng,
                  active.barangay,
                  active.city
                );
                const mePin = worker
                  ? resolveCoords(
                      worker.lat,
                      worker.lng,
                      worker.barangay,
                      worker.city
                    )
                  : null;
                return (
                  <>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t("worker.netEstimate", { net: formatPhp(earn.net) })}
                      {earn.launchBoost
                        ? ` ${t("worker.boostActive")}`
                        : ` ${t("worker.platformCut", {
                            pct: SETTINGS.workerPlatformPercent,
                          })}`}
                    </p>
                    <div className="mt-3">
                      <JobLocationMap
                        label={t("maps.customerPin")}
                        addressLine={`${active.address} · ${active.barangay}, ${active.city}`}
                        target={jobPin}
                        from={mePin}
                        targetLabel={t("maps.customerPin")}
                        fromLabel={t("maps.youAreHere")}
                      />
                    </div>
                  </>
                );
              })()}

              {(() => {
                const customer = customers.find((c) => c.id === active.customerId);
                const unlocked = messages.some(
                  (m) =>
                    m.jobId === active.id && m.senderId === activeWorkerId
                );
                return (
                  <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("contact.customerTitle")}
                    </p>
                    <ContactActions
                      phone={customer?.phone}
                      name={customer?.name}
                      unlocked={unlocked}
                      smsBody={t("contact.smsPrefillWorker", {
                        service: t(serviceNameKey(active.serviceId)),
                      })}
                    />
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {t("contact.alsoChat")}
                    </p>
                  </div>
                );
              })()}

              <div className="mt-4 flex flex-wrap gap-2">
                {active.status === "accepted" && (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => updateJobStatus(active.id, "en_route")}
                  >
                    {t("worker.imOnTheWay")}
                  </Button>
                )}
                {active.status === "en_route" && (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => startJob(active.id)}
                  >
                    {t("worker.startArrived")}
                  </Button>
                )}
              </div>

              {(active.status === "in_progress" ||
                active.status === "awaiting_payment") && (
                <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-3">
                  <p className="text-sm font-medium">{t("worker.completeHint")}</p>
                  <div className="mt-2 flex gap-2">
                    <Input
                      inputMode="numeric"
                      maxLength={4}
                      placeholder={t("worker.codePlaceholder")}
                      value={codeByJob[active.id] ?? ""}
                      onChange={(e) =>
                        setCodeByJob((c) => ({
                          ...c,
                          [active.id]: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4),
                        }))
                      }
                      className="font-display tracking-[0.3em]"
                    />
                    <Button
                      className="rounded-full"
                      onClick={() => submitCode(active.id)}
                    >
                      {t("worker.complete")}
                    </Button>
                  </div>
                  {errors[active.id] && (
                    <p className="mt-2 text-xs text-destructive">
                      {errors[active.id]}
                    </p>
                  )}
                </div>
              )}
            </div>

            <JobChat
              jobId={active.id}
              status={active.status}
              myId={activeWorkerId}
            />

            <SafetyBridgeNotice
              variant="job"
              city={active.city}
              lat={active.lat}
              lng={active.lng}
            />

            <ReportForm
              role="worker"
              reporterId={activeWorkerId}
              reportedId={active.customerId}
              jobId={active.id}
              reportedName={
                customers.find((c) => c.id === active.customerId)?.name
              }
              city={active.city}
              lat={active.lat}
              lng={active.lng}
            />
          </section>
        )}

        {needsCustomerRating.length > 0 && (
          <section>
            <h3 className="font-display text-lg font-semibold">
              {t("worker.rateCustomers")}
            </h3>
            <ul className="mt-3 space-y-3">
              {needsCustomerRating.map((j) => {
                const customer = customers.find((c) => c.id === j.customerId);
                const stars = rateByJob[j.id] ?? 5;
                return (
                  <li
                    key={j.id}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <p className="font-display font-semibold">
                      {customer?.name ?? t("common.customer")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(serviceNameKey(j.serviceId))}
                    </p>
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setRateByJob((r) => ({ ...r, [j.id]: n }))
                          }
                          className="p-1"
                          aria-label={`${n} stars`}
                        >
                          <Star
                            className={`h-6 w-6 ${
                              n <= stars
                                ? "fill-[hsl(var(--accent))] text-[hsl(var(--accent))]"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 rounded-full"
                      onClick={() => rateJob(j.id, stars, "worker")}
                    >
                      {t("worker.submitCustomerRating")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {myJobs.length > 0 && (
          <section>
            <h3 className="font-display text-lg font-semibold">
              {t("worker.myJobs")}
            </h3>
            <ul className="mt-2 space-y-2">
              {myJobs.slice(0, 8).map((j) => (
                <li
                  key={j.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {t(serviceNameKey(j.serviceId))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatPhp(j.hourlyRate * j.estimatedHours)}
                      {j.customerRating
                        ? ` · ★${j.customerRating} ${t("worker.youRated")}`
                        : ""}
                    </p>
                  </div>
                  <JobStatusBadge status={j.status} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {jobs.some((j) => j.status === "searching") && !online && (
          <p className="text-xs text-amber-800">{t("worker.searchingHint")}</p>
        )}
      </div>
    </Screen>
  );
}
