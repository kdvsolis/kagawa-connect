"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/geo";
import { cn } from "@/lib/utils";

type Props = {
  value: LatLng | null;
  onChange: (pin: LatLng) => void;
  /** Fallback center when no pin yet */
  defaultCenter?: LatLng;
  className?: string;
  heightClass?: string;
  /** Hide bottom hint (parent shows its own) */
  hideHint?: boolean;
  hint?: string;
};

const FALLBACK: LatLng = { lat: 38.3452, lng: -0.4815 };

/**
 * In-app pin map: drag the pin, tap map to move, or parent sets via search/GPS.
 * OpenStreetMap + Leaflet — no Google API.
 */
export function PinMap({
  value,
  onChange,
  defaultCenter = FALLBACK,
  className,
  heightClass = "h-64",
  hideHint,
  hint,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const draggingRef = useRef(false);
  onChangeRef.current = onChange;

  function placeOrMoveMarker(
    L: typeof import("leaflet"),
    map: import("leaflet").Map,
    pin: LatLng
  ) {
    if (markerRef.current) {
      markerRef.current.setLatLng([pin.lat, pin.lng]);
      return markerRef.current;
    }
    const marker = L.marker([pin.lat, pin.lng], {
      draggable: true,
      autoPan: true,
    }).addTo(map);
    marker.on("dragstart", () => {
      draggingRef.current = true;
    });
    marker.on("dragend", () => {
      const ll = marker.getLatLng();
      draggingRef.current = false;
      onChangeRef.current({ lat: ll.lat, lng: ll.lng });
    });
    markerRef.current = marker;
    return marker;
  }

  useEffect(() => {
    let cancelled = false;

    async function setup() {
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

      if (cancelled || !containerRef.current || mapRef.current) return;

      const start = value ?? defaultCenter;
      const map = L.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: 15,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Always show a draggable pin (Lalamove-style)
      placeOrMoveMarker(L, map, start);
      if (!value) {
        // Seed initial pin so user can drag immediately
        onChangeRef.current(start);
      }

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const next = { lat: e.latlng.lat, lng: e.latlng.lng };
        placeOrMoveMarker(L, map, next);
        onChangeRef.current(next);
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 80);
    }

    void setup();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync from search / GPS (skip while user is dragging)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value || draggingRef.current) return;
    void import("leaflet").then(({ default: L }) => {
      placeOrMoveMarker(L, map, value);
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 15));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border",
        className
      )}
    >
      <div
        ref={containerRef}
        className={cn("z-0 w-full touch-manipulation bg-secondary/40", heightClass)}
      />
      {!hideHint && (
        <p className="border-t border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
          {hint}
          {value
            ? ` · ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : ""}
        </p>
      )}
    </div>
  );
}
