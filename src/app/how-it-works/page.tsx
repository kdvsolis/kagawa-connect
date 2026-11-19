"use client";

import Link from "next/link";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";

export default function HowItWorksPage() {
  const t = useT();
  const role = useKagawa((s) => s.role);
  const customerId = useKagawa((s) => s.customerId);
  const activeWorkerId = useKagawa((s) => s.activeWorkerId);
  const loggedIn =
    (role === "customer" && Boolean(customerId)) ||
    (role === "worker" && Boolean(activeWorkerId));
  const homeHref = role === "worker" ? "/worker" : "/customer";

  return (
    <Screen>
      <AppHeader title={t("guide.title")} backHref="/" showLang />
      <article className="space-y-8 px-4 py-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-display text-xl font-bold">{t("guide.whatTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("guide.whatBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">{t("guide.twoTitle")}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>{t("guide.twoCustomer")}</li>
            <li>{t("guide.twoWorker")}</li>
          </ul>
          <p className="mt-2 text-muted-foreground">{t("guide.twoPwa")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">{t("guide.payTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("guide.payBody")}</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>{t("guide.pay1")}</li>
            <li>{t("guide.pay2")}</li>
            <li>{t("guide.pay3")}</li>
            <li>{t("guide.pay4")}</li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">{t("guide.safeTitle")}</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>{t("guide.safeCustomer")}</li>
            <li>{t("guide.safeWorker")}</li>
            <li>{t("guide.safeExtra")}</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">{t("guide.earnTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("guide.earnIntro")}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>{t("guide.earnFee")}</li>
            <li>{t("guide.earnBoost")}</li>
            <li>{t("guide.earnCut")}</li>
            <li>{t("guide.earnLater")}</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">
            {t("guide.signalTitle")}
          </h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>{t("guide.signal1")}</li>
            <li>{t("guide.signal2")}</li>
            <li>{t("guide.signal3")}</li>
            <li>{t("guide.signal4")}</li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">
            {t("guide.servicesTitle")}
          </h2>
          <p className="mt-2 text-muted-foreground">{t("guide.servicesBody")}</p>
        </section>

        <p className="text-sm text-muted-foreground">
          <Link href="/terms" className="font-semibold text-primary underline">
            {t("terms.title")}
          </Link>
          {" · "}
          <Link href="/privacy" className="font-semibold text-primary underline">
            {t("privacy.title")}
          </Link>
        </p>

        {loggedIn ? (
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button asChild className="rounded-full">
              <Link href={homeHref}>{t("guide.backToApp")}</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button asChild className="rounded-full">
              <Link href="/accounts">{t("guide.tryCustomer")}</Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                useKagawa.getState().setRole("worker");
                window.location.href = "/accounts";
              }}
            >
              {t("guide.tryWorker")}
            </Button>
          </div>
        )}
      </article>
    </Screen>
  );
}
