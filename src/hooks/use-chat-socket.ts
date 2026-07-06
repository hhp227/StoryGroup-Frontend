"use client";

import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { chatRoomTopic, wsUrl, type ChatSocketEvent } from "@/lib/ws";

export type SocketStatus = "connecting" | "connected" | "error";

// 채팅방 하나에 대한 STOMP 연결/구독 수명주기 훅.
// - 인증은 CONNECT 프레임의 Authorization 헤더로(백엔드 StompAuthChannelInterceptor).
// - 재연결(5초 간격)은 stompjs에 맡기고, (재)연결 성공 때마다 onConnect를 불러
//   호출부가 REST로 메시지를 다시 불러오게 한다 — 끊겨 있던 사이의 공백은 이걸로 메꾼다.
//   (Cloud Run이 WebSocket을 최대 1시간마다 끊으므로 재연결은 정상 동작 경로다.)
// - 서버가 보내는 ERROR 프레임(토큰 무효/구독 거부)은 재시도해도 소용없으므로
//   재연결을 멈추고 error 상태로 남긴다.
// - 방이 바뀔 때 상태 초기화는 호출부의 key={chatRoomId} 리마운트에 맡긴다(이 프로젝트 관례).
export function useChatSocket(
  token: string,
  chatRoomId: number,
  onConnect: () => void,
  onEvent: (event: ChatSocketEvent) => void
): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>("connecting");
  // 콜백은 매 렌더 새 클로저지만 연결을 재시작할 이유는 아니므로 ref로만 최신화(usePolling과 같은 패턴).
  const onConnectRef = useRef(onConnect);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onConnectRef.current = onConnect;
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setStatus("connected");
        client.subscribe(chatRoomTopic(chatRoomId), (frame) => {
          onEventRef.current(JSON.parse(frame.body) as ChatSocketEvent);
        });
        onConnectRef.current();
      },
      onWebSocketClose: () => {
        // error로 끝난 연결이 닫히는 것까지 connecting으로 되돌리지 않는다.
        setStatus((prev) => (prev === "error" ? prev : "connecting"));
      },
      onStompError: () => {
        setStatus("error");
        client.deactivate();
      },
    });
    client.activate();
    return () => {
      client.deactivate();
    };
  }, [token, chatRoomId]);

  return status;
}
