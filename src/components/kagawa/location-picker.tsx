"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readBrowserLocation, type LatLng } from "@/lib/geo";
import type { GeocodeHit } from "@/lib/nominatim";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PinMap = dynamic(
  () => import("@/components/kagawa/pin-map").then((m) => m.PinMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-xl bg-secondary" />
    ),
  }
);

export type LocationValue = {
  address: string;
  barangay: string;
  city: string;
  pin: LatLng | null;
};

type Props = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  className?: string;
};

/**
 * Lalamove-style: search bar over the map, drag/tap pin, or GPS.
 * Free Nominatim geocode — no Google API.
 */
export function LocationPicker({ value, onChange, className }: Props) {
  const t = useT();
  const [query, setQuery] = useState(value.address);
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipSearch = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    setQuery(value.address);
  }, [value.address]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || q === value.address.trim()) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `/api/geo/search?q=${encodeURIComponent(q)}`
          );
          const data = (await res.json()) as { results?: GeocodeHit[] };
          setHits(data.results ?? []);
          setOpen(true);
        } catch {
          setHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 450);
    return () => window.clearTimeout(handle);
  }, [query, value.address]);

  async function applyReverse(pin: LatLng) {
    setFilling(true);
    setLocError(null);
    const prev = valueRef.current;
    try {
      const res = await fetch(
        `/api/geo/reverse?lat=${pin.lat}&lng=${pin.lng}`
      );
      const data = (await res.json()) as { result?: GeocodeHit | null };
      const hit = data.result;
      skipSearch.current = true;
      const next: LocationValue = {
        address: hit?.addressLine || prev.address,
        barangay: hit?.area || prev.barangay,
        city: (hit?.city || prev.city).split(",")[0]?.trim() || prev.city,
        pin,
      };
      onChange(next);
      if (hit?.addressLine) setQuery(hit.addressLine);
    } catch {
      onChange({ ...prev, pin });
    } finally {
      setFilling(false);
    }
  }

  function pickHit(hit: GeocodeHit) {
    skipSearch.current = true;
    setQuery(hit.addressLine);
    setHits([]);
    setOpen(false);
    onChange({
      address: hit.addressLine,
      barangay: hit.area || value.barangay,
      city: hit.city.split(",")[0]?.trim() || value.city,
      pin: { lat: hit.lat, lng: hit.lng },
    });
  }

  async function useGps() {
    setLocBusy(true);
    setLocError(null);
    try {
      const loc = await readBrowserLocation();
      await applyReverse(loc);
    } catch {
      setLocError(t("gps.denied"));
    } finally {
      setLocBusy(false);
    }
  }

  const defaultCenter =
    value.city.toLowerCase().includes("makati") ||
    value.city.toLowerCase().includes("manila")
      ? { lat: 14.5652, lng: 121.0148 }
      : { lat: 38.3452, lng: -0.4815 };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Map stage — search overlays on top (Lalamove) */}
      <div ref={boxRef} className="relative overflow-hidden rounded-2xl border border-border">
        <PinMap
          value={value.pin}
          onChange={(pin) => void applyReverse(pin)}
          defaultCenter={value.pin ?? defaultCenter}
          heightClass="h-72"
          hideHint
          className="rounded-none border-0"
        />

        {/* Search bar on map */}
        <div className="absolute left-3 right-3 top-3 z-[1000]">
          <div className="relative rounded-xl border border-border/80 bg-card/95 shadow-md backdrop-blur">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="loc-search"
              className="h-11 border-0 bg-transparent pl-9 pr-9 shadow-none focus-visible:ring-0"
              value={query}
              placeholder={t("maps.searchPlaceholder")}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                onChange({ ...value, address: e.target.value });
              }}
              onFocus={() => hits.length > 0 && setOpen(true)}
            />
            {(searching || filling || locBusy) && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {open && hits.length > 0 && (
            <ul className="mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-card shadow-lg">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary"
                    onClick={() => pickHit(hit)}
                  >
                    <span className="line-clamp-2">{hit.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* GPS FAB */}
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute bottom-3 right-3 z-[1000] h-11 w-11 rounded-full border border-border shadow-md"
          disabled={locBusy}
          onClick={() => void useGps()}
          aria-label={t("gps.useMyLocation")}
          title={t("gps.useMyLocation")}
        >
          <Crosshair className="h-5 w-5" />
        </Button>

        <p className="pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-[70%] rounded-lg bg-card/90 px-2.5 py-1.5 text-[10px] leading-snug text-muted-foreground shadow">
          {t("maps.dragHint")}
          {value.pin
            ? ` · ${value.pin.lat.toFixed(4)}, ${value.pin.lng.toFixed(4)}`
            : ""}
        </p>
      </div>

      <p className="text-[11px] text-muted-foreground">{t("maps.searchHint")}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="loc-area">{t("customer.areaLabel")}</Label>
          <Input
            id="loc-area"
            className="rounded-xl"
            value={value.barangay}
            onChange={(e) =>
              onChange({ ...value, barangay: e.target.value })
            }
            placeholder="Centro / San Antonio"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loc-city">{t("customer.city")}</Label>
          <Input
            id="loc-city"
            className="rounded-xl"
            value={value.city}
            onChange={(e) =>
              onChange({
                ...value,
                city: e.target.value.split(",")[0],
              })
            }
            placeholder="Alicante / Makati"
            required
          />
        </div>
      </div>

      {locError && <p className="text-xs text-destructive">{locError}</p>}
    </div>
  );
}
