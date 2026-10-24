export type NotificationSupport = "unsupported" | NotificationPermission;

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
  const support = getNotificationSupport();
  if (support !== "default") return support;

  return Notification.requestPermission();
}

/* Shows a native notification when the browser allows it. Returns false when
   it could not be shown (no permission, or browsers such as Chrome on Android
   that only allow notifications from a service worker), so callers can fall
   back to an in-app message. */
export function showBrowserNotification(
  title: string,
  { body, tag, href }: { body: string; tag: string; href?: string },
) {
  if (getNotificationSupport() !== "granted") return false;

  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: "/icons/icon-192.png",
    });

    notification.onclick = () => {
      window.focus();
      if (href) window.location.assign(href);
      notification.close();
    };

    return true;
  } catch {
    return false;
  }
}
