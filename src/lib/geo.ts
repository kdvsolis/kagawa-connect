/**
 * Approximate area centers for seeded demo + booking fallback.
 * Demo locale: Alicante, Spain (nearby radius ~8 km).
 */
export const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  "centro|alicante": { lat: 38.3452, lng: -0.4815 },
  "carolinas|alicante": { lat: 38.3535, lng: -0.4905 },
  "benalua|alicante": { lat: 38.338, lng: -0.495 },
  "san blas|alicante": { lat: 38.357, lng: -0.475 },
  "alicante|alicante": { lat: 38.3452, lng: -0.4815 },
  // legacy Makati keys (old localStorage / jobs)
  "san antonio|makati": { lat: 14.5652, lng: 121.0148 },
  "poblacion|makati": { lat: 14.5658, lng: 121.0295 },
  "bel-air|makati": { lat: 14.5631, lng: 121.0272 },
  "makati|makati": { lat: 14.5547, lng: 121.0244 },
};

export type LatLng = { lat: number; lng: number };

export function areaKey(barangay: string, city: string) {
  return `${barangay.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
}

/** "Alicante, Alicante" / "Alicante, Spain" → "alicante" */
export function normalizeCity(city: string) {
  return city
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    ?? "";
}

export function sameCity(a: string, b: string) {
  return normalizeCity(a) === normalizeCity(b) && normalizeCity(a).length > 0;
}

export function coordsForArea(barangay: string, city: string): LatLng | null {
  const exact = AREA_COORDS[areaKey(barangay, city)];
  if (exact) return exact;
  const cityLower = city.trim().toLowerCase();
  const cityOnly =
    AREA_COORDS[`alicante|${cityLower}`] ??
    AREA_COORDS[`makati|${cityLower}`];
  if (cityOnly) return cityOnly;
  if (cityLower.includes("alicante")) {
    return { lat: 38.3452, lng: -0.4815 };
  }
  if (cityLower.includes("makati")) {
    return { lat: 14.5547, lng: 121.0244 };
  }
  return null;
}

/** Haversine distance in kilometers. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number | null): string {
  if (km == null || Number.isNaN(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Default search radius for “nearby” jobs (Grab-like). */
export const NEARBY_RADIUS_KM = 8;

export function resolveCoords(
  lat?: number | null,
  lng?: number | null,
  barangay?: string,
  city?: string
): LatLng | null {
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return { lat, lng };
  }
  if (barangay && city) return coordsForArea(barangay, city);
  return null;
}

export function readBrowserLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}
