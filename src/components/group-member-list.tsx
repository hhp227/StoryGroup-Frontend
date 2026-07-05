"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getOrCreateDirectRoom, getUserIdFromToken, listMembers, type Member } from "@/lib/api";

export function GroupMemberList({ token, groupId }: { token: string; groupId: number }) {
  const router = useRouter();
  const myUserId = getUserIdFromToken(token);

  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dmError, setDmError] = useState<string | null>(null);
  const [startingDmFor, setStartingDmFor] = useState<number | null>(null);

  useEffect(() => {
    listMembers(token, groupId)
      .then(setMembers)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "멤버 목록을 불러오지 못했습니다"));
  }, [token, groupId]);

  async function handleMessage(userId: number) {
    setDmError(null);
    setStartingDmFor(userId);
    try {
      const room = await getOrCreateDirectRoom(token, userId);
      router.push(`/dm/${room.id}`);
    } catch (err) {
      setDmError(err instanceof ApiError ? err.message : "DM을 시작하지 못했습니다");
    } finally {
      setStartingDmFor(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {dmError && <p className="field-error">{dmError}</p>}
      {members === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {members?.map((member) => (
        <div
          key={member.userId}
          className="card"
          style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}
        >
          <div className="avatar">{member.name.slice(0, 1)}</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontWeight: 700 }}>{member.name}</span>
            <span className={`chip ${member.role === "OWNER" ? "chip-owner" : "chip-member"}`} style={{ width: "fit-content", marginTop: 2 }}>
              {member.role === "OWNER" ? "방장" : "멤버"}
            </span>
          </div>
          {member.userId !== myUserId && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => handleMessage(member.userId)}
              disabled={startingDmFor === member.userId}
            >
              메시지
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
