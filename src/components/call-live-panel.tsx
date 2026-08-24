"use client";

import { useCallback } from "react";
import Link from "next/link";
import { getUserIdFromToken, listChatRooms, listRtcRoster } from "@/lib/api";
import { usePolling } from "@/hooks/use-polling";

interface LiveState {
  activeCount: number;
  iAmIn: boolean;
}

// 그룹 사이드바 맨 위의 라이브 카드: 진행 중인 통화가 있을 때만 나타난다(페이스톡 전환 —
// 회의 엔티티 대신 기본 채팅방의 rtc 로스터 스냅숏을 본다). 통화 UI는 채팅 페이지에 있으므로
// 참가 버튼은 그리로 보낸다. 긴급성 콘텐츠라 공지/앨범보다 위에 배치한다.
export function CallLivePanel({ token, groupId }: { token: string; groupId: number }) {
  const myUserId = getUserIdFromToken(token);

  const fetchLive = useCallback(async (): Promise<LiveState | null> => {
    // 기본 채팅방 = 그룹 생성 시 자동으로 만들어지는, 가장 먼저 생성된 방(채팅 페이지 기본 선택과 동일)
    const rooms = await listChatRooms(token, groupId);
    if (rooms.length === 0) return null;
    const roster = await listRtcRoster(token, rooms[0].id);
    if (roster.length === 0) return null;
    return { activeCount: roster.length, iAmIn: roster.some((p) => p.userId === myUserId) };
  }, [token, groupId, myUserId]);

  const { data } = usePolling<LiveState | null>(fetchLive, 6000, [token, groupId]);

  if (!data) return null;

  return (
    <div
      className="card"
      style={{
        padding: "var(--sp-4)",
        border: "1px solid var(--accent)",
        background: "linear-gradient(var(--linen), color-mix(in srgb, var(--accent-soft) 35%, var(--linen)))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-1)" }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 0 3px var(--accent-soft)",
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 750, fontSize: "0.95rem" }}>화상회의 진행 중</span>
      </div>
      <p style={{ margin: "0 0 var(--sp-3)", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
        {data.activeCount}명이 통화하고 있어요
      </p>
      <Link className="btn btn-primary" href={`/groups/${groupId}/chat`} style={{ fontSize: "0.85rem" }}>
        {data.iAmIn ? "통화로 돌아가기" : "참가하기"}
      </Link>
    </div>
  );
}
