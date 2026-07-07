"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ChatRoomTabs } from "@/components/chat-room-tabs";
import { ChatThread } from "@/components/chat-thread";
import { GroupMeetingSession } from "@/components/group-meeting-session";
import { GroupMemberStrip } from "@/components/group-member-strip";
import { ApiError, listChatRooms, type ChatRoom } from "@/lib/api";

export default function GroupChatPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

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
          setSelectedRoomId(fetched[0].id);
        })
        .catch((err) => setLoadError(err instanceof ApiError ? err.message : "채팅방을 불러오지 못했습니다")),
    [groupId]
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>채팅</h1>
        <Link className="btn btn-secondary" href={`/groups/${groupId}/files`}>
          파일
        </Link>
      </div>

      <GroupMemberStrip token={accessToken} groupId={groupId} />

      {loadError && <p className="field-error">{loadError}</p>}

      <GroupMeetingSession token={accessToken} groupId={groupId} />

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
          <ChatThread key={selectedRoomId} token={accessToken} groupId={groupId} chatRoomId={selectedRoomId} />
        </>
      )}
    </div>
  );
}
