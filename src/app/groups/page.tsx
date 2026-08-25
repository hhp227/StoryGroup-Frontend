"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { GroupCard } from "@/components/group-card";
import { GroupDiscover } from "@/components/group-discover";
import { PendingGroups } from "@/components/pending-groups";
import { ApiError, listMyGroups, type Group } from "@/lib/api";

// useSearchParams(탭 상태)는 정적 빌드에서 Suspense 경계가 필요하다(CSR bailout 에러 방지).
export default function GroupsPage() {
  return (
    <Suspense fallback={null}>
      <GroupsPageContent />
    </Suspense>
  );
}

function GroupsPageContent() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = tabParam === "discover" ? "discover" : tabParam === "pending" ? "pending" : "mine";

  useEffect(() => {
    if (isReady && !accessToken) router.push("/login");
  }, [isReady, accessToken, router]);

  if (!isReady || !accessToken) return null;

  return (
    <div className="container page" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--sp-4)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", marginBottom: "var(--sp-2)" }}>그룹</h1>
          <p style={{ color: "var(--ink-soft)" }}>
            {tab === "mine"
              ? "참여 중인 그룹 목록입니다."
              : tab === "discover"
                ? "새로운 그룹을 찾아 참여해보세요."
                : "가입 승인을 기다리는 그룹 목록입니다."}
          </p>
        </div>
        <Link className="btn btn-primary" href="/groups/new">
          + 새 그룹
        </Link>
      </div>

      <div style={{ display: "flex", gap: "var(--sp-2)", borderBottom: "1px solid var(--stone-border)" }}>
        <TabLink href="/groups" active={tab === "mine"}>
          내 그룹
        </TabLink>
        <TabLink href="/groups?tab=discover" active={tab === "discover"}>
          그룹 찾기
        </TabLink>
        <TabLink href="/groups?tab=pending" active={tab === "pending"}>
          가입 신청중
        </TabLink>
      </div>

      {tab === "mine" ? (
        <MyGroups token={accessToken} />
      ) : tab === "discover" ? (
        <GroupDiscover token={accessToken} />
      ) : (
        <PendingGroups token={accessToken} />
      )}
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: "var(--sp-2) var(--sp-3)",
        fontWeight: 700,
        fontSize: "0.95rem",
        color: active ? "var(--ink)" : "var(--ink-faint)",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        marginBottom: -1,
      }}
    >
      {children}
    </Link>
  );
}

function MyGroups({ token }: { token: string }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listMyGroups(token)
      .then(setGroups)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "그룹 목록을 불러오지 못했습니다"));
  }, [token]);

  return (
    <div>
      {loadError && <p className="field-error">{loadError}</p>}
      {groups === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {groups && groups.filter((g) => !g.isLounge).length === 0 && (
        <p style={{ color: "var(--ink-faint)" }}>
          아직 그룹이 없습니다. 새 그룹을 만들거나{" "}
          <Link href="/groups?tab=discover" style={{ color: "var(--accent)", fontWeight: 700 }}>
            그룹 찾기
          </Link>
          에서 참여해보세요.
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "var(--sp-5)" }}>
        {groups
          ?.filter((g) => !g.isLounge)
          .map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
      </div>
    </div>
  );
}
