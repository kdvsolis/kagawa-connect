import { CRIME_REPORT_REASONS, type ReportReason } from "@/lib/reports";

export type AuthorityPerson = {
  id: string;
  name: string;
  phone: string;
  role: string;
  diditSessionId: string | null;
  diditStatus: string | null;
  diditVendorData: string | null;
};

export type AuthorityJob = {
  id: string;
  address: string;
  barangay: string;
  city: string;
  status: string;
  serviceId: string;
  createdAt: string;
};

/** Plain text a complainant can attach to a police report. Not a blotter. */
export function buildAuthorityNote(input: {
  reason: string;
  details: string;
  createdAt: string;
  reporter: AuthorityPerson | null;
  reported: AuthorityPerson | null;
  job: AuthorityJob | null;
  evidenceName?: string | null;
}): string {
  const person = (label: string, p: AuthorityPerson | null) =>
    p
      ? [
          `${label}: ${p.name} (${p.role})`,
          `Phone: ${p.phone || "—"}`,
          `Profile id: ${p.id}`,
          `Didit status: ${p.diditStatus || "not on file"}`,
          `Didit session: ${p.diditSessionId || "not on file"}`,
          `Didit vendor: ${p.diditVendorData || "not on file"}`,
        ].join("\n")
      : `${label}: not on file`;

  return [
    "KaGawa identity note — not a police blotter.",
    "KaGawa is a booking bridge, not the employer. The customer chose the worker. KaGawa does not investigate crimes and does not pay claims.",
    "File this with the police or barangay first. Then KaGawa can only pause or ban the account.",
    "",
    `Report reason: ${input.reason}`,
    `Reported at: ${input.createdAt}`,
    `Details: ${input.details || "—"}`,
    `Evidence photo: ${input.evidenceName || "none attached"}`,
    "",
    person("Reporter", input.reporter),
    "",
    person("Reported person", input.reported),
    "",
    input.job
      ? [
          `Job: ${input.job.id}`,
          `Service: ${input.job.serviceId}`,
          `Status: ${input.job.status}`,
          `When booked: ${input.job.createdAt}`,
          `Place: ${input.job.address}, ${input.job.barangay}, ${input.job.city}`,
        ].join("\n")
      : "Job: not on file",
  ].join("\n");
}

export function isCrimeReason(reason: string): reason is ReportReason {
  return (CRIME_REPORT_REASONS as string[]).includes(reason);
}
