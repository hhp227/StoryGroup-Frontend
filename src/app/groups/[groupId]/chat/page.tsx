"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ChatThread } from "@/components/chat-thread";
import { GroupMeetingSession } from "@/components/group-meeting-session";
import { ApiError, listChatRooms } from "@/lib/api";

export default function GroupChatPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  const [chatRoomId, setChatRoomId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    listChatRooms(accessToken, groupId)
      .then((rooms) => {
        if (rooms.length === 0) {
          setLoadError("채팅방을 찾을 수 없습니다");
          return;
        }
        // 그룹 생성 시 자동으로 만들어지는 기본 채팅방이 항상 가장 먼저 생성된 방이다.
        setChatRoomId(rooms[0].id);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "채팅방을 불러오지 못했습니다"));
  }, [isReady, accessToken, groupId, router]);

  if (!isReady || !accessToken) return null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>채팅</h1>
      {loadError && <p className="field-error">{loadError}</p>}
      <GroupMeetingSession token={accessToken} groupId={groupId} />
      {chatRoomId !== null && <ChatThread key={chatRoomId} token={accessToken} groupId={groupId} chatRoomId={chatRoomId} />}
    </div>
  );
}
