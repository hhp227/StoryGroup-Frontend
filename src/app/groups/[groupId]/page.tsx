"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { GroupPostFeed } from "@/components/group-post-feed";
import { ApiError, getGroup, type Group } from "@/lib/api";

export default function GroupDetailPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  const [group, setGroup] = useState<Group | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    getGroup(accessToken, groupId)
      .then(setGroup)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "그룹을 불러오지 못했습니다"));
  }, [isReady, accessToken, groupId, router]);

  if (!isReady || !accessToken) return null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {group && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>{group.name}</h1>
            <span className={`chip ${group.myRole === "OWNER" ? "chip-owner" : "chip-member"}`}>
              {group.myRole === "OWNER" ? "방장" : "멤버"}
            </span>
          </div>
          {group.description && <p style={{ color: "var(--ink-soft)", marginTop: "var(--sp-1)" }}>{group.description}</p>}
          <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "var(--sp-4)" }}>
            <Link className="btn btn-secondary" href={`/groups/${groupId}/members`}>
              멤버
            </Link>
            <Link className="btn btn-secondary" href={`/groups/${groupId}/chat`}>
              채팅
            </Link>
            <Link className="btn btn-secondary" href={`/groups/${groupId}/files`}>
              파일
            </Link>
          </div>
        </div>
      )}
      <GroupPostFeed key={groupId} token={accessToken} groupId={groupId} />
    </div>
  );
}
