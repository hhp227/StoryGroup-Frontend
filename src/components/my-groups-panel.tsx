"use client";

import Link from "next/link";
import type { Group } from "@/lib/api";
import { roleChipClass, roleLabel } from "@/lib/roles";

const PREVIEW_COUNT = 5;

// 홈 사이드바 "내 그룹": 홈이 라운지를 찾느라 이미 받아둔 그룹 목록을 그대로 넘겨받는다(추가 요청 없음).
// 라운지는 홈 피드 자체가 라운지라 목록에서 제외하고, 속한 그룹이 없으면 렌더하지 않는다.
export function MyGroupsPanel({ groups }: { groups: Group[] }) {
  const myGroups = groups.filter((g) => !g.isLounge);
  if (myGroups.length === 0) return null;

  const visible = myGroups.slice(0, PREVIEW_COUNT);

  return (
    <div className="card" style={{ padding: "var(--sp-4)", paddingBottom: "var(--sp-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>내 그룹</span>
        {myGroups.length > PREVIEW_COUNT && (
          <Link href="/groups" style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600 }}>
            전체 보기 →
          </Link>
        )}
      </div>
      {visible.map((group) => (
        <Link
          key={group.id}
          href={`/groups/${group.id}`}
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
            {group.name}
          </span>
          <span className={roleChipClass(group.myRole)} style={{ flexShrink: 0 }}>
            {roleLabel(group.myRole)}
          </span>
          <span aria-hidden style={{ color: "var(--ink-faint)" }}>
            ›
          </span>
        </Link>
      ))}
    </div>
  );
}
