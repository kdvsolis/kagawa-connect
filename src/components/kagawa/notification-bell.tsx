"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, MessageSquare, Briefcase, CheckCircle2, BellOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import {
  notificationPermission,
  requestNotificationPermission,
  type PushPayload,
} from "@/lib/push";
import { useKagawa } from "@/lib/store";
import type { AppNotificationKind } from "@/lib/types";
import { cn } from "@/lib/utils";

function kindIcon(kind: AppNotificationKind) {
  if (kind === "new_message") return MessageSquare;
  if (kind === "job_accepted" || kind === "job_update") return CheckCircle2;
  return Briefcase;
}

function timeAgo(iso: string, t: (k: string, v?: Record<string, string | number>) => string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return t("notif.justNow");
  if (sec < 3600) return t("notif.minsAgo", { n: Math.floor(sec / 60) });
  if (sec < 86400) return t("notif.hoursAgo", { n: Math.floor(sec / 3600) });
  return t("notif.daysAgo", { n: Math.floor(sec / 86400) });
}

export function NotificationBell() {
  const t = useT();
  const router = useRouter();
  const role = useKagawa((s) => s.role);
  const customerId = useKagawa((s) => s.customerId);
  const activeWorkerId = useKagawa((s) => s.activeWorkerId);
  const notifications = useKagawa((s) => s.notifications);
  const markNotificationRead = useKagawa((s) => s.markNotificationRead);
  const markAllNotificationsRead = useKagawa((s) => s.markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<ReturnType<typeof notificationPermission>>("default");

  const userId = role === "worker" ? activeWorkerId : role === "customer" ? customerId : null;

  const mine = useMemo(() => {
    if (!userId) return [];
    return notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notifications, userId]);

  const unread = mine.filter((n) => !n.read).length;

  useEffect(() => {
    setPerm(notificationPermission());
  }, [open]);

  if (!userId || !role) return null;

  async function enablePush() {
    const next = await requestNotificationPermission();
    setPerm(next);
    if (next === "granted") {
      const demo: PushPayload = {
        title: t("notif.pushEnabledTitle"),
        body: t("notif.pushEnabledBody"),
        tag: "kagawa-push-on",
      };
      const { showBrowserNotification } = await import("@/lib/push");
      void showBrowserNotification(demo);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition hover:bg-primary hover:text-primary-foreground"
          aria-label={t("notif.title")}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="font-display text-base">{t("notif.title")}</SheetTitle>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-primary"
                onClick={() => markAllNotificationsRead(userId)}
              >
                {t("notif.markAll")}
              </button>
            )}
          </div>
        </SheetHeader>

        {perm !== "granted" && perm !== "unsupported" && (
          <div className="border-b border-border bg-secondary/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">{t("notif.pushHint")}</p>
            <Button
              type="button"
              size="sm"
              className="mt-2 h-8 rounded-full"
              onClick={() => void enablePush()}
              disabled={perm === "denied"}
            >
              {perm === "denied" ? (
                <>
                  <BellOff className="mr-1.5 h-3.5 w-3.5" />
                  {t("notif.pushBlocked")}
                </>
              ) : (
                <>
                  <Bell className="mr-1.5 h-3.5 w-3.5" />
                  {t("notif.enablePush")}
                </>
              )}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {mine.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {t("notif.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {mine.map((n) => {
                const Icon = kindIcon(n.kind);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-secondary/50",
                        !n.read && "bg-primary/5"
                      )}
                      onClick={() => {
                        markNotificationRead(n.id);
                        setOpen(false);
                        if (n.href) router.push(n.href);
                      }}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          n.kind === "new_message"
                            ? "bg-sky-100 text-sky-700"
                            : n.kind === "new_job"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-display text-sm font-semibold leading-snug">
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground/80">
                          {timeAgo(n.createdAt, t)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
