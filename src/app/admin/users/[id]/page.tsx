"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminJobRow, AdminProfile } from "@/lib/admin/map";
import { useT } from "@/lib/i18n";

type Detail = {
  profile: AdminProfile;
  booked: AdminJobRow[];
  worked: AdminJobRow[];
  error?: string;
};

export default function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const [data, setData] = useState<Detail | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}`);
    setData((await res.json()) as Detail);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePause() {
    if (!data?.profile) return;
    setActionError(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: !data.profile.paused }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) setActionError(json.error ?? t("common.notFound"));
    void load();
  }

  async function toggleBan() {
    if (!data?.profile) return;
    setActionError(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        banned: !data.profile.banned,
        reason: reason.trim(),
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) setActionError(json.error ?? t("common.notFound"));
    else setReason("");
    void load();
  }

  const profile = data?.profile;
  const kycOnFile = Boolean(profile?.diditSessionId || profile?.diditStatus);

  return (
    <Screen>
      <AppHeader title={t("admin.userDetail")} backHref="/admin" showLang />
      <div className="space-y-4 px-4 py-5">
        {data?.error && <p className="text-sm text-destructive">{data.error}</p>}
        {!profile && !data?.error && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}
        {profile && (
          <>
            <section className="rounded-2xl border border-border bg-card p-4 text-sm">
              <p className="font-display text-lg font-bold">{profile.name}</p>
              <p className="mt-1 text-muted-foreground">
                {profile.role === "worker" ? t("admin.tabWorkers") : t("admin.tabCustomers")}
                {" · "}
                {profile.phone || "—"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {profile.barangay}, {profile.city} · ★ {profile.rating.toFixed(1)} ·{" "}
                {profile.jobsCompleted} {t("customer.jobsDone")}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {profile.verified ? t("common.verified") : t("common.unverified")}
                {profile.paused ? ` · ${t("admin.paused")}` : ""}
                {profile.banned ? ` · ${t("admin.banned")}` : ""}
              </p>
              {profile.banReason && (
                <p className="mt-2 text-xs text-muted-foreground">{profile.banReason}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={profile.paused ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => void togglePause()}
                >
                  {profile.paused ? t("admin.unpause") : t("admin.pause")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={profile.banned ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => void toggleBan()}
                >
                  {profile.banned ? t("admin.unban") : t("admin.ban")}
                </Button>
              </div>
              {!profile.banned && (
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("admin.banReason")}
                  className="mt-3 h-10 rounded-xl"
                />
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {t("admin.banHint")}
              </p>
              {actionError && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {actionError}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 text-sm">
              <p className="font-display font-semibold">{t("admin.kycTitle")}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t("admin.kycBody")}
              </p>
              {kycOnFile ? (
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("admin.diditStatus")}</dt>
                    <dd>{profile.diditStatus || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("admin.diditSession")}</dt>
                    <dd className="max-w-[14rem] truncate">{profile.diditSessionId || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("admin.diditVendor")}</dt>
                    <dd className="max-w-[14rem] truncate">{profile.diditVendorData || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("admin.checkedAt")}</dt>
                    <dd>{profile.diditCheckedAt ? profile.diditCheckedAt.slice(0, 16) : "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm">{t("admin.kycMissing")}</p>
              )}
            </section>

            <JobList title={t("admin.booked")} jobs={data.booked} perspective="customer" />
            <JobList title={t("admin.worked")} jobs={data.worked} perspective="worker" />
          </>
        )}
      </div>
    </Screen>
  );
}

function JobList({
  title,
  jobs,
  perspective,
}: {
  title: string;
  jobs: AdminJobRow[];
  perspective: "customer" | "worker";
}) {
  const t = useT();
  return (
    <section className="space-y-2">
      <p className="font-display text-sm font-semibold">{title}</p>
      {jobs.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("admin.noJobs")}</p>
      )}
      {jobs.map((job) => {
        const otherId = perspective === "customer" ? job.workerId : job.customerId;
        const otherName = perspective === "customer" ? job.workerName : job.customerName;
        return (
          <article key={job.id} className="rounded-2xl border border-border bg-card p-3 text-xs">
            <p className="font-semibold">
              {job.serviceId} · {job.status}
            </p>
            <p className="mt-1 text-muted-foreground">
              {job.address}, {job.barangay}, {job.city}
            </p>
            <p className="mt-1 text-muted-foreground">{job.createdAt.slice(0, 16)}</p>
            {otherId && (
              <Link href={`/admin/users/${otherId}`} className="mt-1 inline-block underline">
                {otherName || otherId.slice(0, 8)}
              </Link>
            )}
          </article>
        );
      })}
    </section>
  );
}
