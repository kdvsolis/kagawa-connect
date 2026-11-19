"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader, Screen } from "@/components/kagawa/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findDemoAccount } from "@/lib/demo-credentials";
import { onboardingPath } from "@/lib/onboarding";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const role = useKagawa((s) => s.role);
  const customerId = useKagawa((s) => s.customerId);
  const activeWorkerId = useKagawa((s) => s.activeWorkerId);
  const customers = useKagawa((s) => s.customers);
  const workers = useKagawa((s) => s.workers);
  const selectCustomer = useKagawa((s) => s.selectCustomer);
  const selectWorker = useKagawa((s) => s.selectWorker);
  const isOnboardingComplete = useKagawa((s) => s.isOnboardingComplete);
  const resetOnboardingDraft = useKagawa((s) => s.resetOnboardingDraft);
  const refreshFromSupabase = useKagawa((s) => s.refreshFromSupabase);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeCustomer = customers.find((c) => c.id === customerId);
  const activeWorker = workers.find((w) => w.id === activeWorkerId);
  const canContinueCustomer =
    role === "customer" &&
    Boolean(activeCustomer) &&
    isOnboardingComplete(customerId);
  const canContinueWorker =
    role === "worker" &&
    Boolean(activeWorker) &&
    isOnboardingComplete(activeWorkerId);
  const continueName =
    canContinueWorker && activeWorker
      ? activeWorker.name
      : canContinueCustomer && activeCustomer
        ? activeCustomer.name
        : null;
  const continueHref =
    canContinueWorker
      ? next?.startsWith("/worker")
        ? next
        : "/worker"
      : canContinueCustomer
        ? next?.startsWith("/")
          ? next
          : "/customer"
        : null;

  useEffect(() => {
    void refreshFromSupabase();
  }, [refreshFromSupabase]);

  useEffect(() => {
    setError(null);
  }, [role]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const account = findDemoAccount(username, password);
    if (!account) {
      setError(t("accounts.invalidCreds"));
      return;
    }

    if (role === "customer" && account.role !== "customer") {
      setError(t("accounts.wrongRoleCustomer"));
      return;
    }
    if (role === "worker" && account.role !== "worker") {
      setError(t("accounts.wrongRoleWorker"));
      return;
    }

    if (account.role === "customer") {
      selectCustomer(account.id);
      if (!isOnboardingComplete(account.id)) {
        router.push("/customer/onboarding");
        return;
      }
      router.push(next?.startsWith("/") ? next : "/customer");
      return;
    }

    selectWorker(account.id);
    if (!isOnboardingComplete(account.id)) {
      router.push("/worker/onboarding");
      return;
    }
    router.push(next?.startsWith("/worker") ? next : "/worker");
  }

  const onboardingHref =
    role === "worker" ? onboardingPath("worker") : onboardingPath("customer");

  return (
    <Screen>
      <AppHeader title={t("accounts.title")} backHref="/" showLang />
      <div className="space-y-6 px-4 py-5">
        <div>
          <p className="text-sm text-muted-foreground">{t("accounts.subtitle")}</p>
          {role && (
            <p className="mt-1 text-xs font-medium text-primary">
              {role === "worker" ? t("common.worker") : t("common.customer")}
            </p>
          )}
        </div>

        {continueName && continueHref && (
          <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <Button asChild className="h-11 w-full rounded-full text-base">
              <Link href={continueHref}>
                {t("accounts.continueAs", { name: continueName })}
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t("accounts.switchHint")}
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t("accounts.username")}</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("accounts.usernamePlaceholder")}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("accounts.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("accounts.passwordPlaceholder")}
              className="h-11 rounded-xl"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="h-11 w-full rounded-full text-base">
            {t("accounts.signIn")}
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-full"
          asChild
        >
          <Link
            href={onboardingHref}
            onClick={() =>
              resetOnboardingDraft(role === "worker" ? "worker" : "customer")
            }
          >
            {t("accounts.newAccount")}
          </Link>
        </Button>

      </div>
    </Screen>
  );
}

function AccountsFallback() {
  const t = useT();
  return (
    <Screen>
      <AppHeader title={t("accounts.title")} backHref="/" showLang />
      <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
    </Screen>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsFallback />}>
      <LoginForm />
    </Suspense>
  );
}
