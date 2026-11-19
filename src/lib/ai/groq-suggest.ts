import { getService, SERVICES } from "@/lib/services";
import type { ServiceId } from "@/lib/types";
import type { ServiceSuggestion } from "./suggest-service";

const SERVICE_IDS = SERVICES.map((s) => s.id);

export function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

type GroqJson = {
  serviceId?: string;
  suggestedHours?: number;
  tip?: string;
  alternatives?: string[];
};

/**
 * Groq chat completion → structured service suggestion.
 * Falls back by throwing; caller should use local keywords.
 */
export async function suggestWithGroq(
  text: string
): Promise<ServiceSuggestion[]> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error("GROQ_API_KEY missing");

  const model =
    process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";

  const catalog = SERVICES.map(
    (s) => `${s.id}: ${s.name} — ${s.description}`
  ).join("\n");

  const system = `You classify home-service requests for KaGawa (Philippines).
Pick the best serviceId from this catalog only:
${catalog}

Reply with ONLY valid JSON (no markdown):
{"serviceId":"<id>","suggestedHours":<number>,"tip":"<short EN tip>","alternatives":["<id>","<id>"]}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: GroqJson;
  try {
    parsed = JSON.parse(raw) as GroqJson;
  } catch {
    throw new Error("Groq returned non-JSON");
  }

  const id = parsed.serviceId as ServiceId | undefined;
  if (!id || !SERVICE_IDS.includes(id)) {
    throw new Error("Invalid serviceId from Groq");
  }

  const svc = getService(id)!;
  const hours = Math.min(
    12,
    Math.max(svc.minHours, Number(parsed.suggestedHours) || svc.minHours)
  );

  const alts = (parsed.alternatives ?? [])
    .filter((a): a is ServiceId => SERVICE_IDS.includes(a as ServiceId) && a !== id)
    .slice(0, 2);

  const out: ServiceSuggestion[] = [
    {
      serviceId: id,
      score: 100,
      suggestedHours: hours,
      tipKey: "suggest.tipGeneric",
      matched: ["groq"],
      tipText: parsed.tip?.trim() || undefined,
    },
    ...alts.map((a, i) => {
      const s = getService(a)!;
      return {
        serviceId: a,
        score: 80 - i * 10,
        suggestedHours: s.minHours,
        tipKey: "suggest.tipGeneric" as const,
        matched: ["groq"],
      };
    }),
  ];

  return out;
}
