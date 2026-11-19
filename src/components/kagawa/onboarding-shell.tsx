"use client";

import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n";

export function OnboardingShell({
  title,
  step,
  totalSteps,
  stepLabel,
  children,
  backHref = "/accounts",
}: {
  title: string;
  step: number;
  totalSteps: number;
  stepLabel: string;
  children: React.ReactNode;
  backHref?: string;
}) {
  const t = useT();
  const pct = Math.round(((step + 1) / totalSteps) * 100);

  return (
    <Screen>
      <AppHeader title={title} backHref={backHref} showLang />
      <div className="space-y-5 px-4 py-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-primary">
              {t("onboarding.stepOf", { n: step + 1, total: totalSteps })}
            </span>
            <span className="text-muted-foreground">{stepLabel}</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("onboarding.safetyNote")}
          </p>
        </div>
        {children}
      </div>
    </Screen>
  );
}
