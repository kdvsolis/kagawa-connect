import type { LatLng } from "./geo";

export type GeocodeHit = {
  id: string;
  label: string;
  addressLine: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    borough?: string;
    city_district?: string;
    village?: string;
    town?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

const UA = "KaGawa/1.0 (home-services demo; contact@kagawa.local)";

function mapHit(row: NominatimResult): GeocodeHit {
  const a = row.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ").trim();
  const area =
    a.neighbourhood ||
    a.suburb ||
    a.borough ||
    a.city_district ||
    a.village ||
    "";
  const city =
    a.city || a.town || a.municipality || a.county || a.state || "";
  return {
    id: String(row.place_id),
    label: row.display_name,
    addressLine: street || row.display_name.split(",")[0]?.trim() || row.display_name,
    area,
    city,
    lat: Number(row.lat),
    lng: Number(row.lon),
  };
}

export async function searchPlaces(
  query: string,
  opts?: { limit?: number; countrycodes?: string }
): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: String(opts?.limit ?? 6),
  });
  if (opts?.countrycodes) params.set("countrycodes", opts.countrycodes);

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) throw new Error(`Geocode search failed (${res.status})`);
  const rows = (await res.json()) as NominatimResult[];
  return rows.map(mapHit);
}

export async function reverseGeocode(
  pin: LatLng
): Promise<GeocodeHit | null> {
  const params = new URLSearchParams({
    lat: String(pin.lat),
    lon: String(pin.lng),
    format: "json",
    addressdetails: "1",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
    {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return null;
  const row = (await res.json()) as NominatimResult & { error?: string };
  if (row.error || !row.lat) return null;
  return mapHit(row);
}
