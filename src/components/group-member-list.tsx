"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  getGroup,
  getOrCreateDirectRoom,
  getUserIdFromToken,
  kickMember,
  listMembers,
  updateMemberRole,
  type Group,
  type Member,
} from "@/lib/api";
import { canModerate, roleChipClass, roleLabel } from "@/lib/roles";

export function GroupMemberList({ token, groupId }: { token: string; groupId: number }) {
  const router = useRouter();
  const myUserId = getUserIdFromToken(token);

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<number | null>(null);

  const myRole = group?.myRole;

  useEffect(() => {
    Promise.all([getGroup(token, groupId), listMembers(token, groupId)])
      .then(([g, m]) => {
        setGroup(g);
        setMembers(m);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "멤버 목록을 불러오지 못했습니다"));
  }, [token, groupId]);

  async function handleMessage(userId: number) {
    setActionError(null);
    setBusyFor(userId);
    try {
      const room = await getOrCreateDirectRoom(token, userId);
      router.push(`/dm/${room.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "DM을 시작하지 못했습니다");
    } finally {
      setBusyFor(null);
    }
  }

  async function handleRoleChange(member: Member) {
    const nextRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    setActionError(null);
    setBusyFor(member.userId);
    try {
      await updateMemberRole(token, groupId, member.userId, nextRole);
      setMembers((prev) => prev?.map((m) => (m.userId === member.userId ? { ...m, role: nextRole } : m)) ?? null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "등급 변경에 실패했습니다");
    } finally {
      setBusyFor(null);
    }
  }

  async function handleKick(member: Member) {
    setActionError(null);
    setBusyFor(member.userId);
    try {
      await kickMember(token, groupId, member.userId);
      setMembers((prev) => prev?.filter((m) => m.userId !== member.userId) ?? null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "내보내기에 실패했습니다");
    } finally {
      setBusyFor(null);
    }
  }

  // 계층 준수(백엔드와 동일): 방장은 부방장/멤버를, 부방장은 멤버만 내보낼 수 있다.
  function canKick(target: Member): boolean {
    if (target.userId === myUserId || target.role === "OWNER") return false;
    if (myRole === "OWNER") return true;
    return myRole === "ADMIN" && target.role === "MEMBER";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {actionError && <p className="field-error">{actionError}</p>}
      {members === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {members?.map((member) => {
        const isSelf = member.userId === myUserId;
        const busy = busyFor === member.userId;
        return (
          <div key={member.userId} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", flexWrap: "wrap" }}>
            <div className="avatar">{member.name.slice(0, 1)}</div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 120 }}>
              <span style={{ fontWeight: 700 }}>{member.name}</span>
              <span className={roleChipClass(member.role)} style={{ width: "fit-content", marginTop: 2 }}>
                {roleLabel(member.role)}
              </span>
            </div>
            <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
              {!isSelf && (
                <button className="btn btn-secondary" type="button" onClick={() => handleMessage(member.userId)} disabled={busy}>
                  메시지
                </button>
              )}
              {myRole === "OWNER" && !isSelf && member.role !== "OWNER" && !group?.isLounge && (
                <button className="btn btn-secondary" type="button" onClick={() => handleRoleChange(member)} disabled={busy}>
                  {member.role === "ADMIN" ? "부방장 해제" : "부방장 지정"}
                </button>
              )}
              {canModerate(myRole) && canKick(member) && !group?.isLounge && (
                <button className="btn btn-danger" type="button" onClick={() => handleKick(member)} disabled={busy}>
                  내보내기
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
