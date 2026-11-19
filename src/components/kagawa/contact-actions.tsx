"use client";

import { Lock, MessageSquareText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhPhone, toTelDigits } from "@/lib/phone";
import { useT } from "@/lib/i18n";

export function ContactActions({
  phone,
  name,
  smsBody,
  /** Unlock Call/SMS only after in-app chat (source of truth: parent) */
  unlocked = false,
}: {
  phone?: string | null;
  name?: string;
  /** Prefill for SMS */
  smsBody?: string;
  unlocked?: boolean;
}) {
  const t = useT();
  const digits = phone ? toTelDigits(phone) : null;

  if (!digits || !phone) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {t("contact.unavailable")}
      </p>
    );
  }

  if (!unlocked) {
    return (
      <div className="space-y-2 rounded-xl border border-dashed border-border bg-secondary/40 p-3">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("contact.chatFirst")}</span>
        </p>
        {name ? (
          <p className="text-xs text-muted-foreground">
            {name} · {t("contact.numberHidden")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("contact.numberHidden")}
          </p>
        )}
      </div>
    );
  }

  const smsHref = smsBody
    ? `sms:${digits}?body=${encodeURIComponent(smsBody)}`
    : `sms:${digits}`;

  return (
    <div className="space-y-2">
      <p className="text-sm">
        <span className="text-muted-foreground">{t("contact.number")}: </span>
        <span className="font-semibold tabular-nums">{formatPhPhone(phone)}</span>
        {name ? (
          <span className="text-muted-foreground"> · {name}</span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="rounded-full" asChild>
          <a href={`tel:${digits}`}>
            <Phone className="mr-1.5 h-3.5 w-3.5" />
            {t("contact.call")}
          </a>
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" asChild>
          <a href={smsHref}>
            <MessageSquareText className="mr-1.5 h-3.5 w-3.5" />
            {t("contact.text")}
          </a>
        </Button>
      </div>
    </div>
  );
}
