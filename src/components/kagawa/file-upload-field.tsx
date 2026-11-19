"use client";

import { useId, useRef } from "react";
import { Camera, FileUp, ImageIcon, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  formatFileSize,
  toUploadedDoc,
  type UploadedDoc,
} from "@/lib/onboarding";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ACCEPT_IMG = "image/jpeg,image/png,image/webp";
const ACCEPT_ALL = `${ACCEPT_IMG},application/pdf`;
const MAX_BYTES = 8 * 1024 * 1024;

export function FileUploadField({
  label,
  hint,
  value,
  onChange,
  required,
  /** Prefer camera for selfies / ID (mobile). */
  allowCamera = true,
}: {
  label: string;
  hint?: string;
  value: UploadedDoc | null;
  onChange: (doc: UploadedDoc | null) => void;
  required?: boolean;
  allowCamera?: boolean;
}) {
  const t = useT();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function onPick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      window.alert(t("onboarding.fileTooLarge"));
      return;
    }
    onChange(toUploadedDoc(file));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {hint && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      )}

      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept={ACCEPT_ALL}
        className="sr-only"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {allowCamera && (
        <input
          ref={cameraRef}
          type="file"
          accept={ACCEPT_IMG}
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      )}

      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-emerald-950">
              {value.name}
            </p>
            <p className="text-[11px] text-emerald-800/80">
              {formatFileSize(value.size)} · {t("onboarding.uploaded")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-emerald-900"
            onClick={() => onChange(null)}
            aria-label={t("onboarding.removeFile")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {allowCamera && (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/70 px-3 py-5 text-center transition",
                "hover:border-primary/40 hover:bg-secondary/40"
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Camera className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold">{t("onboarding.takePhoto")}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/70 px-3 py-5 text-center transition",
              "hover:border-primary/40 hover:bg-secondary/40",
              !allowCamera && "col-span-2"
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileUp className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold">{t("onboarding.uploadFile")}</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ImageIcon className="h-3 w-3" />
              {t("onboarding.fileTypes")}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
