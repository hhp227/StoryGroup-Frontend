"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listMembers, type Member } from "@/lib/api";

const VISIBLE_COUNT = 5;

// 그룹 사이드바 "멤버": 아바타 몇 개 + 총원. 공지/앨범과 달리 항상 내용이 있어(멤버 ≥ 1)
// 사이드바의 하단 앵커 역할을 한다. 클릭 동선은 전부 멤버 페이지로.
export function MemberPanel({ token, groupId }: { token: string; groupId: number }) {
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMembers(token, groupId)
      .then((fetched) => {
        if (!cancelled) setMembers(fetched);
      })
      .catch(() => {}); // 부가 정보라 실패 시 조용히 숨긴다
    return () => {
      cancelled = true;
    };
  }, [token, groupId]);

  if (!members || members.length === 0) return null;

  const visible = members.slice(0, VISIBLE_COUNT);
  const overflow = members.length - visible.length;

  return (
    <div className="card" style={{ padding: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-3)" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
          멤버 <span style={{ color: "var(--ink-faint)", fontWeight: 600, fontSize: "0.8rem" }}>{members.length}명</span>
        </span>
        <Link href={`/groups/${groupId}/members`} style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600 }}>
          전체 보기 →
        </Link>
      </div>
      <Link href={`/groups/${groupId}/members`} style={{ display: "flex" }}>
        {visible.map((member, index) => (
          <span
            key={member.userId}
            className="avatar sm"
            style={{ marginLeft: index === 0 ? 0 : -8, border: "2px solid var(--linen)" }}
          >
            {member.name.slice(0, 1)}
          </span>
        ))}
        {overflow > 0 && (
          <span
            className="avatar sm"
            style={{ marginLeft: -8, border: "2px solid var(--linen)", background: "var(--stone-border)", color: "var(--ink-soft)" }}
          >
            +{overflow}
          </span>
        )}
      </Link>
    </div>
  );
}
