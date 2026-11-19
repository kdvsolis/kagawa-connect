import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/nominatim";

export const runtime = "nodejs";

/** GET ?q=… — free Nominatim address search (no Google key) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await searchPlaces(q, { limit: 6 });
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "search_failed",
        results: [],
      },
      { status: 502 }
    );
  }
}
