"use client";

import Link from "next/link";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { useT } from "@/lib/i18n";

export default function PrivacyPage() {
  const t = useT();
  const points = [
    t("privacy.p1"),
    t("privacy.p2"),
    t("privacy.p3"),
    t("privacy.p4"),
    t("privacy.p5"),
    t("privacy.p6"),
  ];

  return (
    <Screen>
      <AppHeader title={t("privacy.title")} backHref="/terms" showLang />
      <div className="space-y-5 px-4 py-5">
        <div>
          <p className="font-display text-lg font-bold">{t("privacy.headline")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("privacy.sub")}</p>
        </div>
        <ol className="space-y-3">
          {points.map((p, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-2xl border border-border bg-card px-3 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/40 text-xs font-bold">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed">{p}</p>
            </li>
          ))}
        </ol>
        <Link href="/terms" className="text-sm font-semibold text-primary underline">
          {t("privacy.backTerms")}
        </Link>
      </div>
    </Screen>
  );
}
