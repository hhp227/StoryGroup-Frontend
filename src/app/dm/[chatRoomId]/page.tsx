"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { DirectMessageThread } from "@/components/dm-thread";
import { DmCall } from "@/components/dm-call";
import type { CallSessionHandle } from "@/components/group-call-session";
import { listDirectRooms, type DirectRoom } from "@/lib/api";

function DmThreadPageInner() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ chatRoomId: string }>();
  const searchParams = useSearchParams();
  const chatRoomId = Number(params.chatRoomId);
  // 이 방 화면에 이미 있는 상태에서 통화를 수락하면 경로는 그대로고 쿼리만 바뀐다 —
  // call 파라미터를 key에 걸어 DmCall을 리마운트시켜 joined 모드로 다시 태운다.
  const callParam = searchParams.get("call") ?? "0";
  // 입력창 첨부 패널의 보이스톡/페이스톡이 이 통화를 시작시킨다(훅이라 이른 return보다 위에 있어야 한다).
  const callHandle = useRef<CallSessionHandle | null>(null);
  // 우측 드로어(대화상대/사진/통화) — 헤더 행의 ☰ 버튼이 연다(KMP 상단바 미러).
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 헤더·드로어 제목용 상대 이름 — 방 단건 조회 API가 없어 내 DM 방 목록에서 찾는다.
  const [room, setRoom] = useState<DirectRoom | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    listDirectRooms(accessToken)
      .then((rooms) => {
        if (!cancelled) setRoom(rooms.find((r) => r.id === chatRoomId) ?? null);
      })
      // 실패해도 헤더는 폴백("1:1 대화")으로 동작하고, 스레드 쪽 에러가 따로 보인다.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken, chatRoomId]);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>{room?.otherUserName ?? "1:1 대화"}</h1>
        <button type="button" className="chat-drawer-trigger" aria-label="채팅방 메뉴" onClick={() => setDrawerOpen(true)}>
          ☰
        </button>
      </div>
      <DmCall key={`call-${chatRoomId}-${callParam}`} token={accessToken} chatRoomId={chatRoomId} handleRef={callHandle} />
      <DirectMessageThread
        key={chatRoomId}
        token={accessToken}
        chatRoomId={chatRoomId}
        roomTitle={room?.otherUserName}
        onStartCall={(video) => callHandle.current?.start(video)}
        drawerOpen={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

// useSearchParams는 Suspense 경계가 필요하다(로그인 페이지와 같은 관례).
export default function DmThreadPage() {
  return (
    <Suspense>
      <DmThreadPageInner />
    </Suspense>
  );
}
