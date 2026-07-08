"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlbumPanel } from "@/components/album-panel";
import { useAuth } from "@/components/auth-provider";
import { GroupPostFeed } from "@/components/group-post-feed";
import { ApiError, getGroup, type Group } from "@/lib/api";
import { roleChipClass, roleLabel } from "@/lib/roles";

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

  // 피드 + 오른쪽 앨범 패널 2단(B안). 좁은 화면에선 패널이 피드 아래로 내려간다(.page-split).
  return (
    <div className="container page page-split">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
        {loadError && <p className="field-error">{loadError}</p>}
        {group && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>{group.name}</h1>
              <span className={roleChipClass(group.myRole)}>{roleLabel(group.myRole)}</span>
            </div>
            {group.description && <p style={{ color: "var(--ink-soft)", marginTop: "var(--sp-1)" }}>{group.description}</p>}
            <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "var(--sp-4)" }}>
              <Link className="btn btn-secondary" href={`/groups/${groupId}/members`}>
                멤버
              </Link>
              <Link className="btn btn-secondary" href={`/groups/${groupId}/chat`}>
                채팅
              </Link>
              {group.myRole === "OWNER" && (
                <Link className="btn btn-secondary" href={`/groups/${groupId}/settings`}>
                  설정
                </Link>
              )}
            </div>
          </div>
        )}
        <GroupPostFeed key={groupId} token={accessToken} groupId={groupId} />
      </div>
      <aside className="page-side">
        <AlbumPanel token={accessToken} groupId={groupId} />
      </aside>
    </div>
  );
}
