"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, cancelJoinRequest, listMyJoinRequests, type DiscoverGroup } from "@/lib/api";
import { GroupCover } from "./group-cover";

// KMP PendingGroupsScreen 미러 — 가입 신청중(PENDING) 탭: 목록+행에 바로 신청 취소.
// 독립 탭이라 빈 상태 문구와 로드 에러를 정식으로 보여준다(이전 인라인 섹션의 숨김 규칙 폐기).
export function PendingGroups({ token }: { token: string }) {
  const [groups, setGroups] = useState<DiscoverGroup[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  // 신청 취소는 동시에 하나만(KMP cancelingGroupId 미러) — 진행 중이면 모든 취소 버튼을 잠근다.
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyJoinRequests(token)
      .then((rows) => {
        if (!cancelled) setGroups(rows);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "가입 신청중 그룹을 불러오지 못했습니다");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleCancel(groupId: number) {
    setCancelingId(groupId);
    setCancelError(null);
    cancelJoinRequest(token, groupId)
      .then(() => {
        setGroups((prev) => prev?.filter((g) => g.id !== groupId) ?? prev);
      })
      .catch((err) => setCancelError(err instanceof ApiError ? err.message : "신청 취소에 실패했습니다"))
      .finally(() => setCancelingId(null));
  }

  if (loadError) return <p className="field-error">{loadError}</p>;
  if (groups === null) return <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>;
  if (groups.length === 0) {
    return (
      <p style={{ color: "var(--ink-faint)" }}>
        가입 신청중인 그룹이 없습니다.{" "}
        <Link href="/groups?tab=discover" style={{ color: "var(--accent)", fontWeight: 700 }}>
          그룹 찾기
        </Link>
        에서 승인제 그룹에 가입을 신청해보세요.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {cancelError && <p className="field-error">{cancelError}</p>}
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
    </div>
  );
}
