"use client";

import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { NOTIFICATIONS_DESTINATION, wsUrl, type NotificationQueueEvent } from "@/lib/ws";

// 개인 알림 큐 구독 훅(헤더 배지용). useChatSocket과 같은 골격이지만
// - 화면 어디서든 하나만 떠 있는 전역 성격이라 상태(연결중 표시)는 노출하지 않고
// - (재)연결 때마다 onConnect로 미확인 개수를 REST로 다시 세게 한다(끊긴 사이 공백 복구).
// 이 큐에는 알림(NOTIFICATION) 외에 DM 통화 벨울림(CALL_INVITE)도 실려 온다 — 호출부가 type으로 분기.
export function useNotificationSocket(
  token: string | null,
  onConnect: () => void,
  onEvent: (event: NotificationQueueEvent) => void
): void {
  const onConnectRef = useRef(onConnect);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onConnectRef.current = onConnect;
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!token) return;
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(NOTIFICATIONS_DESTINATION, (frame) => {
          onEventRef.current(JSON.parse(frame.body) as NotificationQueueEvent);
        });
        onConnectRef.current();
      },
      onStompError: () => {
        // 토큰 무효 등 — 재시도해도 소용없으므로 멈춘다(배지는 마지막 값 유지).
        client.deactivate();
      },
    });
    client.activate();
    return () => {
      client.deactivate();
    };
  }, [token]);
}
