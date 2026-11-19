"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DiditVerifyButton } from "@/components/kagawa/didit-verify-button";
import { OnboardingShell } from "@/components/kagawa/onboarding-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CUSTOMER_STEPS,
  validateCustomerStep,
} from "@/lib/onboarding";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";

const STEP_KEYS = [
  "onboarding.customer.stepIdentity",
  "onboarding.customer.stepHome",
  "onboarding.customer.stepDocs",
  "onboarding.customer.stepSafety",
] as const;

export default function CustomerOnboardingPage() {
  const t = useT();
  const router = useRouter();
  const draft = useKagawa((s) => s.customerOnboarding);
  const patch = useKagawa((s) => s.patchCustomerOnboarding);
  const complete = useKagawa((s) => s.completeCustomerOnboarding);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const step = Math.min(draft.step, CUSTOMER_STEPS - 1);

  useEffect(() => {
    if (!draft.diditVendorKey) {
      patch({ diditVendorKey: `cust-${crypto.randomUUID()}` });
    }
  }, [draft.diditVendorKey, patch]);

  function fail(field: string | null) {
    if (!field) {
      setErrorKey(null);
      return true;
    }
    setErrorKey(field);
    return false;
  }

  function next() {
    const bad = validateCustomerStep(draft, step);
    if (!fail(bad)) return;
    if (step >= CUSTOMER_STEPS - 1) {
      complete();
      router.push("/customer");
      return;
    }
    patch({ step: step + 1 });
  }

  function back() {
    setErrorKey(null);
    if (step <= 0) {
      router.push("/accounts");
      return;
    }
    patch({ step: step - 1 });
  }

  return (
    <OnboardingShell
      title={t("onboarding.customer.title")}
      step={step}
      totalSteps={CUSTOMER_STEPS}
      stepLabel={t(STEP_KEYS[step])}
    >
      {step === 0 && (
        <div className="animate-rise space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("onboarding.customer.identityBody")}
          </p>
          <Field
            id="fullName"
            label={t("onboarding.fullName")}
            value={draft.fullName}
            onChange={(v) => patch({ fullName: v })}
            error={errorKey === "fullName"}
          />
          <Field
            id="phone"
            label={t("onboarding.phone")}
            value={draft.phone}
            onChange={(v) => patch({ phone: v })}
            placeholder="09XXXXXXXXX"
            inputMode="tel"
            error={errorKey === "phone"}
            hint={t("onboarding.phoneHint")}
          />
          <Field
            id="email"
            label={t("onboarding.email")}
            value={draft.email}
            onChange={(v) => patch({ email: v })}
            type="email"
            error={errorKey === "email"}
          />
          <Field
            id="birthdate"
            label={t("onboarding.birthdate")}
            value={draft.birthdate}
            onChange={(v) => patch({ birthdate: v })}
            type="date"
            error={errorKey === "birthdate"}
          />
        </div>
      )}

      {step === 1 && (
        <div className="animate-rise space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("onboarding.customer.homeBody")}
          </p>
          <Field
            id="address"
            label={t("onboarding.address")}
            value={draft.address}
            onChange={(v) => patch({ address: v })}
            error={errorKey === "address"}
          />
          <Field
            id="barangay"
            label={t("onboarding.barangay")}
            value={draft.barangay}
            onChange={(v) => patch({ barangay: v })}
            error={errorKey === "barangay"}
          />
          <Field
            id="city"
            label={t("onboarding.city")}
            value={draft.city}
            onChange={(v) => patch({ city: v })}
            error={errorKey === "city"}
          />
        </div>
      )}

      {step === 2 && (
        <div className="animate-rise space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("onboarding.customer.docsBody")}
          </p>
          <DiditVerifyButton
            vendorData={draft.diditVendorKey || "pending"}
            status={draft.diditStatus}
            onStatus={(status, sessionId) =>
              patch({
                diditStatus: status,
                diditSessionId: sessionId ?? draft.diditSessionId,
              })
            }
          />
          {errorKey === "didit" && (
            <p className="text-sm text-destructive">{t("didit.needVerify")}</p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="animate-rise space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("onboarding.customer.safetyBody")}
          </p>
          <Field
            id="emergencyName"
            label={t("onboarding.emergencyName")}
            value={draft.emergencyName}
            onChange={(v) => patch({ emergencyName: v })}
            error={errorKey === "emergencyName"}
          />
          <Field
            id="emergencyPhone"
            label={t("onboarding.emergencyPhone")}
            value={draft.emergencyPhone}
            onChange={(v) => patch({ emergencyPhone: v })}
            placeholder="09XXXXXXXXX"
            inputMode="tel"
            error={errorKey === "emergencyPhone"}
          />
          <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={draft.agreeTerms}
              onChange={(e) => patch({ agreeTerms: e.target.checked })}
            />
            <span>
              {t("onboarding.agreeTerms")}{" "}
              <a
                href="/terms"
                className="font-semibold text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                {t("onboarding.agreeTermsLink")}
              </a>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={draft.agreePrivacy}
              onChange={(e) => patch({ agreePrivacy: e.target.checked })}
            />
            <span>
              {t("onboarding.agreePrivacy")}{" "}
              <a
                href="/privacy"
                className="font-semibold text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                {t("onboarding.agreePrivacyLink")}
              </a>
            </span>
          </label>
          {errorKey === "agree" && (
            <p className="text-sm text-destructive">{t("onboarding.needAgree")}</p>
          )}
          <p className="rounded-xl bg-secondary/70 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            {t("onboarding.customer.reviewNote")}
          </p>
        </div>
      )}

      {errorKey &&
        !["idFront", "idBack", "selfie", "agree"].includes(errorKey) && (
          <p className="text-sm text-destructive" role="alert">
            {t("onboarding.fixInvalid")}
          </p>
        )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-full"
          onClick={back}
        >
          {t("common.back")}
        </Button>
        <Button
          type="button"
          className="h-11 flex-[1.4] rounded-full"
          onClick={next}
        >
          {step >= CUSTOMER_STEPS - 1
            ? t("onboarding.submit")
            : t("onboarding.continue")}
        </Button>
      </div>
    </OnboardingShell>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={
          error ? "h-11 rounded-xl border-destructive" : "h-11 rounded-xl"
        }
      />
      {hint && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
