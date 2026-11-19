"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tab = "customer" | "worker" | "shared";

export default function TermsPage() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("shared");

  const customerRules = [
    t("terms.c1"),
    t("terms.c2"),
    t("terms.c3"),
    t("terms.c4"),
    t("terms.c5"),
    t("terms.c6"),
    t("terms.c7"),
    t("terms.c8"),
    t("terms.c9"),
  ];
  const workerRules = [
    t("terms.w1"),
    t("terms.w2"),
    t("terms.w3"),
    t("terms.w4"),
    t("terms.w5"),
    t("terms.w6"),
    t("terms.w7"),
    t("terms.w8"),
  ];
  const sharedRules = [
    t("terms.s1"),
    t("terms.s2"),
    t("terms.s3"),
    t("terms.s4"),
    t("terms.s5"),
    t("terms.s6"),
    t("terms.s7"),
    t("terms.s8"),
    t("terms.s9"),
  ];

  const rules =
    tab === "customer"
      ? customerRules
      : tab === "worker"
        ? workerRules
        : sharedRules;

  return (
    <Screen>
      <AppHeader title={t("terms.title")} backHref="/" showLang />
      <div className="space-y-5 px-4 py-5">
        <div>
          <p className="font-display text-lg font-bold">{t("terms.headline")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("terms.sub")}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("terms.updated")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["shared", t("terms.tabShared")],
              ["customer", t("terms.tabCustomer")],
              ["worker", t("terms.tabWorker")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-2 py-2 text-[11px] font-semibold transition",
                tab === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <ol className="space-y-3">
          {rules.map((rule, i) => (
            <li
              key={`${tab}-${i}`}
              className="flex gap-3 rounded-2xl border border-border bg-card px-3 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed">{rule}</p>
            </li>
          ))}
        </ol>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("terms.footer")}{" "}
          <Link href="/privacy" className="font-semibold text-primary underline">
            {t("terms.privacyLink")}
          </Link>
        </p>
      </div>
    </Screen>
  );
}
