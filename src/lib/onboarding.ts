import type { Role, ServiceId } from "./types";

/** Metadata only — no binary blobs in localStorage. */
export type UploadedDoc = {
  name: string;
  size: number;
  mime: string;
  uploadedAt: string;
};

export type IdType =
  | "philid"
  | "drivers_license"
  | "passport"
  | "umid"
  | "voters_id"
  | "postal_id";

export type ClearanceType = "barangay" | "nbi" | "police";

export type CustomerOnboarding = {
  role: "customer";
  step: number;
  fullName: string;
  phone: string;
  email: string;
  birthdate: string;
  address: string;
  barangay: string;
  city: string;
  idType: IdType | "";
  idFront: UploadedDoc | null;
  idBack: UploadedDoc | null;
  selfie: UploadedDoc | null;
  /** Didit vendor_data key for this draft */
  diditVendorKey: string;
  diditSessionId: string | null;
  diditStatus: string | null;
  emergencyName: string;
  emergencyPhone: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  completedAt: string | null;
};

export type WorkerOnboarding = {
  role: "worker";
  step: number;
  fullName: string;
  phone: string;
  email: string;
  birthdate: string;
  address: string;
  barangay: string;
  city: string;
  skills: ServiceId[];
  bio: string;
  /** Required — worker sets their own ₱/hr */
  hourlyRate: string;
  /** Optional — ₱ per day */
  dayRate: string;
  idType: IdType | "";
  idFront: UploadedDoc | null;
  idBack: UploadedDoc | null;
  selfieWithId: UploadedDoc | null;
  /** Didit vendor_data key for this draft */
  diditVendorKey: string;
  diditSessionId: string | null;
  diditStatus: string | null;
  clearanceType: ClearanceType | "";
  clearanceDoc: UploadedDoc | null;
  skillCert: UploadedDoc | null;
  gcashNumber: string;
  agreeTerms: boolean;
  agreeBackground: boolean;
  agreePrivacy: boolean;
  completedAt: string | null;
};

export type OnboardingDraft = CustomerOnboarding | WorkerOnboarding;

export const ID_TYPES: IdType[] = [
  "philid",
  "drivers_license",
  "passport",
  "umid",
  "voters_id",
  "postal_id",
];

export const CLEARANCE_TYPES: ClearanceType[] = ["barangay", "nbi", "police"];

export const CUSTOMER_STEPS = 4;
export const WORKER_STEPS = 5;

export function emptyCustomerOnboarding(): CustomerOnboarding {
  return {
    role: "customer",
    step: 0,
    fullName: "",
    phone: "",
    email: "",
    birthdate: "",
    address: "",
    barangay: "",
    city: "Alicante",
    idType: "",
    idFront: null,
    idBack: null,
    selfie: null,
    diditVendorKey: "",
    diditSessionId: null,
    diditStatus: null,
    emergencyName: "",
    emergencyPhone: "",
    agreeTerms: false,
    agreePrivacy: false,
    completedAt: null,
  };
}

export function emptyWorkerOnboarding(): WorkerOnboarding {
  return {
    role: "worker",
    step: 0,
    fullName: "",
    phone: "",
    email: "",
    birthdate: "",
    address: "",
    barangay: "",
    city: "Alicante",
    skills: [],
    bio: "",
    hourlyRate: "",
    dayRate: "",
    idType: "",
    idFront: null,
    idBack: null,
    selfieWithId: null,
    diditVendorKey: "",
    diditSessionId: null,
    diditStatus: null,
    clearanceType: "",
    clearanceDoc: null,
    skillCert: null,
    gcashNumber: "",
    agreeTerms: false,
    agreeBackground: false,
    agreePrivacy: false,
    completedAt: null,
  };
}

/** Didit Approved skips manual ID photo uploads. */
export function diditIdPassed(status: string | null | undefined) {
  return status === "Approved";
}

export function toUploadedDoc(file: File): UploadedDoc {
  return {
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PHONE_RE = /^(09|\+639)\d{9}$/;

export function normalizePhone(raw: string) {
  return raw.replace(/[\s-]/g, "");
}

export function isValidPhPhone(raw: string) {
  return PHONE_RE.test(normalizePhone(raw));
}

export function validateCustomerStep(
  data: CustomerOnboarding,
  step: number
): string | null {
  if (step === 0) {
    if (data.fullName.trim().length < 3) return "fullName";
    if (!isValidPhPhone(data.phone)) return "phone";
    if (!data.email.includes("@")) return "email";
    if (!data.birthdate) return "birthdate";
  }
  if (step === 1) {
    if (data.address.trim().length < 5) return "address";
    if (data.barangay.trim().length < 2) return "barangay";
    if (data.city.trim().length < 2) return "city";
  }
  if (step === 2) {
    if (!diditIdPassed(data.diditStatus)) return "didit";
  }
  if (step === 3) {
    if (data.emergencyName.trim().length < 2) return "emergencyName";
    if (!isValidPhPhone(data.emergencyPhone)) return "emergencyPhone";
    if (!data.agreeTerms || !data.agreePrivacy) return "agree";
  }
  return null;
}

export function validateWorkerStep(
  data: WorkerOnboarding,
  step: number
): string | null {
  if (step === 0) {
    if (data.fullName.trim().length < 3) return "fullName";
    if (!isValidPhPhone(data.phone)) return "phone";
    if (!data.email.includes("@")) return "email";
    if (!data.birthdate) return "birthdate";
  }
  if (step === 1) {
    if (data.address.trim().length < 5) return "address";
    if (data.barangay.trim().length < 2) return "barangay";
    if (data.city.trim().length < 2) return "city";
    if (data.skills.length < 1) return "skills";
    if (data.bio.trim().length < 20) return "bio";
    const hr = Number(data.hourlyRate);
    if (!hr || hr < 50) return "hourlyRate";
    if (data.dayRate.trim()) {
      const dr = Number(data.dayRate);
      if (!dr || dr < hr) return "dayRate";
    }
  }
  if (step === 2) {
    if (!diditIdPassed(data.diditStatus)) return "didit";
  }
  if (step === 3) {
    if (!data.clearanceType) return "clearanceType";
    if (!data.clearanceDoc) return "clearanceDoc";
    if (!isValidPhPhone(data.gcashNumber)) return "gcashNumber";
  }
  if (step === 4) {
    if (!data.agreeTerms || !data.agreeBackground || !data.agreePrivacy)
      return "agree";
  }
  return null;
}

/** Seeded demo accounts already passed verification. */
export const SEEDED_VERIFIED_IDS = [
  "a0000000-0000-4000-8000-000000000001",
  "a0000000-0000-4000-8000-000000000002",
  "a0000000-0000-4000-8000-000000000003",
  "a0000000-0000-4000-8000-000000000004",
  "a0000000-0000-4000-8000-000000000005",
  "a0000000-0000-4000-8000-000000000006",
  "a0000000-0000-4000-8000-000000000007", // Liza — Makati PH
] as const;

export function onboardingPath(role: Role) {
  return role === "worker" ? "/worker/onboarding" : "/customer/onboarding";
}
