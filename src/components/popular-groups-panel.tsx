"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { discoverGroups, type DiscoverGroup } from "@/lib/api";
import { GroupDetailDialog } from "@/components/group-discover";

const PREVIEW_COUNT = 5;

// 홈 사이드바 "인기 그룹": 멤버 수 많은 순 상위 그룹. 가입한 그룹이면 바로 이동하고,
// 아니면 그룹 찾기와 같은 상세 다이얼로그를 띄워 그 자리에서 가입/신청할 수 있게 한다.
export function PopularGroupsPanel({ token }: { token: string }) {
  const [groups, setGroups] = useState<DiscoverGroup[] | null>(null);
  const [selected, setSelected] = useState<DiscoverGroup | null>(null);

  useEffect(() => {
    discoverGroups(token, "", 0, PREVIEW_COUNT, "popular")
      .then(setGroups)
      .catch(() => setGroups([])); // 패널은 부가 정보라 실패해도 조용히 숨긴다
  }, [token]);

  function updateMembership(groupId: number, membership: DiscoverGroup["membership"]) {
    setGroups((prev) => prev?.map((g) => (g.id === groupId ? { ...g, membership } : g)) ?? null);
    setSelected((prev) => (prev && prev.id === groupId ? { ...prev, membership } : prev));
  }

  if (!groups || groups.length === 0) return null;

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "var(--sp-2)",
    padding: "9px 0",
    borderTop: "1px solid var(--stone-border)",
    fontSize: "0.85rem",
    width: "100%",
  } as const;

  return (
    <div className="card" style={{ padding: "var(--sp-4)", paddingBottom: "var(--sp-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>인기 그룹</span>
        <Link
          href="/groups?tab=discover"
          style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600 }}
        >
          전체 보기 →
        </Link>
      </div>
      {groups.map((group) =>
        group.membership === "MEMBER" ? (
          <Link key={group.id} href={`/groups/${group.id}`} style={rowStyle}>
            <PopularGroupRow group={group} />
          </Link>
        ) : (
          <button
            key={group.id}
            type="button"
            onClick={() => setSelected(group)}
            style={{ ...rowStyle, background: "none", border: "none", borderTop: "1px solid var(--stone-border)", cursor: "pointer", font: "inherit", color: "inherit", textAlign: "left" }}
          >
            <PopularGroupRow group={group} />
          </button>
        ),
      )}

      {selected && (
        <GroupDetailDialog
          token={token}
          group={selected}
          onClose={() => setSelected(null)}
          onMembershipChange={updateMembership}
        />
      )}
    </div>
  );
}

function PopularGroupRow({ group }: { group: DiscoverGroup }) {
  return (
    <>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {group.name}
      </span>
      <span style={{ flexShrink: 0, fontSize: "0.78rem", color: "var(--ink-faint)" }}>
        멤버 {group.memberCount}명
      </span>
      {group.membership === "MEMBER" && (
        <span className="chip chip-member" style={{ flexShrink: 0 }}>
          가입됨
        </span>
      )}
      {group.membership === "PENDING" && (
        <span className="chip" style={{ flexShrink: 0 }}>
          신청 대기
        </span>
      )}
      <span aria-hidden style={{ color: "var(--ink-faint)" }}>
        ›
      </span>
    </>
  );
}
