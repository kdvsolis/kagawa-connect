export type ReportReason =
  | "harassment"
  | "unsafe"
  | "theft_crime"
  | "no_show"
  | "payment"
  | "fake_profile"
  | "other";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type SafetyReport = {
  id: string;
  reporterId: string;
  reportedId?: string;
  jobId?: string;
  role: "customer" | "worker";
  reason: ReportReason;
  details: string;
  /** Photo of what happened. Not a government ID. */
  evidenceName?: string;
  evidenceDataUrl?: string;
  status: ReportStatus;
  adminNote?: string;
  createdAt: string;
  resolvedAt?: string;
};

export const REPORT_REASONS: ReportReason[] = [
  "harassment",
  "unsafe",
  "theft_crime",
  "no_show",
  "payment",
  "fake_profile",
  "other",
];

/** Platform reports are not a police blotter — crime goes to authorities first. */
export const CRIME_REPORT_REASONS: ReportReason[] = ["theft_crime", "unsafe"];

/** A one-line complaint is not a report. */
export const MIN_REPORT_DETAILS = 40;
