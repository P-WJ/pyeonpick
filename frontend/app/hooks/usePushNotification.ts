"use client";

import { useState, useEffect, useCallback } from "react";

const SERVICE_WORKER_PATH = "/sw.js";
const LOCAL_STORAGE_SUBSCRIBED_KEY = "pyeonpick-push-subscribed";

// ArrayBuffer → base64url 변환 (Web Push 키 포맷 요구사항)
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// base64url 문자열 → Uint8Array<ArrayBuffer> (VAPID 공개키 변환)
// Web Push API의 applicationServerKey는 ArrayBuffer 타입을 요구합니다.
function base64UrlToUint8Array(base64UrlString: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64UrlString.length % 4)) % 4);
  const base64 = (base64UrlString + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSubscriptionSettings {
  keywords: string[];
  stores: string[];
}

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscribe: (keywords?: string[], stores?: string[]) => Promise<void>;
  unsubscribe: () => Promise<void>;
  fetchCurrentSettings: () => Promise<PushSubscriptionSettings | null>;
}

export function usePushNotification(): PushNotificationState {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      // 로컬스토리지에 구독 상태 캐싱 (새로고침 시 깜박임 방지)
      const cached = localStorage.getItem(LOCAL_STORAGE_SUBSCRIBED_KEY);
      if (cached === "true") {
        setIsSubscribed(true);
      }

      // 실제 서비스 워커 구독 상태 확인
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          const subscribed = subscription !== null;
          setIsSubscribed(subscribed);
          localStorage.setItem(LOCAL_STORAGE_SUBSCRIBED_KEY, String(subscribed));
        });
      });
    }
  }, []);

  const subscribe = useCallback(
    async (keywords: string[] = [], stores: string[] = []) => {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("VAPID 공개키가 설정되지 않았습니다. 관리자에게 문의해주세요.");
      }

      // 서비스 워커 등록
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
      await navigator.serviceWorker.ready;

      // 알림 권한 요청
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        throw new Error("알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.");
      }

      // 기존 구독 해제 후 재구독
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
      });

      const subscriptionJson = newSubscription.toJSON();
      const endpoint = subscriptionJson.endpoint ?? "";
      const p256dh = subscriptionJson.keys?.p256dh ?? "";
      const auth = subscriptionJson.keys?.auth ?? "";

      if (!endpoint || !p256dh || !auth) {
        throw new Error("구독 정보를 읽는 데 실패했습니다. 다시 시도해주세요.");
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, p256dh, auth, keywords, stores }),
      });

      const json = (await response.json()) as { data: unknown; error: string | null };
      if (!response.ok || json.error) {
        throw new Error(json.error ?? "서버에 구독 정보를 저장하는 데 실패했습니다.");
      }

      setIsSubscribed(true);
      localStorage.setItem(LOCAL_STORAGE_SUBSCRIBED_KEY, "true");
    },
    []
  );

  const fetchCurrentSettings = useCallback(
    async (): Promise<PushSubscriptionSettings | null> => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return null;

        const response = await fetch(
          "/api/push/subscription?endpoint=" + encodeURIComponent(subscription.endpoint)
        );
        const json = (await response.json()) as {
          data: PushSubscriptionSettings | null;
          error: string | null;
        };

        if (!response.ok || json.error || !json.data) return null;
        return json.data;
      } catch {
        return null;
      }
    },
    []
  );

  const unsubscribe = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      setIsSubscribed(false);
      localStorage.setItem(LOCAL_STORAGE_SUBSCRIBED_KEY, "false");
      return;
    }

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const response = await fetch("/api/push/unsubscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });

    const json = (await response.json()) as { data: unknown; error: string | null };
    if (!response.ok || json.error) {
      throw new Error(json.error ?? "서버에서 구독을 해제하는 데 실패했습니다.");
    }

    setIsSubscribed(false);
    localStorage.setItem(LOCAL_STORAGE_SUBSCRIBED_KEY, "false");
  }, []);

  return { isSupported, permission, isSubscribed, subscribe, unsubscribe, fetchCurrentSettings };
}

// 사용되지 않으나 추후 서버 유틸리티에서 필요할 수 있어 export
export { arrayBufferToBase64Url };
