"use client";

import { useEffect, useState } from "react";
import { Download, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import {
  getInstallEvent,
  isIosPhone,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from "@/lib/pwa-install";
import { requestNotificationPermission } from "@/lib/push";

export function InstallPrompt() {
  const t = useT();
  const [canPrompt, setCanPrompt] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [iosHint, setIosHint] = useState(false);
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem("kagawa-install-dismissed");
    if (dismissed === "1") return;
    if (isStandalone()) return;

    setIosHint(isIosPhone());
    setHidden(false);
    const sync = () => setCanPrompt(Boolean(getInstallEvent()));
    sync();
    return subscribeInstall(sync);
  }, []);

  function dismiss() {
    setHidden(true);
    window.localStorage.setItem("kagawa-install-dismissed", "1");
  }

  async function install() {
    const accepted = await promptInstall();
    if (accepted) dismiss();
  }

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg px-3">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">{t("pwa.title")}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {iosHint
              ? t("pwa.iosHint")
              : canPrompt
                ? t("pwa.body")
                : t("pwa.androidSteps")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!iosHint && canPrompt && (
              <Button size="sm" className="rounded-full" onClick={() => void install()}>
                {t("pwa.install")}
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() =>
                void requestNotificationPermission().then((p) => setPushOn(p === "granted"))
              }
            >
              <Bell className="mr-1 h-3.5 w-3.5" />
              {pushOn ? t("pwa.pushOn") : t("pwa.enablePush")}
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="rounded-full p-1 text-muted-foreground"
          onClick={dismiss}
          aria-label={t("common.cancel")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
