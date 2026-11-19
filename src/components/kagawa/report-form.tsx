"use client";

import { FormEvent, useState } from "react";
import { Flag, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { useEmergencyNumber } from "@/components/kagawa/use-emergency-number";
import { compressReportPhoto } from "@/lib/report-evidence";
import {
  CRIME_REPORT_REASONS,
  MIN_REPORT_DETAILS,
  REPORT_REASONS,
  type ReportReason,
} from "@/lib/reports";
import { useKagawa } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReportForm({
  role,
  reporterId,
  reportedId,
  jobId,
  reportedName,
  city,
  lat,
  lng,
}: {
  role: Role;
  reporterId: string;
  reportedId?: string;
  jobId?: string;
  reportedName?: string;
  city?: string;
  lat?: number;
  lng?: number;
}) {
  const t = useT();
  const fileReport = useKagawa((s) => s.fileReport);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("other");
  const [details, setDetails] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const emergency = useEmergencyNumber({ lat, lng });
  const showCall = Boolean(city || (lat != null && lng != null));

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    let result: Awaited<ReturnType<typeof compressReportPhoto>>;
    try {
      result = await compressReportPhoto(file);
    } catch {
      setError(t("report.evidenceType"));
      return;
    }
    if ("error" in result) {
      setPhotoName(null);
      setPhotoUrl(null);
      setError(result.error === "type" ? t("report.evidenceType") : t("report.evidenceSize"));
      return;
    }
    setPhotoName(result.name);
    setPhotoUrl(result.dataUrl);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = details.trim();
    if (text.length < MIN_REPORT_DETAILS) {
      setError(t("report.needDetails"));
      return;
    }
    if (!photoName || !photoUrl) {
      setError(t("report.evidenceRequired"));
      return;
    }
    fileReport({
      reporterId,
      reportedId,
      jobId,
      role,
      reason,
      details: text,
      evidenceName: photoName,
      evidenceDataUrl: photoUrl,
    });
    setDone(true);
    setDetails("");
    setPhotoName(null);
    setPhotoUrl(null);
    setError(null);
    setTimeout(() => {
      setDone(false);
      setOpen(false);
    }, 1600);
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Flag className="mr-1.5 h-3.5 w-3.5" />
        {t("report.open")}
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <p className="font-display text-sm font-semibold">{t("report.title")}</p>
      <p className="text-[11px] text-muted-foreground">
        {reportedName
          ? t("report.about", { name: reportedName })
          : t("report.aboutGeneric")}
      </p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
        <p className="font-semibold">{t("report.authoritiesTitle")}</p>
        <p className="mt-1">{t("report.notEmployer")}</p>
        {emergency.number && (
          <p className="mt-1">{t("report.noHotline", { number: emergency.number })}</p>
        )}
        <p className="mt-1">{t("report.authoritiesBody")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {REPORT_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              reason === r
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {t(`report.reason.${r}`)}
          </button>
        ))}
      </div>
      {showCall && emergency.number && (
        <a
          href={`tel:${emergency.number}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          <Phone className="h-3.5 w-3.5" />
          {t("report.callAuthorities", {
            number: emergency.number,
            country: emergency.country,
          })}
        </a>
      )}
      {CRIME_REPORT_REASONS.includes(reason) && (
        <p className="text-[11px] font-medium leading-relaxed text-destructive">
          {t("report.crimeFirst")}
        </p>
      )}
      <Textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder={t("report.detailsPlaceholder")}
        className="min-h-[80px] rounded-xl text-sm"
        required
        minLength={MIN_REPORT_DETAILS}
      />
      <label className="block text-[11px]">
        <span className="font-semibold">{t("report.evidenceLabel")}</span>
        <span className="mt-1 block text-muted-foreground">{t("report.evidenceHint")}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="mt-2 block w-full text-xs"
          onChange={(e) => {
            void onPickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {photoName && <span className="mt-1 block">{photoName}</span>}
      </label>
      {error && (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="rounded-full" disabled={done}>
          {done ? t("report.sent") : t("report.submit")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => setOpen(false)}
        >
          {t("common.cancel")}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">{t("report.toAdmin")}</p>
      <p className="text-[10px] text-muted-foreground">{t("report.idHelp")}</p>
    </form>
  );
}
