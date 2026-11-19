"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildAuthorityNote,
  isCrimeReason,
  type AuthorityJob,
  type AuthorityPerson,
} from "@/lib/admin/authority-note";
import type { AdminProfile } from "@/lib/admin/map";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tab = "reports" | "customer" | "worker";

type ReportCard = {
  id: string;
  reason: string;
  details: string;
  evidenceName?: string | null;
  evidenceDataUrl?: string | null;
  status: string;
  role: string;
  createdAt: string;
  reporter: AuthorityPerson | null;
  reported: AuthorityPerson | null;
  job: AuthorityJob | null;
};

type PagePayload<T> = {
  page: number;
  pageSize: number;
  total: number;
  usingServiceRole?: boolean;
  error?: string;
} & T;

export default function AdminPage() {
  const t = useT();
  const [authed, setAuthed] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("reports");

  useEffect(() => {
    void fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d: { ok?: boolean; configured?: boolean }) => {
        setAuthed(Boolean(d.ok));
        setConfigured(d.configured !== false);
      })
      .catch(() => setAuthed(false));
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? t("admin.badLogin"));
      return;
    }
    setAuthed(true);
    setPassword("");
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
  }

  if (!authed) {
    return (
      <Screen>
        <AppHeader title={t("admin.title")} backHref="/" showLang />
        <form onSubmit={login} className="space-y-4 px-4 py-8">
          <p className="text-sm text-muted-foreground">{t("admin.loginHint")}</p>
          {!configured && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {t("admin.needEnv")}
            </p>
          )}
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("admin.username")}
            className="h-11 rounded-xl"
            autoComplete="username"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("admin.password")}
            className="h-11 rounded-xl"
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full rounded-full">
            {t("admin.signIn")}
          </Button>
        </form>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title={t("admin.title")}
        backHref="/"
        showLang
        right={
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => void logout()}>
            {t("admin.logout")}
          </Button>
        }
      />
      <div className="space-y-4 px-4 py-5">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["reports", t("admin.tabReports")],
              ["customer", t("admin.tabCustomers")],
              ["worker", t("admin.tabWorkers")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-2 py-2 text-[11px] font-semibold",
                tab === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "reports" ? <ReportsPanel /> : <UsersPanel key={tab} role={tab} />}
      </div>
    </Screen>
  );
}

function UsersPanel({ role }: { role: "customer" | "worker" }) {
  const t = useT();
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagePayload<{ users: AdminProfile[] }> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ role, page: String(page) });
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/users?${params}`);
    const json = (await res.json()) as PagePayload<{ users: AdminProfile[] }>;
    setData(json);
    setLoading(false);
  }, [page, q, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {role === "customer" ? t("admin.customersHint") : t("admin.workersHint")}
      </p>
      {data && data.usingServiceRole === false && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
          {t("admin.needServiceRole")}
        </p>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(draftQ.trim());
        }}
      >
        <Input
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder={t("admin.search")}
          className="h-10 rounded-xl"
        />
        <Button type="submit" size="sm" className="rounded-full">
          {t("admin.searchGo")}
        </Button>
      </form>
      {data?.error && <p className="text-sm text-destructive">{data.error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {!loading && (data?.users?.length ?? 0) === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t("admin.noUsers")}
        </p>
      )}
      <ul className="space-y-2">
        {(data?.users ?? []).map((user) => (
          <li key={user.id}>
            <Link
              href={`/admin/users/${user.id}`}
              className="block rounded-2xl border border-border bg-card p-4 text-sm"
            >
              <p className="font-display font-semibold">{user.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {user.phone || "—"} · {user.city || "—"} · ★ {user.rating.toFixed(1)}
                {user.verified ? ` · ${t("common.verified")}` : ` · ${t("common.unverified")}`}
                {user.banned ? ` · ${t("admin.banned")}` : ""}
                {user.paused ? ` · ${t("admin.paused")}` : ""}
              </p>
              <p className="mt-1 text-[11px]">
                {t("admin.jobCount", { n: user.jobCount ?? 0 })}
                {" · "}
                {user.diditStatus || t("admin.kycMissing")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <Pager page={page} pages={pages} onPage={setPage} />
    </section>
  );
}

function ReportsPanel() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagePayload<{ reports: ReportCard[] }> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/reports?page=${page}`);
    setData((await res.json()) as PagePayload<{ reports: ReportCard[] }>);
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load();
  }

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (data?.pageSize ?? 20)));

  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("admin.reportsHint")}</p>
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
        {t("admin.notEmployer")}
      </p>
      {data?.error && <p className="text-sm text-destructive">{data.error}</p>}
      {(data?.reports?.length ?? 0) === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t("admin.noReports")}
        </p>
      )}
      {(data?.reports ?? []).map((report) => {
        const crime = isCrimeReason(report.reason);
        const note = buildAuthorityNote({
          reason: report.reason,
          details: report.details,
          createdAt: report.createdAt,
          reporter: report.reporter,
          reported: report.reported,
          job: report.job,
          evidenceName: report.evidenceName,
        });
        return (
          <article key={report.id} className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display font-semibold">{report.reason}</p>
                <p className="text-[11px] text-muted-foreground">
                  {report.role} · {report.reporter?.name ?? "—"} → {report.reported?.name ?? "—"}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">
                {report.status}
              </span>
            </div>
            <p className="text-muted-foreground">{report.details}</p>
            {report.evidenceDataUrl?.startsWith("data:image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.evidenceDataUrl}
                alt={report.evidenceName || "evidence"}
                className="max-h-40 rounded-xl border border-border object-contain"
              />
            )}
            {report.evidenceName && (
              <p className="text-[11px] text-muted-foreground">{report.evidenceName}</p>
            )}
            <div className="flex flex-wrap gap-2 text-[11px]">
              {report.reporter && (
                <Link className="underline" href={`/admin/users/${report.reporter.id}`}>
                  {report.reporter.name}
                </Link>
              )}
              {report.reported && (
                <Link className="underline" href={`/admin/users/${report.reported.id}`}>
                  {report.reported.name}
                </Link>
              )}
            </div>
            {crime && (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-950">
                <p className="font-semibold">{t("admin.policeFirst")}</p>
                <pre className="whitespace-pre-wrap font-sans">{note}</pre>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    void navigator.clipboard.writeText(note);
                    setCopied(report.id);
                  }}
                >
                  {copied === report.id ? t("admin.copied") : t("admin.copyNote")}
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {["reviewing", "resolved", "dismissed"].map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={report.status === status ? "default" : "outline"}
                  className="rounded-full text-[11px]"
                  onClick={() => void setStatus(report.id, status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </article>
        );
      })}
      <Pager page={page} pages={pages} onPage={setPage} />
    </section>
  );
}

function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  const t = useT();
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {t("admin.prev")}
      </Button>
      <span>
        {page} / {pages}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        {t("admin.next")}
      </Button>
    </div>
  );
}
