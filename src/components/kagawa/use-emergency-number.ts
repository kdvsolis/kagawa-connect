"use client";

import { useEffect, useState } from "react";

type Hit = { number: string; country: string; ready: boolean };

const EMPTY: Hit = { number: "", country: "", ready: false };
const CLIENT_KEY = "kagawa-emergency-v1";
const HERE_KEY = "kagawa-viewer-coords";

function cellKey(lat: number, lng: number) {
  return `${Math.round(lat)}:${Math.round(lng)}`;
}

function readClient(cell: string): { number: string; country: string } | null {
  try {
    const all = JSON.parse(sessionStorage.getItem(CLIENT_KEY) || "{}") as Record<
      string,
      { number: string; country: string }
    >;
    return all[cell] ?? null;
  } catch {
    return null;
  }
}

function writeClient(cell: string, hit: { number: string; country: string }) {
  try {
    const all = JSON.parse(sessionStorage.getItem(CLIENT_KEY) || "{}") as Record<
      string,
      { number: string; country: string }
    >;
    all[cell] = hit;
    sessionStorage.setItem(CLIENT_KEY, JSON.stringify(all));
  } catch {
    /* private mode */
  }
}

function pinOf(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

/** Where the person is. The phone GPS wins. The booking pin is only if GPS is off. */
function whereIAm(
  lat?: number | null,
  lng?: number | null
): Promise<{ lat: number; lng: number } | null> {
  const pin = pinOf(lat, lng);
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(pin);
      return;
    }
    try {
      const saved = JSON.parse(sessionStorage.getItem(HERE_KEY) || "null") as {
        lat?: number;
        lng?: number;
        at?: number;
      } | null;
      if (
        saved &&
        Number.isFinite(saved.lat) &&
        Number.isFinite(saved.lng) &&
        typeof saved.at === "number" &&
        Date.now() - saved.at < 10 * 60 * 1000
      ) {
        resolve({ lat: saved.lat as number, lng: saved.lng as number });
        return;
      }
    } catch {
      /* ask the phone */
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        try {
          sessionStorage.setItem(
            HERE_KEY,
            JSON.stringify({ ...coords, at: Date.now() })
          );
        } catch {
          /* private mode */
        }
        resolve(coords);
      },
      () => resolve(pin),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

/**
 * Emergency number for the viewer's coordinates.
 * Nothing is shown until Groq (or the cache) answers, so 911 is not painted first.
 */
export function useEmergencyNumber(input?: {
  lat?: number | null;
  lng?: number | null;
}) {
  const lat = input?.lat ?? null;
  const lng = input?.lng ?? null;
  const [hit, setHit] = useState<Hit>(EMPTY);

  useEffect(() => {
    let stop = false;
    void whereIAm(lat, lng).then((coords) => {
      if (stop || !coords) {
        if (!stop) setHit({ ...EMPTY, ready: true });
        return;
      }
      const cell = cellKey(coords.lat, coords.lng);
      const local = readClient(cell);
      if (local) {
        if (!stop) setHit({ ...local, ready: true });
        return;
      }
      void fetch(`/api/emergency-number?lat=${coords.lat}&lng=${coords.lng}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { number?: string; country?: string } | null) => {
          if (stop || !data?.number || !data.country) {
            if (!stop) setHit({ ...EMPTY, ready: true });
            return;
          }
          const next = { number: data.number, country: data.country };
          writeClient(cell, next);
          setHit({ ...next, ready: true });
        })
        .catch(() => {
          if (!stop) setHit({ ...EMPTY, ready: true });
        });
    });
    return () => {
      stop = true;
    };
  }, [lat, lng]);

  return hit;
}
