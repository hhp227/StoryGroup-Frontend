"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listGroupNotices, type GroupNoticesPage } from "@/lib/api";

const PREVIEW_COUNT = 3;

// 사이드바 공지 패널: 최근 공지 3건 + 총 개수 배지, 줄 클릭 → 게시글 상세.
// 공지 전체는 피드 상단 고정으로 이미 노출되므로 여기선 최근 3건만 요약한다.
// 공지가 없으면 렌더하지 않는다(앨범 패널과 같은 규칙).
export function NoticePanel({ token, groupId }: { token: string; groupId: number }) {
  const [data, setData] = useState<GroupNoticesPage | null>(null);

  useEffect(() => {
    let cancelled = false;
    listGroupNotices(token, groupId, PREVIEW_COUNT)
      .then((fetched) => {
        if (!cancelled) setData(fetched);
      })
      .catch(() => {}); // 부가 정보라 실패 시 조용히 숨긴다
    return () => {
      cancelled = true;
    };
  }, [token, groupId]);

  if (!data || data.totalCount === 0) return null;

  return (
    <div className="card" style={{ padding: "var(--sp-4)", paddingBottom: "var(--sp-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>공지사항</span>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "1px 8px",
            borderRadius: 999,
            background: "var(--accent2-soft)",
            color: "var(--amber)",
          }}
        >
          {data.totalCount > 99 ? "99+" : data.totalCount}
        </span>
      </div>
      {data.notices.map((notice) => (
        <Link
          key={notice.id}
          href={`/groups/${groupId}/posts/${notice.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            padding: "9px 0",
            borderTop: "1px solid var(--stone-border)",
            fontSize: "0.85rem",
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {notice.text}
          </span>
          <span aria-hidden style={{ color: "var(--ink-faint)" }}>
            ›
          </span>
        </Link>
      ))}
    </div>
  );
}
