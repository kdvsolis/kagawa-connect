"use client";

import Link from "next/link";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";

/** Didit callback landing — decision still comes from webhook / status poll. */
export default function VerifyDonePage() {
  const t = useT();
  const role = useKagawa((s) => s.role);
  const home =
    role === "worker"
      ? "/worker/onboarding"
      : role === "customer"
        ? "/customer/onboarding"
        : "/accounts";

  return (
    <Screen>
      <AppHeader title={t("didit.doneTitle")} backHref={home} showLang />
      <div className="space-y-4 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">{t("didit.doneBody")}</p>
        <Button asChild className="rounded-full">
          <Link href={home}>{t("didit.backOnboarding")}</Link>
        </Button>
      </div>
    </Screen>
  );
}
