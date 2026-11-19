"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Wallet, BellRing } from "lucide-react";
import { InstallButton } from "@/components/kagawa/install-button";
import { LanguageSwitcher } from "@/components/kagawa/language-switcher";
import { ServiceIcon } from "@/components/kagawa/service-icon";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";
import { SERVICES, formatPhp } from "@/lib/services";
import { serviceNameKey } from "@/lib/service-label";

export default function LandingPage() {
  const router = useRouter();
  const t = useT();
  const setRole = useKagawa((s) => s.setRole);
  const role = useKagawa((s) => s.role);
  const customerId = useKagawa((s) => s.customerId);
  const activeWorkerId = useKagawa((s) => s.activeWorkerId);
  const isOnboardingComplete = useKagawa((s) => s.isOnboardingComplete);

  function enter(nextRole: "customer" | "worker") {
    setRole(nextRole);
    // Already signed in for this role → go home, don't bounce to login
    if (
      nextRole === "customer" &&
      role === "customer" &&
      isOnboardingComplete(customerId)
    ) {
      router.push("/customer");
      return;
    }
    if (
      nextRole === "worker" &&
      role === "worker" &&
      isOnboardingComplete(activeWorkerId)
    ) {
      router.push("/worker");
      return;
    }
    router.push("/accounts");
  }

  return (
    <main className="min-h-dvh">
      <section className="relative min-h-[100dvh] overflow-hidden text-white">
        <Image
          src="/brand/hero.png"
          alt={t("landing.heroAlt")}
          fill
          priority
          className="object-cover object-[center_20%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(186_70%_10%/0.55)] via-[hsl(186_70%_12%/0.45)] to-[hsl(186_70%_8%/0.92)]" />
        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col px-5 pb-10 pt-6">
          <div className="animate-rise flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/logo.png"
                alt=""
                width={52}
                height={52}
                className="rounded-2xl shadow-lg shadow-black/30"
              />
              <span className="font-display text-3xl font-extrabold tracking-tight drop-shadow-sm sm:text-4xl">
                KaGawa
              </span>
            </div>
            <LanguageSwitcher tone="dark" />
          </div>

          <div className="mt-auto space-y-5 pb-4 pt-24">
            <h1 className="font-display animate-rise-delay text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t("landing.headline")}
            </h1>
            <p className="animate-rise-delay-2 max-w-md text-base leading-relaxed text-white/85">
              {t("landing.sub")}
            </p>
            <div className="animate-rise-delay-2 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => enter("customer")}
                className="h-12 rounded-full bg-[hsl(var(--accent))] px-6 font-semibold text-[hsl(var(--accent-foreground))] hover:bg-[hsl(45_88%_58%)]"
              >
                {t("landing.ctaCustomer")}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => enter("worker")}
                className="h-12 rounded-full border-white/40 bg-white/10 px-6 font-semibold text-white backdrop-blur hover:bg-white/20 hover:text-white"
              >
                {t("landing.ctaWorker")}
              </Button>
            </div>
            <InstallButton tone="dark" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-lg px-5 py-14">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          {t("landing.howEyebrow")}
        </p>
        <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-foreground">
          {t("landing.howTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("landing.howBody")}
        </p>
        <ul className="mt-8 space-y-5">
          {[
            {
              icon: BellRing,
              title: t("landing.signalTitle"),
              body: t("landing.signalBody"),
            },
            {
              icon: Wallet,
              title: t("landing.payTitle"),
              body: t("landing.payBody"),
            },
            {
              icon: ShieldCheck,
              title: t("landing.earnTitle"),
              body: t("landing.earnBody"),
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link
          href="/how-it-works"
          className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t("landing.readModel")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      <section className="border-t border-border/60 bg-[hsl(var(--card)/0.65)] py-14">
        <div className="mx-auto max-w-lg px-5">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {t("landing.servicesTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("landing.servicesSub")}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setRole("customer");
                  if (role === "customer" && isOnboardingComplete(customerId)) {
                    router.push(`/customer/book?service=${s.id}`);
                    return;
                  }
                  router.push(`/accounts?next=/customer/book?service=${s.id}`);
                }}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-border/80 bg-background/80 p-3 text-left transition hover:border-primary/40 hover:bg-secondary"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <ServiceIcon id={s.id} />
                </span>
                <span className="font-display text-sm font-semibold leading-tight">
                  {t(serviceNameKey(s.id))}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t("common.from")} {formatPhp(s.hourlyRate)}
                  {t("common.perHour")}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-lg px-5 py-10 text-center text-xs text-muted-foreground">
        <div className="mb-3 flex justify-center">
          <Image
            src="/brand/logo.png"
            alt="KaGawa"
            width={36}
            height={36}
            className="rounded-xl"
          />
        </div>
        {t("landing.footer")}
      </footer>
    </main>
  );
}
