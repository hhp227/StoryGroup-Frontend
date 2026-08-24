"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlbumPanel } from "@/components/album-panel";
import { EventPanel } from "@/components/event-panel";
import { FilePanel } from "@/components/file-panel";
import { GroupCover } from "@/components/group-cover";
import { CallLivePanel } from "@/components/call-live-panel";
import { MemberPanel } from "@/components/member-panel";
import { NoticePanel } from "@/components/notice-panel";
import { useAuth } from "@/components/auth-provider";
import { GroupPostFeed } from "@/components/group-post-feed";
import { ApiError, getGroup, type Group } from "@/lib/api";
import { canModerate, roleChipClass, roleLabel } from "@/lib/roles";

// 커버 위 이동 버튼: btn-secondary는 투명 배경이라 사진 위에서 안 읽혀 밝은 배경을 깔고, 배너에 맞게 컴팩트하게.
const coverButtonStyle = {
  padding: "5px 14px",
  fontSize: "0.85rem",
  background: "var(--linen)",
} as const;

export default function GroupDetailPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  const [group, setGroup] = useState<Group | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [albumRefreshKey, setAlbumRefreshKey] = useState(0);

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
          {/* 커버 배너: 이미지가 없어도 그룹별 그라데이션 폴백이 있어 항상 배너로 쓴다.
              타이틀/설명은 하단 스크림 위, 이동 버튼은 우상단 — 헤더 전체를 커버 한 덩어리로 만든다.
              이니셜 폴백은 끈다(타이틀과 중복). */}
          <GroupCover groupId={groupId} name={group.name} image={group.image} aspectRatio="3 / 1" minHeight={150} showInitial={false}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.62))",
              }}
            />
            <div style={{ position: "absolute", top: "var(--sp-3)", right: "var(--sp-3)", display: "flex", gap: "var(--sp-2)" }}>
              <Link className="btn btn-secondary" href={`/groups/${groupId}/members`} style={coverButtonStyle}>
                멤버
              </Link>
              <Link className="btn btn-secondary" href={`/groups/${groupId}/events`} style={coverButtonStyle}>
                일정
              </Link>
              <Link className="btn btn-secondary" href={`/groups/${groupId}/chat`} style={coverButtonStyle}>
                채팅
              </Link>
              {canModerate(group.myRole) && (
                <Link className="btn btn-secondary" href={`/groups/${groupId}/reports`} style={coverButtonStyle}>
                  신고함
                </Link>
              )}
              {group.myRole === "OWNER" && (
                <Link className="btn btn-secondary" href={`/groups/${groupId}/settings`} style={coverButtonStyle}>
                  설정
                </Link>
              )}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "var(--sp-4)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", minWidth: 0 }}>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.5rem",
                    color: "#fff",
                    textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {group.name}
                </h1>
                <span className={roleChipClass(group.myRole)} style={{ background: "var(--linen)", flexShrink: 0 }}>
                  {roleLabel(group.myRole)}
                </span>
              </div>
              {group.description && (
                <p
                  style={{
                    color: "rgba(255,255,255,0.88)",
                    fontSize: "0.9rem",
                    textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {group.description}
                </p>
              )}
            </div>
          </GroupCover>
        </div>
      )}
      <div className="page-split">
        <GroupPostFeed
          key={groupId}
          token={accessToken}
          groupId={groupId}
          // 앨범은 게시글 첨부의 파생 뷰라 첨부 있는 글이 올라오면 패널을 재조회시킨다.
          onPostCreated={(post) => {
            if (post.images.length > 0 || (post.videos ?? []).length > 0) setAlbumRefreshKey((k) => k + 1);
          }}
        />
        <aside className="page-side">
          {/* 라이브 카드는 긴급성 콘텐츠라 맨 위, 멤버는 항상 있어 하단 앵커 */}
          <CallLivePanel token={accessToken} groupId={groupId} />
          <NoticePanel token={accessToken} groupId={groupId} />
          <AlbumPanel token={accessToken} groupId={groupId} refreshKey={albumRefreshKey} />
          <MemberPanel token={accessToken} groupId={groupId} />
          <EventPanel token={accessToken} groupId={groupId} />
          <FilePanel token={accessToken} groupId={groupId} />
        </aside>
      </div>
    </div>
  );
}
