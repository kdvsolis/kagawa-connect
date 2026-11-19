"use client";

import { useEffect } from "react";
import { bindInstallCapture } from "@/lib/pwa-install";

export function PwaRegister() {
  useEffect(() => {
    bindInstallCapture();
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore */
    });
  }, []);
  return null;
}
