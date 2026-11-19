"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Home, Briefcase, UserRound } from "lucide-react";
import { InstallButton } from "@/components/kagawa/install-button";
import { LanguageSwitcher } from "@/components/kagawa/language-switcher";
import { NotificationBell } from "@/components/kagawa/notification-bell";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppHeader({
  title,
  backHref,
  right,
  showLang,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
  showLang?: boolean;
}) {
  const t = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition hover:bg-primary hover:text-primary-foreground"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : (
          <Link href="/" className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl">
            <Image src="/brand/logo.png" alt="KaGawa" fill sizes="32px" className="object-cover" />
          </Link>
        )}
        <h1 className="font-display flex-1 truncate text-base font-semibold tracking-tight">
          {title}
        </h1>
        {showLang && <LanguageSwitcher tone="light" />}
        <InstallButton compact />
        <NotificationBell />
        {right}
      </div>
    </header>
  );
}

export function CustomerNav() {
  const pathname = usePathname();
  const t = useT();
  const items = [
    { href: "/customer", label: t("common.home"), icon: Home },
    { href: "/customer/book", label: t("common.book"), icon: Briefcase },
    { href: "/how-it-works", label: t("common.guide"), icon: UserRound },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {items.map((item) => {
          const active =
            item.href === "/customer"
              ? pathname === "/customer"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function WorkerNav() {
  const pathname = usePathname();
  const t = useT();
  const items = [
    { href: "/worker", label: t("common.jobs"), icon: Briefcase },
    { href: "/how-it-works", label: t("common.guide"), icon: UserRound },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Screen({
  children,
  withNav,
}: {
  children: React.ReactNode;
  withNav?: "customer" | "worker";
}) {
  return (
    <div className={cn("mx-auto min-h-dvh max-w-lg", withNav && "pb-24")}>
      {children}
      {withNav === "customer" && <CustomerNav />}
      {withNav === "worker" && <WorkerNav />}
    </div>
  );
}
