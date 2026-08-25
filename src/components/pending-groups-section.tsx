"use client";

import { useEffect, useState } from "react";
import { ApiError, cancelJoinRequest, listMyJoinRequests, type DiscoverGroup } from "@/lib/api";
import { GroupCover } from "./group-cover";

// KMP GroupsScreen PendingGroupsSection 미러 — 가입 신청중(PENDING) 그룹 목록+신청 취소.
// 신청 건이 없거나 로드에 실패하면 아무것도 렌더하지 않는다(숨은 섹션엔 에러를 보여줄 자리가 없다).
export function PendingGroupsSection({ token }: { token: string }) {
  const [groups, setGroups] = useState<DiscoverGroup[]>([]);
  // 신청 취소는 동시에 하나만(KMP cancelingGroupId 미러) — 진행 중이면 모든 취소 버튼을 잠근다.
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyJoinRequests(token)
      .then((rows) => {
        if (!cancelled) setGroups(rows);
      })
      .catch(() => {
        // 로드 실패 = 빈 목록 취급 — 섹션이 통째로 숨는다.
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (groups.length === 0) return null;

  function handleCancel(groupId: number) {
    setCancelingId(groupId);
    setError(null);
    cancelJoinRequest(token, groupId)
      .then(() => {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "신청 취소에 실패했습니다"))
      .finally(() => setCancelingId(null));
  }

  return (
    <section
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", marginBottom: "var(--sp-5)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>가입 신청중</h2>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--accent2)",
            background: "var(--accent2-soft)",
            borderRadius: 999,
            padding: "2px 8px",
          }}
        >
          {groups.length}
        </span>
      </div>
      {error && <p className="field-error">{error}</p>}
      {groups.map((group) => (
        // 행 자체는 클릭 없음(KMP 동일) — 미가입 그룹이라 이동할 상세가 없다.
        <div key={group.id} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <div style={{ width: 40, flexShrink: 0 }}>
            <GroupCover groupId={group.id} name={group.name} image={group.image} showInitial={false} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "0.92rem",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {group.name}
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>
              멤버 {group.memberCount}명{group.joinType === "APPROVAL_REQUIRED" && " · 승인제"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleCancel(group.id)}
            disabled={cancelingId !== null}
            style={{ fontSize: "0.8rem", flexShrink: 0 }}
          >
            {cancelingId === group.id ? "취소 중..." : "신청 취소"}
          </button>
        </div>
      ))}
    </section>
  );
}
