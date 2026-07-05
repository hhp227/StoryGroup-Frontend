"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { GroupCard } from "@/components/group-card";
import { ApiError, listMyGroups, type Group } from "@/lib/api";

export default function GroupsPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    listMyGroups(accessToken)
      .then(setGroups)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "그룹 목록을 불러오지 못했습니다"));
  }, [isReady, accessToken, router]);

  if (!isReady || !accessToken) return null;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "var(--sp-7) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--sp-4)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", marginBottom: "var(--sp-2)" }}>
            내 그룹
          </h1>
          <p style={{ color: "var(--ink-soft)" }}>참여 중인 그룹 목록입니다.</p>
        </div>
        <Link className="btn btn-primary" href="/groups/new">
          + 새 그룹
        </Link>
      </div>

      <div>
        {loadError && <p className="field-error">{loadError}</p>}
        {groups === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
        {groups && groups.filter((g) => !g.isLounge).length === 0 && (
          <p style={{ color: "var(--ink-faint)" }}>아직 그룹이 없습니다. 위 버튼으로 새 그룹을 만들어보세요.</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "var(--sp-5)" }}>
          {groups
            ?.filter((g) => !g.isLounge)
            .map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
        </div>
      </div>
    </div>
  );
}
