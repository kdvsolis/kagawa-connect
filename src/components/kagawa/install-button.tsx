"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import {
  getInstallEvent,
  isIosPhone,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

export function InstallButton({
  tone = "light",
  compact = false,
}: {
  tone?: "light" | "dark";
  compact?: boolean;
}) {
  const t = useT();
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const sync = () => {
      setInstalled(isStandalone());
      setCanPrompt(Boolean(getInstallEvent()));
      setIos(isIosPhone());
      setReady(true);
    };
    sync();
    return subscribeInstall(sync);
  }, []);

  if (!ready || installed) return null;

  async function onClick() {
    if (getInstallEvent()) {
      const accepted = await promptInstall();
      if (accepted) setInstalled(true);
      return;
    }
    setSheet(true);
  }

  const label = t("pwa.phoneCta");

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => void onClick()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
          aria-label={label}
        >
          <Download className="h-4 w-4" />
        </button>
      ) : (
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => void onClick()}
          className={cn(
            "h-12 rounded-full px-6 font-semibold",
            tone === "dark"
              ? "border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              : ""
          )}
        >
          <Download className="mr-1 h-4 w-4" />
          {canPrompt ? t("pwa.install") : label}
        </Button>
      )}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-labelledby="pwa-install-title"
            className="w-full max-w-sm rounded-2xl bg-card p-4 text-foreground shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <p id="pwa-install-title" className="font-display text-base font-semibold">
                {t("pwa.title")}
              </p>
              <button
                type="button"
                className="rounded-full p-1 text-muted-foreground"
                onClick={() => setSheet(false)}
                aria-label={t("common.cancel")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {ios ? t("pwa.iosHint") : t("pwa.androidSteps")}
            </p>
            <Button
              type="button"
              className="mt-4 w-full rounded-full"
              onClick={() => setSheet(false)}
            >
              {t("pwa.gotIt")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
