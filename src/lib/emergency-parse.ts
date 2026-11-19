export type EmergencyEntry = {
  number: string;
  country: string;
  countryCode: string;
};

/** Groq must return a short digit emergency number and a real country code. */
export function parseEmergencyReply(raw: string): EmergencyEntry | null {
  let parsed: { country?: unknown; countryCode?: unknown; number?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return null;
  }
  const number = String(parsed.number ?? "").replace(/[^\d]/g, "");
  const country = String(parsed.country ?? "").trim();
  const countryCode = String(parsed.countryCode ?? "")
    .trim()
    .toUpperCase();
  if (!/^\d{2,5}$/.test(number)) return null;
  if (!/^[A-Za-z][A-Za-z .'-]{1,40}$/.test(country)) return null;
  if (!/^[A-Z]{2}$/.test(countryCode)) return null;
  return { number, country, countryCode };
}
