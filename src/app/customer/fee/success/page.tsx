"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

function SuccessBody() {
  const t = useT();
  const params = useSearchParams();
  const ref = params.get("ref");

  return (
    <div className="space-y-4 px-4 py-8 text-center">
      <h2 className="font-display text-xl font-bold">{t("fee.paidProof")}</h2>
      {ref && (
        <p className="text-sm text-muted-foreground">
          {t("fee.reference")}: <span className="font-mono">{ref}</span>
        </p>
      )}
      <p className="text-sm text-muted-foreground">{t("fee.polling")}</p>
      <Button asChild className="rounded-full">
        <Link href="/customer/book">{t("customer.bookTitle")}</Link>
      </Button>
    </div>
  );
}

export default function FeeSuccessPage() {
  const t = useT();
  return (
    <Screen withNav="customer">
      <AppHeader title={t("fee.paid")} backHref="/customer/book" showLang />
      <Suspense fallback={<p className="p-4 text-sm">{t("common.loading")}</p>}>
        <SuccessBody />
      </Suspense>
    </Screen>
  );
}
