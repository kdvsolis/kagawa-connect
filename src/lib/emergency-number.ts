import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { parseEmergencyReply, type EmergencyEntry } from "@/lib/emergency-parse";
import { marketForPlace } from "@/lib/markets";

export type EmergencyHit = {
  number: string;
  country: string;
  countryCode: string;
  cached: boolean;
  source: "cache" | "groq" | "fallback";
};

type Entry = EmergencyEntry;

type CacheFile = {
  cells: Record<string, Entry>;
};

const FILE = path.join(process.cwd(), ".cache", "emergency-numbers.json");
const inflight = new Map<string, Promise<Entry | null>>();

let memory: CacheFile | null = null;

function cellKey(lat: number, lng: number) {
  return `${Math.round(lat)}:${Math.round(lng)}`;
}

function load(): CacheFile {
  if (memory) return memory;
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as CacheFile;
    memory = { cells: parsed.cells ?? {} };
  } catch {
    memory = { cells: {} };
  }
  return memory;
}

function save(cache: CacheFile) {
  memory = cache;
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(cache));
}

function fallback(lat: number, lng: number): EmergencyHit {
  const market = marketForPlace("", lat, lng);
  return {
    number: market.emergencyTel,
    country: market.name,
    countryCode: market.id,
    cached: false,
    source: "fallback",
  };
}

async function askGroq(lat: number, lng: number): Promise<Entry | null> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  const preferred = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
  const models =
    preferred === "openai/gpt-oss-20b"
      ? [preferred]
      : [preferred, "openai/gpt-oss-20b"];
  try {
    for (const model of models) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'You only answer with the public general emergency telephone number for the country at the given WGS84 coordinates. Reply with ONLY JSON: {"country":"English name","countryCode":"ISO alpha-2","number":"digits only"}. The number is the one a visitor calls for police or immediate danger. Digits only, no plus sign.',
            },
            { role: "user", content: `lat ${lat}\nlng ${lng}` },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        if (/model_not_found|does not exist/i.test(errText)) continue;
        return null;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return parseEmergencyReply(data.choices?.[0]?.message?.content ?? "");
    }
    return null;
  } catch {
    return null;
  }
}

export function validCoord(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** One Groq lookup per 1-degree cell. Later visits read the cache. */
export async function emergencyForCoords(
  lat: number,
  lng: number
): Promise<EmergencyHit> {
  const key = cellKey(lat, lng);
  const cache = load();
  const hit = cache.cells[key];
  if (hit) return { ...hit, cached: true, source: "cache" };

  let task = inflight.get(key);
  if (!task) {
    task = (async () => {
      const entry = await askGroq(lat, lng);
      if (!entry) return null;
      const next = load();
      next.cells[key] = entry;
      save(next);
      return entry;
    })();
    inflight.set(key, task);
  }
  const entry = await task;
  inflight.delete(key);
  if (!entry) return fallback(lat, lng);
  return { ...entry, cached: false, source: "groq" };
}
