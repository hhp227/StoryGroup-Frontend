"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listUpcomingEvents, type GroupEvent } from "@/lib/api";

const PREVIEW_COUNT = 3;

// 사이드바 "다가오는 일정": 가까운 순 3건, 날짜 뱃지 + 제목 + 참석 인원. 클릭/헤더 → 일정(캘린더) 페이지.
// 다가오는 일정이 없으면 렌더하지 않는다(공지/앨범 패널과 같은 규칙) — 진입점은 상단 "일정" 버튼이 항상 있다.
export function EventPanel({ token, groupId }: { token: string; groupId: number }) {
  const [events, setEvents] = useState<GroupEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listUpcomingEvents(token, groupId, PREVIEW_COUNT)
      .then((fetched) => {
        if (!cancelled) setEvents(fetched);
      })
      .catch(() => {}); // 부가 정보라 실패 시 조용히 숨긴다
    return () => {
      cancelled = true;
    };
  }, [token, groupId]);

  if (!events || events.length === 0) return null;

  return (
    <div className="card" style={{ padding: "var(--sp-4)", paddingBottom: "var(--sp-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>다가오는 일정</span>
        <Link
          href={`/groups/${groupId}/events`}
          style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600 }}
        >
          캘린더 →
        </Link>
      </div>
      {events.map((event) => {
        const startsAt = new Date(event.startsAt);
        return (
          <Link
            key={event.id}
            href={`/groups/${groupId}/events`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--sp-3)",
              padding: "9px 0",
              borderTop: "1px solid var(--stone-border)",
              fontSize: "0.85rem",
            }}
          >
            {/* 날짜 뱃지: 월/일 두 줄 — 캘린더 진입 전에 날짜부터 눈에 들어오게 */}
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 34,
                padding: "3px 0",
                borderRadius: 8,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                lineHeight: 1.2,
              }}
            >
              <span style={{ fontSize: "0.62rem", fontWeight: 700 }}>{startsAt.getMonth() + 1}월</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{startsAt.getDate()}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                {event.title}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                {startsAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} · 참석 {event.goingCount}명
              </span>
            </span>
            <span aria-hidden style={{ color: "var(--ink-faint)" }}>
              ›
            </span>
          </Link>
        );
      })}
    </div>
  );
}
