"use client";

import { LOCALES, useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const { locale, setLocale, t, ready } = useI18n();

  // Placeholder until client locale is ready — prevents SSR/client select mismatch.
  if (!ready) {
    return (
      <div
        className={cn(
          "h-7 min-w-[8.75rem] shrink-0 rounded-full border opacity-40",
          tone === "dark" ? "border-white/30 bg-white/15" : "border-border bg-card",
          className
        )}
        aria-hidden
      />
    );
  }

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium",
        tone === "dark" ? "text-white/90" : "text-muted-foreground",
        className
      )}
    >
      <span className="sr-only">{t("lang.label")}</span>
      <select
        aria-label={t("lang.label")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent",
          tone === "dark"
            ? "border-white/30 bg-white/15 text-white"
            : "border-border bg-card text-foreground"
        )}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} className="text-foreground">
            {t(`lang.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
