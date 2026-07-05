"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, listDirectRooms, type DirectRoom } from "@/lib/api";

export function DmRoomList({ token }: { token: string }) {
  const [rooms, setRooms] = useState<DirectRoom[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listDirectRooms(token)
      .then(setRooms)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "DM 목록을 불러오지 못했습니다"));
  }, [token]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {rooms === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {rooms?.length === 0 && (
        <p style={{ color: "var(--ink-faint)" }}>아직 DM이 없습니다. 그룹 멤버 목록에서 메시지를 시작해보세요.</p>
      )}
      {rooms?.map((room) => (
        <Link key={room.id} href={`/dm/${room.id}`}>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", cursor: "pointer" }}>
            <div className="avatar">{room.otherUserName.slice(0, 1)}</div>
            <span style={{ fontWeight: 700 }}>{room.otherUserName}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
