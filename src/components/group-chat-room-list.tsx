"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, listMyGroupChatRooms, type GroupChatRoom } from "@/lib/api";

// 채팅 허브(/dm) "그룹 채팅" 섹션: 내가 속한 모든 그룹의 채팅방.
// 줄 클릭 → 그룹 채팅 페이지(해당 방 탭이 선택된 상태로).
export function GroupChatRoomList({ token }: { token: string }) {
  const [rooms, setRooms] = useState<GroupChatRoom[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listMyGroupChatRooms(token)
      .then(setRooms)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "그룹 채팅 목록을 불러오지 못했습니다"));
  }, [token]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {rooms === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {rooms?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>참여 중인 그룹 채팅이 없습니다.</p>}
      {rooms?.map((room) => (
        <Link key={room.id} href={`/groups/${room.groupId}/chat?room=${room.id}`}>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", cursor: "pointer" }}>
            <div className="avatar">{room.groupName.slice(0, 1)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {room.groupName}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>{room.name}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
