// FCM 백그라운드 수신 — 탭이 없거나 백그라운드일 때만 이 핸들러가 표시를 담당한다(설계 §8).
// 포그라운드 탭은 인앱 STOMP가 담당(onMessage 미사용). config는 src/lib/push.ts와 동일 값.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBY23Gz8PIDoiEosYjLxY4PUFj-_sYQNhg", // src/lib/push.ts의 FIREBASE_CONFIG와 문자 그대로 동일하게
  authDomain: "application-bb416.firebaseapp.com",
  projectId: "application-bb416",
  messagingSenderId: "476947981226",
  appId: "1:476947981226:web:5434c0a0eaaa35580081d3",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  if (!d.title) return;
  // 채팅은 방 단위, 알림은 건별로 접는다(tag 동일 → 갱신)
  const tag = d.kind === "CHAT" ? "chat-" + d.chatRoomId : "notif-" + (d.notificationId || "");
  self.registration.showNotification(d.title, { body: d.body || "", data: d, tag });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url =
    d.kind === "CHAT" && d.chatRoomId ? "/dm/" + d.chatRoomId
    : d.postId && d.groupId ? "/groups/" + d.groupId + "/posts/" + d.postId
    : d.groupId ? "/groups/" + d.groupId
    : "/notifications";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => "focus" in c);
      if (existing) {
        existing.focus();
        // SW 제어 밖(등록 직후 첫 세션) 탭은 navigate가 거부된다 — 새 창으로 폴백
        return existing.navigate(url).catch(() => clients.openWindow(url));
      }
      return clients.openWindow(url);
    })
  );
});
