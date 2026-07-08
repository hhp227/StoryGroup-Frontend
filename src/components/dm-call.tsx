"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRtcSession } from "@/hooks/use-rtc-session";
import { VideoCallPanel } from "@/components/video-call-panel";

// DM 1:1 통화 — 시그널링 방은 DM 채팅방 id를 그대로 쓴다(chat-rooms/{id}, Phase 7 설계 문서 D2).
// "calling"(내가 걺 — 첫 연결 때 상대에게 CALL_INVITE 벨울림)과
// "joined"(받는 쪽 — 헤더 배너 수락으로 ?call=1 진입, 벨울림 없음)를 구분한다.
type CallMode = "idle" | "calling" | "joined";

function DmCallInner({ token, chatRoomId }: { token: string; chatRoomId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 받는 쪽 자동 합류: 헤더의 "받기"가 ?call=1로 이 화면을 연다. router.push 클라이언트 내비게이션은
  // 새 화면을 먼저 렌더한 뒤에야 window.location을 갱신하므로 window 직접 읽기는 항상 이전 URL을
  // 보게 된다 — 반드시 useSearchParams로 읽어야 한다. 이미 이 방 화면에 있는 상태에서의 수락(쿼리만
  // 0→1로 바뀜)은 부모가 call 파라미터를 key에 걸어 리마운트시켜서 이 initializer가 다시 돈다.
  const [mode, setMode] = useState<CallMode>(() => (searchParams.get("call") === "1" ? "joined" : "idle"));

  const session = useRtcSession(token, "chat-rooms", chatRoomId, mode !== "idle", mode === "calling");

  function hangUp() {
    setMode("idle");
    // ?call=1을 지워둬야 같은 방에서 다음 수락이 다시 0→1 전환(리마운트)을 일으킨다.
    if (searchParams.get("call") === "1") router.replace(`/dm/${chatRoomId}`);
  }

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
      <VideoCallPanel session={session} onHangUp={hangUp} />
    </div>
  );
}

// useSearchParams는 Suspense 경계가 필요하다(로그인 페이지와 같은 관례).
export function DmCall(props: { token: string; chatRoomId: number }) {
  return (
    <Suspense>
      <DmCallInner {...props} />
    </Suspense>
  );
}
