"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DiditVerifyButton } from "@/components/kagawa/didit-verify-button";
import { FileUploadField } from "@/components/kagawa/file-upload-field";
import { OnboardingShell } from "@/components/kagawa/onboarding-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLEARANCE_TYPES,
  WORKER_STEPS,
  validateWorkerStep,
  type ClearanceType,
} from "@/lib/onboarding";
import { SERVICES } from "@/lib/services";
import { serviceNameKey } from "@/lib/service-label";
import { useT } from "@/lib/i18n";
import { isSimulation } from "@/lib/runtime-mode";
import { useKagawa } from "@/lib/store";
import type { ServiceId } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEP_KEYS = [
  "onboarding.worker.stepIdentity",
  "onboarding.worker.stepWork",
  "onboarding.worker.stepId",
  "onboarding.worker.stepClearance",
  "onboarding.worker.stepAgree",
] as const;

export default function WorkerOnboardingPage() {
  const t = useT();
  const router = useRouter();
  const draft = useKagawa((s) => s.workerOnboarding);
  const patch = useKagawa((s) => s.patchWorkerOnboarding);
  const complete = useKagawa((s) => s.completeWorkerOnboarding);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const step = Math.min(draft.step, WORKER_STEPS - 1);

  useEffect(() => {
    if (!draft.diditVendorKey) {
      patch({ diditVendorKey: `work-${crypto.randomUUID()}` });
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

  function toggleSkill(id: ServiceId) {
    const has = draft.skills.includes(id);
    patch({
      skills: has
        ? draft.skills.filter((s) => s !== id)
        : [...draft.skills, id],
    });
  }

  function next() {
    const bad = validateWorkerStep(draft, step);
    if (!fail(bad)) return;
    if (step >= WORKER_STEPS - 1) {
      complete();
      router.push("/worker");
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
      title={t("onboarding.worker.title")}
      step={step}
      totalSteps={WORKER_STEPS}
      stepLabel={t(STEP_KEYS[step])}
    >
      {step === 0 && (
        <div className="animate-rise space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("onboarding.worker.identityBody")}
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
            {t("onboarding.worker.workBody")}
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
            hint={t("onboarding.worker.cityHint")}
          />
          <div className="space-y-2">
            <Label>{t("onboarding.worker.skills")}</Label>
            <p className="text-[11px] text-muted-foreground">
              {t("onboarding.worker.skillsHint")}
            </p>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => {
                const on = draft.skills.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSkill(s.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    )}
                  >
                    {t(serviceNameKey(s.id))}
                  </button>
                );
              })}
            </div>
            {errorKey === "skills" && (
              <p className="text-xs text-destructive">
                {t("onboarding.worker.needSkill")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">{t("onboarding.worker.bio")}</Label>
            <Textarea
              id="bio"
              value={draft.bio}
              onChange={(e) => patch({ bio: e.target.value })}
              placeholder={t("onboarding.worker.bioPlaceholder")}
              className={cn(
                "min-h-[100px] rounded-xl",
                errorKey === "bio" && "border-destructive"
              )}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("onboarding.worker.bioHint")}
            </p>
          </div>
          <Field
            id="hourlyRate"
            label={t("onboarding.worker.hourlyRate")}
            value={draft.hourlyRate}
            onChange={(v) => patch({ hourlyRate: v })}
            placeholder="e.g. 350"
            inputMode="numeric"
            error={errorKey === "hourlyRate"}
            hint={t("onboarding.worker.hourlyRateHint")}
          />
          <Field
            id="dayRate"
            label={t("onboarding.worker.dayRate")}
            value={draft.dayRate}
            onChange={(v) => patch({ dayRate: v })}
            placeholder="e.g. 2500"
            inputMode="numeric"
            error={errorKey === "dayRate"}
            hint={t("onboarding.worker.dayRateHint")}
          />
        </div>
      )}

      {step === 2 && (
        <div className="animate-rise space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("onboarding.worker.idBody")}
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
            {t("onboarding.worker.clearanceBody")}
          </p>
          {isSimulation() && (
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              onClick={() =>
                patch({
                  clearanceType: "barangay",
                  clearanceDoc: {
                    name: "sim-barangay-clearance.pdf",
                    size: 2048,
                    mime: "application/pdf",
                    uploadedAt: new Date().toISOString(),
                  },
                  gcashNumber: draft.phone || "09170000000",
                })
              }
            >
              {t("didit.simClearance")}
            </Button>
          )}
          <div className="space-y-2">
            <Label>{t("onboarding.clearanceType")}</Label>
            <Select
              value={draft.clearanceType ?? ""}
              onValueChange={(v) =>
                patch({ clearanceType: v as ClearanceType })
              }
            >
              <SelectTrigger
                className={
                  errorKey === "clearanceType"
                    ? "h-11 rounded-xl border-destructive"
                    : "h-11 rounded-xl"
                }
              >
                <SelectValue
                  placeholder={t("onboarding.clearanceTypePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {CLEARANCE_TYPES.map((id) => (
                  <SelectItem key={id} value={id}>
                    {t(`onboarding.clearanceTypes.${id}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FileUploadField
            label={t("onboarding.clearanceDoc")}
            hint={t("onboarding.worker.clearanceHint")}
            value={draft.clearanceDoc}
            onChange={(doc) => patch({ clearanceDoc: doc })}
            required
          />
          {errorKey === "clearanceDoc" && <NeedUpload />}
          <FileUploadField
            label={t("onboarding.skillCert")}
            hint={t("onboarding.worker.skillCertHint")}
            value={draft.skillCert}
            onChange={(doc) => patch({ skillCert: doc })}
          />
          <Field
            id="gcash"
            label={t("onboarding.worker.gcash")}
            value={draft.gcashNumber}
            onChange={(v) => patch({ gcashNumber: v })}
            placeholder="09XXXXXXXXX"
            inputMode="tel"
            error={errorKey === "gcashNumber"}
            hint={t("onboarding.worker.gcashHint")}
          />
        </div>
      )}

      {step === 4 && (
        <div className="animate-rise space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("onboarding.worker.agreeBody")}
          </p>
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
              checked={draft.agreeBackground}
              onChange={(e) => patch({ agreeBackground: e.target.checked })}
            />
            <span>{t("onboarding.worker.agreeBackground")}</span>
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
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
            {t("onboarding.worker.reviewNote")}
          </p>
        </div>
      )}

      {errorKey &&
        ![
          "idFront",
          "idBack",
          "selfieWithId",
          "clearanceDoc",
          "skills",
          "agree",
        ].includes(errorKey) && (
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
          {step >= WORKER_STEPS - 1
            ? t("onboarding.submit")
            : t("onboarding.continue")}
        </Button>
      </div>
    </OnboardingShell>
  );
}

function NeedUpload() {
  const t = useT();
  return (
    <p className="-mt-2 text-xs text-destructive">{t("onboarding.needUpload")}</p>
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
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
