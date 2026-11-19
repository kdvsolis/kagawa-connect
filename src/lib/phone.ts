/** PH mobile helpers for display + tel:/sms: links */

export function normalizePhone(raw: string) {
  return raw.replace(/[\s-]/g, "");
}

/** Digits for tel:/sms: — prefers +63… */
export function toTelDigits(raw: string): string | null {
  const n = normalizePhone(raw);
  if (/^09\d{9}$/.test(n)) return `+63${n.slice(1)}`;
  if (/^\+639\d{9}$/.test(n)) return n;
  if (/^639\d{9}$/.test(n)) return `+${n}`;
  return null;
}

export function formatPhPhone(raw: string): string {
  const n = normalizePhone(raw);
  if (/^09\d{9}$/.test(n)) {
    return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  }
  if (/^\+639\d{9}$/.test(n)) {
    const local = `0${n.slice(3)}`;
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return raw.trim();
}
