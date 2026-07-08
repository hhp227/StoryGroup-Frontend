"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlbumPanel } from "@/components/album-panel";
import { FilePanel } from "@/components/file-panel";
import { MeetingLivePanel } from "@/components/meeting-live-panel";
import { MemberPanel } from "@/components/member-panel";
import { NoticePanel } from "@/components/notice-panel";
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

  // 그룹 헤더는 전체 폭으로 위에 두고, 그 아래를 피드 + 사이드바 2단으로 나눈다(B안).
  // 이렇게 해야 사이드바 시작선이 홈과 동일하게 피드(입력폼) 상단에 맞는다.
  return (
    <div className="container page" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
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
      <div className="page-split">
        <GroupPostFeed key={groupId} token={accessToken} groupId={groupId} />
        <aside className="page-side">
          {/* 라이브 카드는 긴급성 콘텐츠라 맨 위, 멤버는 항상 있어 하단 앵커 */}
          <MeetingLivePanel token={accessToken} groupId={groupId} />
          <NoticePanel token={accessToken} groupId={groupId} />
          <AlbumPanel token={accessToken} groupId={groupId} />
          <MemberPanel token={accessToken} groupId={groupId} />
          <FilePanel token={accessToken} groupId={groupId} />
        </aside>
      </div>
    </div>
  );
}
