import { getService, SERVICES } from "@/lib/services";
import type { ServiceId } from "@/lib/types";

export type ServiceSuggestion = {
  serviceId: ServiceId;
  score: number;
  /** Suggested booking units (hours or days depending on mode) */
  suggestedHours: number;
  tipKey: string;
  matched: string[];
  /** Optional free-text tip from LLM (Groq) */
  tipText?: string;
};

/** EN + FIL keywords → service. Free local “AI” (no API key). */
const KEYWORDS: Record<ServiceId, string[]> = {
  plumbing: [
    "barado",
    "bara",
    "clog",
    "leak",
    "tumutulo",
    "tulo",
    "gripo",
    "faucet",
    "lababo",
    "sink",
    "toilet",
    "cr",
    "kubeta",
    "pipe",
    "tubero",
    "plumbing",
    "sewage",
    "drain",
    "flood",
    "baha",
  ],
  electrical: [
    "kuryente",
    "electric",
    "electrical",
    "outlet",
    "socket",
    "switch",
    "wiring",
    "short",
    "trip",
    "breaker",
    "ilaw",
    "light",
    "lamp",
    "patay",
    "kuryenteng",
    "spark",
    "kuryente",
  ],
  aircon: [
    "aircon",
    "air con",
    "ac",
    "a/c",
    "split",
    "window type",
    "filter",
    "coolant",
    "hindi malamig",
    "di malamig",
    "not cooling",
  ],
  appliance: [
    "washer",
    "washing",
    "labahan",
    "ref",
    "refrigerator",
    "freezer",
    "rice cooker",
    "fan",
    "electric fan",
    "microwave",
    "appliance",
    "dryer",
    "oven",
  ],
  cleaning: [
    "linis",
    "clean",
    "cleaning",
    "madumi",
    "messy",
    "deep clean",
    "after party",
    "party",
    "dust",
    "alikabok",
    "cr linis",
    "kitchen clean",
    "housekeep",
  ],
  laundry: [
    "laundry",
    "labanda",
    "labandera",
    "plantsa",
    "iron",
    "fold",
    "hang",
    "damit",
    "clothes",
    "wash and fold",
  ],
  pest: [
    "ipis",
    "cockroach",
    "daga",
    "rat",
    "mouse",
    "langgam",
    "ant",
    "pest",
    "termite",
    "anay",
    "mosquito",
    "lamok",
  ],
  painting: [
    "paint",
    "pintura",
    "repaint",
    "wall",
    "dingding",
    "peeling",
    "kupas",
    "touch-up",
    "touch up",
  ],
  carpentry: [
    "cabinet",
    "door",
    "pintuan",
    "hinge",
    "shelf",
    "wood",
    "kahoy",
    "karpintero",
    "carpentry",
    "drawer",
  ],
  gardening: [
    "garden",
    "hardin",
    "damo",
    "grass",
    "trim",
    "gupit",
    "plant",
    "halaman",
    "yard",
    "bakuran",
  ],
  errands: [
    "errand",
    "padala",
    "bili",
    "market",
    "palengke",
    "bill",
    "bayad",
    "pharmacy",
    "botika",
    "grocery",
    "pickup",
  ],
  handyman: [
    "handyman",
    "ayos",
    "repair",
    "sira",
    "fix",
    "mount",
    "tv",
    "lock",
    "susí",
    "assemble",
    "furniture",
    "general",
  ],
};

const TIP_BY_SERVICE: Partial<Record<ServiceId, string>> = {
  plumbing: "suggest.tipPlumbing",
  electrical: "suggest.tipElectrical",
  cleaning: "suggest.tipCleaning",
  aircon: "suggest.tipAircon",
  pest: "suggest.tipPest",
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s/+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreText(text: string, words: string[]): { score: number; matched: string[] } {
  const n = normalize(text);
  if (!n) return { score: 0, matched: [] };
  const matched: string[] = [];
  let score = 0;
  for (const w of words) {
    const nw = normalize(w);
    if (!nw) continue;
    if (n.includes(nw)) {
      matched.push(w);
      // Longer phrases weigh more
      score += Math.max(1, nw.split(" ").length) * 2;
    }
  }
  return { score, matched };
}

function suggestHours(serviceId: ServiceId, text: string): number {
  const s = getService(serviceId);
  const base = s?.minHours ?? 1;
  const n = normalize(text);
  if (/urgent|asap|agad|now| ngayon|emergency/.test(n)) return base;
  if (/whole house|buong bahay|deep|malaki|maraming|entire/.test(n)) {
    return Math.min(8, Math.max(base, base + 2));
  }
  if (/konti|small|mabilis|quick|minor/.test(n)) return base;
  return base;
}

/** Rank services for a free-text problem description. */
export function suggestServicesFromText(
  text: string,
  limit = 3
): ServiceSuggestion[] {
  const trimmed = text.trim();
  if (trimmed.length < 3) return [];

  const scored: ServiceSuggestion[] = SERVICES.map((s) => {
    const { score, matched } = scoreText(trimmed, KEYWORDS[s.id] ?? []);
    return {
      serviceId: s.id,
      score,
      suggestedHours: suggestHours(s.id, trimmed),
      tipKey: TIP_BY_SERVICE[s.id] ?? "suggest.tipGeneric",
      matched,
    };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.serviceId.localeCompare(b.serviceId));

  return scored.slice(0, limit);
}

export function topSuggestion(text: string): ServiceSuggestion | null {
  return suggestServicesFromText(text, 1)[0] ?? null;
}
