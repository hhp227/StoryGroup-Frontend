"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, listMembers, type Member } from "@/lib/api";

const VISIBLE_COUNT = 5;

export function GroupMemberStrip({ token, groupId }: { token: string; groupId: number }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listMembers(token, groupId)
      .then(setMembers)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "참여자를 불러오지 못했습니다"));
  }, [token, groupId]);

  if (loadError) return <p className="field-error">{loadError}</p>;
  if (members === null) return null;

  const visible = members.slice(0, VISIBLE_COUNT);
  const overflow = members.length - visible.length;

  return (
    <Link href={`/groups/${groupId}/members`} style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
      <div style={{ display: "flex" }}>
        {visible.map((m, i) => (
          <div
            key={m.userId}
            className="avatar sm"
            style={{ marginLeft: i === 0 ? 0 : -8, border: "2px solid var(--linen)" }}
          >
            {m.name.slice(0, 1)}
          </div>
        ))}
      </div>
      <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
        참여자 {members.length}명{overflow > 0 ? ` (+${overflow})` : ""}
      </span>
    </Link>
  );
}
