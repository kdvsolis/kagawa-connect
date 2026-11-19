"use client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeInstall(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getInstallEvent() {
  return deferred;
}

/** Capture Chrome/Android install before the banner or button mounts. */
export function bindInstallCapture() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __kagawaInstallBound?: boolean };
  if (w.__kagawaInstallBound) return;
  w.__kagawaInstallBound = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isIosPhone() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const ipadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return ios || ipadOs;
}

export async function promptInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  emit();
  return choice.outcome === "accepted";
}
