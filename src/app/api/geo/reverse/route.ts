import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/nominatim";

export const runtime = "nodejs";

/** GET ?lat=&lng= — free Nominatim reverse geocode */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }
  try {
    const result = await reverseGeocode({ lat, lng });
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "reverse_failed" },
      { status: 502 }
    );
  }
}
