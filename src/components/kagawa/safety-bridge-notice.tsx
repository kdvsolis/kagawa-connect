"use client";

import Link from "next/link";
import { Phone, ShieldAlert } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useEmergencyNumber } from "@/components/kagawa/use-emergency-number";
import { cn } from "@/lib/utils";

/** Plain-language marketplace disclaimer plus the local emergency number. */
export function SafetyBridgeNotice({
  variant = "compact",
  className,
  city,
  lat,
  lng,
}: {
  variant?: "compact" | "book" | "job";
  className?: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
}) {
  const t = useT();
  const emergency = useEmergencyNumber({ lat, lng });
  const showEmergency = variant === "book" || variant === "job";
  return (
    <aside
      className={cn(
        "rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-amber-950",
        className
      )}
      role="note"
    >
      <div className="flex gap-2.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="min-w-0 space-y-1.5 text-[11px] leading-relaxed">
          <p className="font-display text-xs font-semibold tracking-tight">
            {t("safety.bridgeTitle")}
          </p>
          <p>{t("safety.bridgeBody")}</p>
          {showEmergency && emergency.ready && emergency.number && (
            <>
              <p>{t("safety.valuables")}</p>
              <p>{t("safety.noSupport", { number: emergency.number })}</p>
              <a
                href={`tel:${emergency.number}`}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-50"
              >
                <Phone className="h-3.5 w-3.5" />
                {t("safety.callNow", {
                  number: emergency.number,
                  country: emergency.country,
                })}
              </a>
              <p>{t("safety.crime", { number: emergency.number })}</p>
            </>
          )}
          <p>
            <Link href="/terms" className="font-semibold underline underline-offset-2">
              {t("safety.rulesLink")}
            </Link>
          </p>
        </div>
      </div>
    </aside>
  );
}
