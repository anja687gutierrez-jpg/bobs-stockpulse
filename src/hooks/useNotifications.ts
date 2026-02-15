"use client";

import { useState, useEffect, useCallback } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied" as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;

      let perm = permission;
      if (perm === "default") {
        perm = await requestPermission();
      }

      if (perm === "granted") {
        new Notification(title, {
          icon: "/favicon.ico",
          ...options,
        });
      }
    },
    [permission, requestPermission]
  );

  return { permission, requestPermission, showNotification };
}
