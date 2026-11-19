/**
 * simulation: blank provider keys are fine. Test ID + card 4242.
 * production: real DIDIT_API_KEY and PAYMONGO_SECRET_KEY are required.
 * The test card is rejected in production.
 */
export type KagawaMode = "simulation" | "production";

export function kagawaMode(): KagawaMode {
  const raw = (
    process.env.NEXT_PUBLIC_KAGAWA_MODE ||
    process.env.KAGAWA_MODE ||
    "simulation"
  )
    .trim()
    .toLowerCase();
  return raw === "production" ? "production" : "simulation";
}

export function isSimulation() {
  return kagawaMode() === "simulation";
}

/** A real secret, not a blank or example placeholder. */
export function credentialPresent(value: string | undefined) {
  const v = (value ?? "").trim();
  if (v.length < 8) return false;
  if (/your_|change-me|\.\.\.|placeholder/i.test(v)) return false;
  return true;
}

export function paymongoReady() {
  const key = process.env.PAYMONGO_SECRET_KEY?.trim() ?? "";
  return (
    kagawaMode() === "production" &&
    credentialPresent(key) &&
    key.startsWith("sk_")
  );
}

export function diditReady() {
  return (
    kagawaMode() === "production" &&
    credentialPresent(process.env.DIDIT_API_KEY)
  );
}

export function simCardNumber() {
  const raw = (
    process.env.KAGAWA_SIM_CARD ||
    process.env.NEXT_PUBLIC_KAGAWA_SIM_CARD ||
    "4242424242424242"
  ).replace(/\D/g, "");
  return raw.length >= 12 ? raw : "4242424242424242";
}

export function formatCardGroups(digits: string) {
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
