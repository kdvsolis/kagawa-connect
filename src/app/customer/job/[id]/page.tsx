"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, MapPin, Star } from "lucide-react";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { ContactActions } from "@/components/kagawa/contact-actions";
import { EditJobLocation } from "@/components/kagawa/edit-job-location";
import { JobChat } from "@/components/kagawa/job-chat";
import { LaborPayout } from "@/components/kagawa/labor-payout";
import { JobLocationMap } from "@/components/kagawa/job-location-map";
import { ReportForm } from "@/components/kagawa/report-form";
import { SafetyBridgeNotice } from "@/components/kagawa/safety-bridge-notice";
import { useEmergencyNumber } from "@/components/kagawa/use-emergency-number";
import { JobStatusBadge } from "@/components/kagawa/job-status";
import { ServiceIcon } from "@/components/kagawa/service-icon";
import { Button } from "@/components/ui/button";
import { formatDistance, resolveCoords } from "@/lib/geo";
import { formatMoney, marketForPlace } from "@/lib/markets";
import { isSimulation } from "@/lib/runtime-mode";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";
import { estimateJobTotal, formatPhp } from "@/lib/services";
import { serviceNameKey } from "@/lib/service-label";
import { cn } from "@/lib/utils";

export default function CustomerJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const jobs = useKagawa((s) => s.jobs);
  const workers = useKagawa((s) => s.workers);
  const customerId = useKagawa((s) => s.customerId);
  const cancelJob = useKagawa((s) => s.cancelJob);
  const rateJob = useKagawa((s) => s.rateJob);
  const chooseWorker = useKagawa((s) => s.chooseWorker);
  const workersForJob = useKagawa((s) => s.workersForJob);
  const updateJobStatus = useKagawa((s) => s.updateJobStatus);
  const startJob = useKagawa((s) => s.startJob);
  const messages = useKagawa((s) => s.messages);

  const job = jobs.find((j) => j.id === id);
  const worker = workers.find((w) => w.id === job?.workerId);
  const contactUnlocked = messages.some(
    (m) => m.jobId === id && m.senderId === customerId
  );
  const jobPin = job
    ? resolveCoords(job.lat, job.lng, job.barangay, job.city)
    : null;
  const workerPin = worker
    ? resolveCoords(worker.lat, worker.lng, worker.barangay, worker.city)
    : null;
  const offers = useMemo(
    () => (job?.status === "searching" ? workersForJob(id) : []),
    [job?.status, job?.id, workers, workersForJob, id]
  );
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(5);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const emergency = useEmergencyNumber({
    lat: job?.lat,
    lng: job?.lng,
  });

  if (!job) {
    return (
      <Screen withNav="customer">
        <AppHeader title={t("customer.bookingStatus")} backHref="/customer" />
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t("common.notFound")}</p>
          <Button
            className="mt-4 rounded-full"
            onClick={() => router.push("/customer")}
          >
            {t("common.backHome")}
          </Button>
        </div>
      </Screen>
    );
  }

  const estimate = estimateJobTotal({
    hourlyRate: job.hourlyRate,
    hours: job.estimatedHours,
    bookingFee: job.bookingFee,
    materials: job.materialsEstimate,
    tip: job.tip,
  });
  const rateUnit =
    job.pricingMode === "daily" ? t("customer.perDay") : t("common.perHour");

  function copyCode() {
    if (!job?.bayadCode) return;
    void navigator.clipboard?.writeText(job.bayadCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function pick(workerId: string) {
    setPickingId(workerId);
    const ok = chooseWorker(id, workerId);
    if (!ok) setPickingId(null);
  }

  return (
    <Screen withNav="customer">
      <AppHeader title={t("customer.bookingStatus")} backHref="/customer" showLang />
      <div className="space-y-5 px-4 py-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ServiceIcon id={job.serviceId} className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">
              {t(serviceNameKey(job.serviceId))}
            </h2>
            <div className="mt-1">
              <JobStatusBadge status={job.status} />
            </div>
          </div>
        </div>

        {job.status === "searching" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="font-display font-semibold">
                {t("customer.pickTitle")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("customer.pickBody", {
                  barangay: job.barangay,
                  city: job.city,
                  service: t(serviceNameKey(job.serviceId)),
                })}
              </p>
              <p className="mt-2 text-[11px] font-medium text-primary">
                {t("customer.pickSortHint")}
              </p>
            </div>

            {offers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("customer.pickEmpty")}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {offers.map((offer, index) => (
                  <li key={offer.id}>
                    <button
                      type="button"
                      disabled={pickingId !== null}
                      onClick={() => pick(offer.id)}
                      className={cn(
                        "w-full rounded-2xl border bg-card p-4 text-left transition",
                        "hover:border-primary/50 hover:bg-primary/[0.03]",
                        "disabled:opacity-60",
                        index === 0 && "border-primary/35 ring-1 ring-primary/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-base font-semibold">
                              {offer.name}
                            </p>
                            {index === 0 && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                                {t("customer.cheapest")}
                              </span>
                            )}
                            {offer.priorityOnline && (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {t("customer.priorityBadge")}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            ★ {offer.rating.toFixed(1)} · {offer.jobsCompleted}{" "}
                            {t("customer.jobsDone")} ·{" "}
                            {offer.online
                              ? t("common.online")
                              : t("common.offline")}
                            {offer.verified ? ` · ${t("common.verified")}` : ""}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {offer.barangay}, {offer.city}
                            {offer.distanceKm != null
                              ? ` · ${formatDistance(offer.distanceKm)}`
                              : ""}
                          </p>
                          {offer.bio && (
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                              {offer.bio}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display text-lg font-bold text-primary">
                            {formatPhp(offer.unitRate)}
                            <span className="text-xs font-medium text-muted-foreground">
                              {rateUnit}
                            </span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {t("customer.laborAbout", {
                              amount: formatPhp(offer.laborEstimate),
                            })}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-primary">
                            {pickingId === offer.id
                              ? t("common.loading")
                              : t("customer.pickWorker")}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-3">
              <JobLocationMap
                label={t("maps.jobPin")}
                addressLine={`${job.address} · ${job.barangay}, ${job.city}`}
                target={jobPin}
              />
              <EditJobLocation job={job} />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => cancelJob(job.id)}
            >
              {t("customer.cancelBooking")}
            </Button>
          </div>
        )}

        {worker && job.status !== "searching" && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("customer.worker")}
            </p>
            <div className="mt-2">
              <p className="font-display text-lg font-semibold">{worker.name}</p>
              <p className="text-xs text-muted-foreground">
                ★ {worker.rating.toFixed(1)} · {worker.jobsCompleted} ·{" "}
                {worker.verified ? t("common.verified") : t("common.unverified")}
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {formatPhp(job.hourlyRate)}
                {rateUnit}
              </p>
              {worker.bio && (
                <p className="mt-1 text-sm text-muted-foreground">{worker.bio}</p>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <JobLocationMap
                label={t("maps.jobPin")}
                addressLine={`${job.address} · ${job.barangay}, ${job.city}`}
                target={jobPin}
                from={workerPin}
                targetLabel={t("maps.customerPin")}
                fromLabel={worker.name}
              />
              <EditJobLocation job={job} />
            </div>

            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("contact.workerTitle")}
              </p>
              <ContactActions
                phone={worker.phone}
                name={worker.name}
                unlocked={contactUnlocked}
                smsBody={t("contact.smsPrefillCustomer", {
                  service: t(serviceNameKey(job.serviceId)),
                  address: job.address,
                })}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t("contact.alsoChat")}
              </p>
            </div>

            {job.status === "accepted" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => updateJobStatus(job.id, "en_route")}
                >
                  {t("customer.markEnRoute")}
                </Button>
              </div>
            )}
            {job.status === "en_route" && (
              <div className="mt-4">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => startJob(job.id)}
                >
                  {t("customer.startJob")}
                </Button>
              </div>
            )}
          </div>
        )}

        {(job.status === "in_progress" || job.status === "awaiting_payment") && (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-display font-semibold">{t("report.beforePayTitle")}</p>
            <p className="text-[11px] leading-relaxed">
              {emergency.number
                ? t("report.beforePayBody", { number: emergency.number })
                : null}
            </p>
            {emergency.number && (
            <a
              href={`tel:${emergency.number}`}
              className="inline-flex rounded-full bg-destructive px-3 py-1.5 text-[11px] font-semibold text-white"
            >
              {t("report.callAuthorities", {
                number: emergency.number,
                country: emergency.country,
              })}
            </a>
            )}
            <ReportForm
              role="customer"
              reporterId={customerId}
              reportedId={job.workerId}
              jobId={job.id}
              reportedName={worker?.name}
              city={job.city}
              lat={job.lat}
              lng={job.lng}
            />
          </div>
        )}

        {(job.status === "in_progress" || job.status === "awaiting_payment") &&
          !isSimulation() &&
          marketForPlace(job.city, job.lat, job.lng).currency === "PHP" &&
          worker && (
            <LaborPayout
              jobId={job.id}
              customerId={customerId}
              workerId={worker.id}
              workerName={worker.name}
              destinationNumber={worker.payoutGcash || worker.phone}
              amountPhp={job.hourlyRate * job.estimatedHours + job.materialsEstimate + job.tip}
            />
          )}

        {(job.status === "in_progress" || job.status === "awaiting_payment") &&
          job.bayadCode && (
            <div className="rounded-2xl border-2 border-primary bg-primary p-5 text-primary-foreground">
              <p className="text-xs font-medium uppercase tracking-widest text-primary-foreground/70">
                {t("customer.bayadCode")}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="font-display text-4xl font-extrabold tracking-[0.35em]">
                  {job.bayadCode}
                </p>
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full"
                  onClick={copyCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-primary-foreground/85">
                {t("customer.bayadHint")}
              </p>
              {copied && (
                <p className="mt-2 text-xs text-accent">{t("common.copied")}</p>
              )}
            </div>
          )}

        {job.status === "completed" && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-display font-semibold">{t("customer.rateWorker")}</p>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1"
                  aria-label={`${n} stars`}
                >
                  <Star
                    className={`h-7 w-7 ${
                      n <= rating
                        ? "fill-[hsl(var(--accent))] text-[hsl(var(--accent))]"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Button
              className="mt-3 rounded-full"
              size="sm"
              onClick={() => rateJob(job.id, rating, "customer")}
              disabled={!!job.workerRating}
            >
              {job.workerRating
                ? t("customer.rated", { n: job.workerRating })
                : t("customer.submitRating")}
            </Button>
          </div>
        )}

        {job.status !== "searching" && (
          <div className="rounded-2xl border border-border bg-card/80 p-4 text-sm">
            <p className="font-display font-semibold">{t("customer.details")}</p>
            <p className="mt-2 text-muted-foreground">{job.notes}</p>
            <p className="mt-2">
              {job.address}
              <br />
              {job.barangay}, {job.city}
            </p>
            <dl className="mt-3 space-y-1 border-t border-border pt-3">
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
              {job.bookingFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {t("customer.bookingFee")}
                  </dt>
                  <dd>
                    {formatMoney(
                      job.bookingFee,
                      marketForPlace(job.city, job.lat, job.lng).currency
                    )}
                  </dd>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <dt>{t("customer.cashTotal")}</dt>
                <dd>
                  {formatPhp(estimate.labor + estimate.materials + estimate.tip)}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <JobChat jobId={job.id} status={job.status} myId={customerId} />

        {job.status !== "searching" && (
          <>
            <SafetyBridgeNotice
              variant="job"
              city={job.city}
              lat={job.lat}
              lng={job.lng}
            />
            {job.status !== "in_progress" && job.status !== "awaiting_payment" && (
              <ReportForm
                role="customer"
                reporterId={customerId}
                reportedId={job.workerId}
                jobId={job.id}
                reportedName={worker?.name}
                city={job.city}
                lat={job.lat}
                lng={job.lng}
              />
            )}
          </>
        )}
      </div>
    </Screen>
  );
}
