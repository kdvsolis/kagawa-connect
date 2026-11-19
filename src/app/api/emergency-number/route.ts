import { NextResponse } from "next/server";
import { emergencyForCoords, validCoord } from "@/lib/emergency-number";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!validCoord(lat, lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }
  const hit = await emergencyForCoords(lat, lng);
  return NextResponse.json(hit, {
    headers: { "Cache-Control": "no-store" },
  });
}
