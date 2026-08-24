"use client";

import { Suspense, useCallback, useImperativeHandle, useState, type RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listRtcRoster, type RtcRosterPeer } from "@/lib/api";
import { usePolling } from "@/hooks/use-polling";
import { useRtcSession } from "@/hooks/use-rtc-session";
import { VideoCallPanel } from "@/components/video-call-panel";

// 그룹 방 통화 — 채팅방 세션에 통화가 붙는다(페이스톡 미러, 회의 엔티티 폐기).
// 시그널링 방은 채팅방 id를 그대로 쓴다(chat-rooms/{id}) — DM 통화(dm-call)와 같은 레일이고,
// 다인 통화는 같은 풀 메시가 그대로 처리한다(D1). "시작"은 벨울림(방 멤버 팬아웃)을 겸하고,
// 이미 진행 중이면 참가(벨울림 없음 — 서버 게이트도 이중 방어)다.
// 받는 쪽은 헤더 배너 수락이 ?room={id}&call=1로 이 화면을 열어 벨울림 없이 합류한다(dm-call 미러).
type CallMode = "idle" | "calling" | "joined";

// 입력창 첨부 패널의 보이스톡/페이스톡이 이 통화를 시작시킨다 — 통화 상태는 여기 그대로 두고
// 시작 동작만 밖으로 노출한다(상태를 페이지로 올리면 ?call=1 자동 합류 규칙까지 따라 올라간다).
export interface CallSessionHandle {
  start: (video: boolean) => void;
}

function GroupCallSessionInner({
  token,
  groupId,
  chatRoomId,
  handleRef,
}: {
  token: string;
  groupId: number;
  chatRoomId: number;
  handleRef?: RefObject<CallSessionHandle | null>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 받는 쪽 자동 합류 — 부모(채팅 페이지)가 room·call 파라미터를 key에 걸어 리마운트시켜
  // 이 initializer가 다시 돈다(dm-call과 동일한 규칙).
  const [mode, setMode] = useState<CallMode>(() =>
    searchParams.get("call") === "1" && Number(searchParams.get("room")) === chatRoomId ? "joined" : "idle"
  );
  // 보이스톡이면 카메라를 끈 채로 시작한다. 통화가 idle일 때만 바뀌므로 세션을 다시 태우지 않는다.
  const [wantVideo, setWantVideo] = useState(true);

  // "통화 중 N명" 미리보기 — 입장(구독) 없이 로스터 스냅숏만 폴링한다(사이드바 라이브 카드와 동일 주기).
  const fetchRoster = useCallback(() => listRtcRoster(token, chatRoomId), [token, chatRoomId]);
  // 폴링 에러는 쓰지 않는다 — 라이브 바는 통화가 있을 때만 나타나고, 배경 조회 실패를
  // 대화창 위에 띄우면 사용자가 할 일도 없는 경고만 남는다.
  const { data: roster } = usePolling<RtcRosterPeer[]>(fetchRoster, 6000, [token, chatRoomId]);

  const session = useRtcSession(token, "chat-rooms", chatRoomId, mode !== "idle", mode === "calling", !wantVideo);

  const activeCount = roster?.length ?? 0;

  // 이미 통화 중이면 무시한다 — 진행 중인 세션을 다시 태우면 연결이 끊긴다.
  // 남이 이미 통화 중이면 벨울림 없이 참가(아래 카드의 "참가" 버튼과 같은 판단).
  useImperativeHandle(
    handleRef,
    () => ({
      start: (video: boolean) => {
        if (mode !== "idle") return;
        setWantVideo(video);
        setMode(activeCount > 0 ? "joined" : "calling");
      },
    }),
    [mode, activeCount]
  );

  function hangUp() {
    setMode("idle");
    // ?call=1을 지워둬야 같은 방에서 다음 수락이 다시 리마운트를 일으킨다(dm-call 미러).
    if (searchParams.get("call") === "1") router.replace(`/groups/${groupId}/chat?room=${chatRoomId}`);
  }

  if (mode === "idle") {
    // 통화를 거는 건 입력창 첨부 패널이 맡는다 — 여기 상시 카드를 두면 대화창만 좁아진다.
    // 진행 중인 통화가 있을 때만 얇은 라이브 바를 띄운다(모바일 채팅방 미러).
    // 로스터 폴링 에러는 표시하지 않는다 — 배경 조회 실패라 사용자가 할 일이 없다.
    if (activeCount === 0) return null;
    return (
      <div className="call-live-bar">
        <span aria-hidden>🎥</span>
        <span className="call-live-bar-text">{roster!.map((p) => p.userName).join(", ")}님이 통화 중이에요</span>
        <button className="call-live-bar-join" type="button" onClick={() => setMode("joined")}>
          참가
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {mode === "calling" && session.status === "in-call" && session.remotePeers.length === 0 && (
        <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)", margin: 0 }}>
          그룹원을 호출했습니다. 들어올 때까지 기다려주세요...
        </p>
      )}
      <VideoCallPanel session={session} onHangUp={hangUp} />
    </div>
  );
}

// useSearchParams는 Suspense 경계가 필요하다(dm-call과 같은 관례).
export function GroupCallSession(props: {
  token: string;
  groupId: number;
  chatRoomId: number;
  handleRef?: RefObject<CallSessionHandle | null>;
}) {
  return (
    <Suspense>
      <GroupCallSessionInner {...props} />
    </Suspense>
  );
}
