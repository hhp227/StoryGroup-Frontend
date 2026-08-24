"use client";

import type { DiscoverGroup } from "@/lib/api";
import { GroupCover } from "@/components/group-cover";

// 그룹 탐색 카드 - 가입 버튼은 카드에 두지 않고, 클릭하면 상세 다이얼로그에서 가입/신청한다.
export function DiscoverGroupCard({ group, onSelect }: { group: DiscoverGroup; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--sp-2)",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        font: "inherit",
        color: "inherit",
      }}
    >
      <GroupCover groupId={group.id} name={group.name} image={group.image}>
        {group.membership === "MEMBER" && (
          <span className="chip chip-member" style={{ position: "absolute", top: 8, right: 8, background: "var(--linen)" }}>
            가입됨
          </span>
        )}
        {group.membership === "PENDING" && (
          <span className="chip" style={{ position: "absolute", top: 8, right: 8, background: "var(--linen)" }}>
            신청 대기
          </span>
        )}
      </GroupCover>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{group.name}</span>
        <span style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>
          멤버 {group.memberCount}명{group.joinType === "APPROVAL_REQUIRED" && " · 승인제"}
        </span>
        {group.description && (
          <span
            style={{
              fontSize: "0.82rem",
              color: "var(--ink-soft)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {group.description}
          </span>
        )}
      </div>
    </button>
  );
}
