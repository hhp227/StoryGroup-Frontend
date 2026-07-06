"use client";

import { useState } from "react";
import { useRtcSession } from "@/hooks/use-rtc-session";
import { VideoCallPanel } from "@/components/video-call-panel";

// DM 1:1 통화 — 시그널링 방은 DM 채팅방 id를 그대로 쓴다(chat-rooms/{id}, Phase 7 설계 문서 D2).
// "calling"(내가 걺 — 첫 연결 때 상대에게 CALL_INVITE 벨울림)과
// "joined"(받는 쪽 — 헤더 배너 수락으로 ?call=1 진입, 벨울림 없음)를 구분한다.
type CallMode = "idle" | "calling" | "joined";

export function DmCall({ token, chatRoomId }: { token: string; chatRoomId: number }) {
  // 받는 쪽 자동 합류: 헤더의 "받기"가 ?call=1로 이 화면을 연다. 이 컴포넌트는 auth 복원(isReady)
  // 이후에만 마운트되므로(SSR 출력 없음) 초기값에서 window를 읽어도 hydration 불일치가 없다.
  const [mode, setMode] = useState<CallMode>(() =>
    new URLSearchParams(window.location.search).get("call") === "1" ? "joined" : "idle"
  );

  const session = useRtcSession(token, "chat-rooms", chatRoomId, mode !== "idle", mode === "calling");

  if (mode === "idle") {
    return (
      <button className="btn btn-secondary" type="button" onClick={() => setMode("calling")}>
        📞 통화 걸기
      </button>
    );
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {mode === "calling" && session.status === "in-call" && session.remotePeers.length === 0 && (
        <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)", margin: 0 }}>
          상대를 호출했습니다. 받을 때까지 기다려주세요...
        </p>
      )}
      <VideoCallPanel session={session} onHangUp={() => setMode("idle")} />
    </div>
  );
}
