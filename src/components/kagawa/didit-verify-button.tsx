"use client";

import { useEffect, useRef, useState } from "react";
import { DiditSdk } from "@didit-protocol/sdk-web";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { isSimulation } from "@/lib/runtime-mode";

export type DiditUiStatus =
  | "idle"
  | "starting"
  | "open"
  | "polling"
  | "Approved"
  | "Declined"
  | "In Review"
  | "error";

type Props = {
  /** Stable internal id — becomes Didit vendor_data */
  vendorData: string;
  status: string | null;
  onStatus: (status: string, sessionId?: string) => void;
  className?: string;
};

export function DiditVerifyButton({
  vendorData,
  status,
  onStatus,
  className,
}: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPoll(sessionId: string) {
    stopPoll();
    let ticks = 0;
    pollRef.current = setInterval(async () => {
      ticks += 1;
      if (ticks > 60) {
        stopPoll();
        setBusy(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/verify/status?session_id=${encodeURIComponent(sessionId)}&vendor_data=${encodeURIComponent(vendorData)}`
        );
        const data = (await res.json()) as { status?: string };
        const s = data.status;
        if (
          s === "Approved" ||
          s === "Declined" ||
          s === "In Review" ||
          s === "Expired" ||
          s === "Abandoned"
        ) {
          stopPoll();
          setBusy(false);
          onStatus(s, sessionId);
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
  }

  async function start() {
    setError(null);
    if (!consent) {
      setError(t("didit.needConsent"));
      return;
    }
    if (!vendorData.trim() || vendorData === "pending") {
      setError(t("didit.needIdentity"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorData }),
      });
      const data = (await res.json()) as {
        url?: string;
        session_id?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !data.url || !data.session_id) {
        setError(data.detail || data.error || t("didit.startFailed"));
        setBusy(false);
        return;
      }

      sessionRef.current = data.session_id;
      onStatus("In Progress", data.session_id);

      DiditSdk.shared.onComplete = (result) => {
        // UI hint only — webhook / status poll is source of truth
        if (result.type === "cancelled") {
          stopPoll();
          setBusy(false);
          onStatus("Abandoned", sessionRef.current ?? undefined);
          return;
        }
        if (result.type === "failed") {
          stopPoll();
          setBusy(false);
          setError(result.error?.message || t("didit.flowFailed"));
          return;
        }
        // completed → poll decision
        if (sessionRef.current) startPoll(sessionRef.current);
      };

      await DiditSdk.shared.startVerification({
        url: data.url,
        configuration: {
          showCloseButton: true,
          closeModalOnComplete: true,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("didit.startFailed"));
      setBusy(false);
    }
  }

  const done =
    status === "Approved" ||
    status === "Declined" ||
    status === "In Review";

  if (isSimulation()) {
    return (
      <div className={cn("space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4", className)}>
        <p className="font-display text-sm font-semibold">{t("didit.title")}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("didit.simBody")}</p>
        {status === "Approved" ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {t("didit.approved")}
          </p>
        ) : (
          <Button
            type="button"
            className="rounded-full"
            onClick={() => onStatus("Approved", `sim-${crypto.randomUUID()}`)}
          >
            {t("didit.simCta")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4", className)}>
      <div>
        <p className="font-display text-sm font-semibold">{t("didit.title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("didit.body")}
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={busy || status === "Approved"}
        />
        <span className="text-muted-foreground">{t("didit.consent")}</span>
      </label>

      {status === "Approved" ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {t("didit.approved")}
        </p>
      ) : status === "Declined" ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t("didit.declinedOnly")}
        </p>
      ) : status === "In Review" ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("didit.inReview")}
        </p>
      ) : null}

      {!done && (
        <Button
          type="button"
          className="h-11 w-full rounded-full"
          disabled={busy}
          onClick={() => void start()}
        >
          {busy ? t("didit.working") : t("didit.cta")}
        </Button>
      )}

      {status === "Declined" && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-full"
          disabled={busy}
          onClick={() => void start()}
        >
          {t("didit.retry")}
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
