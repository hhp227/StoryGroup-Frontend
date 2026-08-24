"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import {
  ApiError,
  blockUser,
  listBlockedUsers,
  listDirectRooms,
  unblockUser,
  type DirectRoom,
} from "@/lib/api";

export function DmRoomList({ token }: { token: string }) {
  const [rooms, setRooms] = useState<DirectRoom[] | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<number>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<number | null>(null);

  useEffect(() => {
    listDirectRooms(token)
      .then(setRooms)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "DM 목록을 불러오지 못했습니다"));
    // 상대별 차단/해제 버튼 상태 표시용. 실패해도 목록 자체는 보여준다.
    listBlockedUsers(token)
      .then((blocked) => setBlockedIds(new Set(blocked.map((b) => b.userId))))
      .catch(() => {});
  }, [token]);

  // 카드 전체가 방으로 가는 Link라 버튼 클릭이 내비게이션으로 번지지 않게 막는다.
  async function handleBlockToggle(e: MouseEvent, room: DirectRoom) {
    e.preventDefault();
    e.stopPropagation();
    const isBlocked = blockedIds.has(room.otherUserId);
    setActionError(null);
    setBusyFor(room.otherUserId);
    try {
      if (isBlocked) {
        await unblockUser(token, room.otherUserId);
      } else {
        await blockUser(token, room.otherUserId);
      }
      setBlockedIds((prev) => {
        const next = new Set(prev);
        if (isBlocked) next.delete(room.otherUserId);
        else next.add(room.otherUserId);
        return next;
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "차단 처리에 실패했습니다");
    } finally {
      setBusyFor(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {actionError && <p className="field-error">{actionError}</p>}
      {rooms === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {rooms?.length === 0 && (
        <p style={{ color: "var(--ink-faint)" }}>아직 DM이 없습니다. 그룹 멤버 목록에서 메시지를 시작해보세요.</p>
      )}
      {rooms?.map((room) => {
        const isBlocked = blockedIds.has(room.otherUserId);
        return (
          <Link key={room.id} href={`/dm/${room.id}`}>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", cursor: "pointer" }}>
              <div className="avatar">{room.otherUserName.slice(0, 1)}</div>
              <span style={{ fontWeight: 700, flex: 1 }}>{room.otherUserName}</span>
              {isBlocked && (
                <span className="chip" style={{ background: "var(--paper)" }}>
                  차단됨
                </span>
              )}
              <button
                className={isBlocked ? "btn btn-secondary" : "btn btn-ghost"}
                type="button"
                onClick={(e) => handleBlockToggle(e, room)}
                disabled={busyFor === room.otherUserId}
              >
                {isBlocked ? "차단 해제" : "차단"}
              </button>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
