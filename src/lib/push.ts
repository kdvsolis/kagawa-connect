/** Browser / PWA local notifications (no VAPID server push yet). */

export type PushPayload = {
  title: string;
  body: string;
  href?: string;
  tag?: string;
};

export function notificationSupport(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationSupport()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!notificationSupport()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Show a system tray / lock-screen style alert when permission is granted. */
export async function showBrowserNotification(payload: PushPayload): Promise<void> {
  if (!notificationSupport()) return;
  if (Notification.permission !== "granted") return;

  const options: NotificationOptions = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag ?? "kagawa",
    data: { href: payload.href ?? "/" },
  };

  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) {
      await reg.showNotification(payload.title, options);
      return;
    }
  } catch {
    /* fall through to Notification ctor */
  }

  try {
    const n = new Notification(payload.title, options);
    n.onclick = () => {
      window.focus();
      if (payload.href) window.location.assign(payload.href);
      n.close();
    };
  } catch {
    /* ignore — Safari private / blocked */
  }
}
