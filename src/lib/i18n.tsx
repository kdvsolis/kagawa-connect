"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "@/messages/en.json";
import fil from "@/messages/fil.json";
import ja from "@/messages/ja.json";
import es from "@/messages/es.json";
import zh from "@/messages/zh.json";
import ko from "@/messages/ko.json";

export const LOCALES = ["en", "fil", "zh", "ko", "ja", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

type Messages = typeof en;
type Dict = Record<string, unknown>;

const CATALOG: Record<Locale, Messages> = { en, fil, zh, ko, ja, es };

function getByPath(obj: Dict, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Dict)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`
  );
}

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  messages: Messages;
  /** False until localStorage locale is applied (avoids hydration mismatch). */
  ready: boolean;
};

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "kagawa-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && LOCALES.includes(saved)) setLocaleState(saved);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang =
      next === "fil" ? "fil" : next === "zh" ? "zh-CN" : next;
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang =
      locale === "fil" ? "fil" : locale === "zh" ? "zh-CN" : locale;
  }, [locale, ready]);

  const messages = CATALOG[locale] ?? en;

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw =
        getByPath(messages as unknown as Dict, key) ??
        getByPath(en as unknown as Dict, key) ??
        key;
      return interpolate(raw, vars);
    },
    [messages]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, messages, ready }),
    [locale, setLocale, t, messages, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
