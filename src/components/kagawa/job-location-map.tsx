"use client";

import { useEffect, useRef } from "react";
import { MapPin, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { distanceKm, formatDistance, type LatLng } from "@/lib/geo";
import { useT } from "@/lib/i18n";

function mapsOpenUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function directionsUrl(from: LatLng, to: LatLng) {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}`;
}

/**
 * Shared job map — customer pin (+ optional worker pin) with distance.
 * Leaflet + OSM tiles, no Google API key.
 */
export function JobLocationMap({
  label,
  addressLine,
  target,
  from,
  targetLabel,
  fromLabel,
}: {
  label: string;
  addressLine?: string;
  /** Customer / job pin */
  target?: LatLng | null;
  /** Worker (or viewer) pin */
  from?: LatLng | null;
  targetLabel?: string;
  fromLabel?: string;
}) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const dist =
    target && from ? distanceKm(from, target) : null;

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (cancelled) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const points: LatLng[] = [];
      if (target) points.push(target);
      if (from) points.push(from);
      if (points.length === 0) return;

      const map = L.map(containerRef.current);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];
      if (target) {
        L.marker([target.lat, target.lng])
          .addTo(map)
          .bindPopup(targetLabel || t("maps.customerPin"));
        bounds.push([target.lat, target.lng]);
      }
      if (from) {
        const workerIcon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:9999px;background:#0f766e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([from.lat, from.lng], { icon: workerIcon })
          .addTo(map)
          .bindPopup(fromLabel || t("maps.youAreHere"));
        bounds.push([from.lat, from.lng]);
      }

      if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      } else {
        map.fitBounds(bounds, { padding: [36, 36] });
      }
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 60);
    }

    void setup();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [target?.lat, target?.lng, from?.lat, from?.lng, targetLabel, fromLabel, t]);

  if (!target && !from) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
        <p className="text-sm font-medium">{label}</p>
        {addressLine && (
          <p className="mt-1 text-sm text-muted-foreground">{addressLine}</p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("maps.noPin")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="space-y-1 p-4 pb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" />
          {label}
        </p>
        {addressLine && (
          <p className="text-sm text-muted-foreground">{addressLine}</p>
        )}
        {dist != null && (
          <p className="flex items-center gap-1 text-xs font-medium text-primary">
            <Navigation className="h-3.5 w-3.5" />
            {t("maps.distanceBetween", { dist: formatDistance(dist) })}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {t("maps.legendCustomer")} · {t("maps.legendWorker")}
        </p>
      </div>
      <div ref={containerRef} className="h-52 w-full border-t border-border" />
      {/* Optional external apps only — pin move stays in-app via Edit location */}
      {(target || from) && (
        <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          {t("maps.inAppOnly")}
          {target && (
            <>
              {" · "}
              <a
                href={mapsOpenUrl(target.lat, target.lng)}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {t("maps.openExternal")}
              </a>
            </>
          )}
          {target && from && (
            <>
              {" · "}
              <a
                href={directionsUrl(from, target)}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {t("maps.directions")}
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
