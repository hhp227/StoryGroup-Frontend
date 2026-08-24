"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ChatRoomTabs } from "@/components/chat-room-tabs";
import { ChatThread } from "@/components/chat-thread";
import { GroupCallSession, type CallSessionHandle } from "@/components/group-call-session";
import { GroupMemberStrip } from "@/components/group-member-strip";
import { ApiError, listChatRooms, type ChatRoom } from "@/lib/api";

export default function GroupChatPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);
  const searchParams = useSearchParams();
  // 채팅 허브(/dm)에서 특정 방으로 들어올 때 쓰는 프리셀렉트(?room=). 없거나 목록에 없으면 기본 방.
  const preferredRoomId = Number(searchParams.get("room"));

  // 입력창 첨부 패널의 보이스톡/페이스톡이 이 통화 세션을 시작시킨다.
  const callHandle = useRef<CallSessionHandle | null>(null);

  const [rooms, setRooms] = useState<ChatRoom[] | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRooms = useCallback(
    (token: string) =>
      listChatRooms(token, groupId)
        .then((fetched) => {
          setRooms(fetched);
          if (fetched.length === 0) {
            setLoadError("채팅방을 찾을 수 없습니다");
            return;
          }
          // 그룹 생성 시 자동으로 만들어지는 기본 채팅방이 항상 가장 먼저 생성된 방이라 기본 선택으로 쓴다.
          setSelectedRoomId(fetched.some((r) => r.id === preferredRoomId) ? preferredRoomId : fetched[0].id);
        })
        .catch((err) => setLoadError(err instanceof ApiError ? err.message : "채팅방을 불러오지 못했습니다")),
    [groupId, preferredRoomId]
  );

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    loadRooms(accessToken);
  }, [isReady, accessToken, router, loadRooms]);

  if (!isReady || !accessToken) return null;

  function handleRoomCreated(room: ChatRoom) {
    setRooms((prev) => [...(prev ?? []), room]);
    setSelectedRoomId(room.id);
  }

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      {/* 그룹 파일함 진입 버튼은 뺐다 — 채팅 첨부는 그룹 파일함(/api/groups/{id}/files)이 아니라
          스토리지에만 저장돼서 여기서 올린 파일이 거기 쌓이지 않는다. 파일함은 그룹 상세 사이드바와
          검색에서 들어가고, 입력창 첨부 패널의 "파일"(보내기)과 이름이 겹쳐 헷갈리기도 했다. */}
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>채팅</h1>

      <GroupMemberStrip token={accessToken} groupId={groupId} />

      {loadError && <p className="field-error">{loadError}</p>}

      {rooms && rooms.length > 0 && selectedRoomId !== null && (
        <>
          <ChatRoomTabs
            token={accessToken}
            groupId={groupId}
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            onSelect={setSelectedRoomId}
            onCreated={handleRoomCreated}
          />
          {/* 방 통화 — 채팅방 세션에 통화가 붙는다(페이스톡 미러). 헤더 배너 수락(?call=1)은
              room·call 파라미터를 key에 걸어 리마운트시켜 벨울림 없이 바로 합류한다(DM 화면 미러). */}
          <GroupCallSession
            key={`call-${selectedRoomId}-${searchParams.get("call") ?? "0"}`}
            token={accessToken}
            groupId={groupId}
            chatRoomId={selectedRoomId}
            handleRef={callHandle}
          />
          <ChatThread
            key={selectedRoomId}
            token={accessToken}
            groupId={groupId}
            chatRoomId={selectedRoomId}
            onStartCall={(video) => callHandle.current?.start(video)}
          />
        </>
      )}
    </div>
  );
}
