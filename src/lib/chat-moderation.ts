/** Soft flags for off-platform / under-the-table talk. */

/** Soft flags — phone sharing is allowed after match (official Call/Text). */
const PATTERNS: RegExp[] = [
  /\b(gcash|g-?cash|maya|paymaya)\b/i,
  /\b(viber|whatsapp|telegram|fb\s*messenger|messenger|facebook)\b/i,
  /\b(direct|sa\s*labas|outside\s*the\s*app|off[\s-]?platform)\b/i,
  /\b(next\s*time\s*(na\s*)?(direct|sa\s*akin|walang\s*app))\b/i,
  /\bwag\b.*\b(app|kagawa)\b/i,
];

export type ChatModeration = {
  flagged: boolean;
  reasons: string[];
};

export function moderateChatMessage(text: string): ChatModeration {
  const reasons: string[] = [];
  const t = text.trim();
  if (!t) return { flagged: false, reasons };

  for (const re of PATTERNS) {
    if (re.test(t)) {
      if (/gcash|maya|pay/i.test(re.source)) reasons.push("payment_offapp");
      else if (/viber|whatsapp|telegram|messenger|facebook/i.test(re.source))
        reasons.push("external_chat");
      else if (/09\d|\+639|\d{4}/.test(re.source)) reasons.push("phone_share");
      else reasons.push("bypass");
    }
  }

  return { flagged: reasons.length > 0, reasons: [...new Set(reasons)] };
}
