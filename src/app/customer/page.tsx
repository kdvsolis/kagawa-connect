"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, MapPin, Plus } from "lucide-react";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { ServiceIcon } from "@/components/kagawa/service-icon";
import { JobStatusBadge } from "@/components/kagawa/job-status";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";
import { SERVICES, formatPhp } from "@/lib/services";
import { serviceNameKey } from "@/lib/service-label";

export default function CustomerHome() {
  const t = useT();
  const router = useRouter();
  const customerId = useKagawa((s) => s.customerId);
  const customers = useKagawa((s) => s.customers);
  const allJobs = useKagawa((s) => s.jobs);
  const customer =
    customers.find((c) => c.id === customerId) ?? customers[0];
  const jobs = allJobs.filter((j) => j.customerId === customerId);
  const active = jobs.find(
    (j) => !["completed", "cancelled"].includes(j.status)
  );
  const featured = SERVICES.slice(0, 6);

  if (!customer) {
    return (
      <Screen withNav="customer">
        <AppHeader title="KaGawa" showLang />
        <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
      </Screen>
    );
  }

  return (
    <Screen withNav="customer">
      <AppHeader
        title="KaGawa"
        showLang
        right={
          <Link
            href="/accounts"
            className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
          >
            {t("common.switchAccount")}
          </Link>
        }
      />
      <div className="space-y-6 px-4 py-5">
        <div className="animate-rise">
          <p className="text-sm text-muted-foreground">{t("customer.hello")}</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {customer.name}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {customer.barangay}, {customer.city}
          </p>
        </div>

        {active ? (
          <button
            type="button"
            onClick={() => router.push(`/customer/job/${active.id}`)}
            className="animate-rise-delay w-full rounded-2xl border border-primary/25 bg-primary p-4 text-left text-primary-foreground shadow-md shadow-primary/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-primary-foreground/75">
                  {t("customer.activeBooking")}
                </p>
                <p className="font-display mt-1 text-lg font-semibold">
                  {t(serviceNameKey(active.serviceId))}
                </p>
              </div>
              <JobStatusBadge
                status={active.status}
                className="border-white/20 bg-white/15 text-white"
              />
            </div>
            <p className="mt-3 flex items-center text-sm text-primary-foreground/85">
              {t("customer.viewStatus")}
              <ChevronRight className="h-4 w-4" />
            </p>
          </button>
        ) : (
          <div className="animate-rise-delay rounded-2xl border border-dashed border-border bg-card/60 p-4">
            <p className="font-display font-semibold">{t("customer.noActive")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("customer.noActiveBody")}
            </p>
            <Button asChild className="mt-3 rounded-full" size="sm">
              <Link href="/customer/book">
                <Plus className="mr-1 h-4 w-4" />
                {t("customer.bookNow")}
              </Link>
            </Button>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-end justify-between">
            <h3 className="font-display text-lg font-semibold">
              {t("customer.quickBook")}
            </h3>
            <Link
              href="/customer/book"
              className="text-xs font-semibold text-primary"
            >
              {t("customer.all")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.map((s) => (
              <Link
                key={s.id}
                href={`/customer/book?service=${s.id}`}
                className="rounded-2xl border border-border/80 bg-card p-3 transition hover:border-primary/35 hover:bg-secondary/60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ServiceIcon id={s.id} />
                </span>
                <p className="font-display mt-2 text-sm font-semibold leading-tight">
                  {t(serviceNameKey(s.id))}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatPhp(s.hourlyRate)}
                  {t("common.perHour")}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {jobs.length > 0 && (
          <div>
            <h3 className="font-display mb-3 text-lg font-semibold">
              {t("customer.history")}
            </h3>
            <ul className="space-y-2">
              {jobs.slice(0, 5).map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/customer/job/${j.id}`}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card/80 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {t(serviceNameKey(j.serviceId))}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(j.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <JobStatusBadge status={j.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Screen>
  );
}
