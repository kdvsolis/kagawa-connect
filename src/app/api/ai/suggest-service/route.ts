import { NextResponse } from "next/server";
import { groqConfigured, suggestWithGroq } from "@/lib/ai/groq-suggest";
import { suggestServicesFromText } from "@/lib/ai/suggest-service";

export const runtime = "nodejs";

/**
 * Body: { text: string }
 * Uses Groq when GROQ_API_KEY is set; otherwise local keyword classifier.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (text.length < 3) {
      return NextResponse.json({ suggestions: [], provider: "none" });
    }

    if (groqConfigured()) {
      try {
        const suggestions = await suggestWithGroq(text);
        return NextResponse.json({
          suggestions,
          provider: "groq",
        });
      } catch {
        // Fall through to local
      }
    }

    const suggestions = suggestServicesFromText(text, 3);
    return NextResponse.json({
      suggestions,
      provider: "local_keywords",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "suggest failed" },
      { status: 500 }
    );
  }
}
