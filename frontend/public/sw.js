// 편픽(PyeonPick) Service Worker
// Web Push 수신 및 알림 표시를 담당합니다.

const PYEONPICK_ORIGIN = "https://pyeonpick.vercel.app";

// ─── push 이벤트: 서버에서 푸시 메시지 수신 ─────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "편픽 알림", body: event.data.text() };
  }

  const title = payload.title ?? "편픽 — 편의점 행사 알림";
  const options = {
    body: payload.body ?? "새로운 행사 상품이 등록되었습니다.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: payload.tag ?? "pyeonpick-push",
    data: {
      url: payload.url ?? PYEONPICK_ORIGIN,
    },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── notificationclick 이벤트: 알림 클릭 시 페이지 열기 ──────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url)
      ? event.notification.data.url
      : PYEONPICK_ORIGIN;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // 이미 열린 탭이 있으면 포커스
        for (const client of windowClients) {
          if (client.url.startsWith(PYEONPICK_ORIGIN) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // 없으면 새 탭 열기
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── pushsubscriptionchange 이벤트: 구독 만료/갱신 ──────────────────────────
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription
          ? event.oldSubscription.options.applicationServerKey
          : null,
      })
      .then((newSubscription) => {
        const { endpoint, keys } = newSubscription.toJSON();
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint,
            p256dh: keys && keys.p256dh ? keys.p256dh : "",
            auth: keys && keys.auth ? keys.auth : "",
          }),
        });
      })
  );
});
