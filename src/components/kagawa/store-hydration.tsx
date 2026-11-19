"use client";

import { useEffect } from "react";
import { useKagawa } from "@/lib/store";

export function StoreHydration() {
  const setHydrated = useKagawa((s) => s.setHydrated);
  const refreshFromSupabase = useKagawa((s) => s.refreshFromSupabase);

  useEffect(() => {
    setHydrated();
    void refreshFromSupabase();
  }, [setHydrated, refreshFromSupabase]);

  return null;
}
