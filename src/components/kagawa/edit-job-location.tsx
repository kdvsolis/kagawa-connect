"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/kagawa/location-picker";
import { useT } from "@/lib/i18n";
import { useKagawa } from "@/lib/store";
import type { Job } from "@/lib/types";

const EDITABLE: Job["status"][] = [
  "searching",
  "accepted",
  "en_route",
];

export function EditJobLocation({ job }: { job: Job }) {
  const t = useT();
  const updateJobLocation = useKagawa((s) => s.updateJobLocation);
  const [open, setOpen] = useState(false);
  const [loc, setLoc] = useState({
    address: job.address,
    barangay: job.barangay,
    city: job.city,
    pin:
      job.lat != null && job.lng != null
        ? { lat: job.lat, lng: job.lng }
        : null,
  });
  const [saved, setSaved] = useState(false);

  if (!EDITABLE.includes(job.status)) return null;

  function save() {
    const ok = updateJobLocation(job.id, {
      address: loc.address.trim(),
      barangay: loc.barangay.trim(),
      city: loc.city.split(",")[0]?.trim() || loc.city.trim(),
      lat: loc.pin?.lat,
      lng: loc.pin?.lng,
    });
    if (ok) {
      setSaved(true);
      setOpen(false);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          onClick={() => {
            setLoc({
              address: job.address,
              barangay: job.barangay,
              city: job.city,
              pin:
                job.lat != null && job.lng != null
                  ? { lat: job.lat, lng: job.lng }
                  : null,
            });
            setOpen(true);
          }}
        >
          {t("maps.editLocation")}
        </Button>
        {saved && (
          <span className="text-xs text-primary">{t("maps.locationSaved")}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <p className="font-display text-sm font-semibold">
        {t("maps.editLocation")}
      </p>
      <LocationPicker value={loc} onChange={setLoc} />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          onClick={save}
          disabled={loc.address.trim().length < 3 || loc.barangay.trim().length < 2}
        >
          {t("maps.saveLocation")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={() => setOpen(false)}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
