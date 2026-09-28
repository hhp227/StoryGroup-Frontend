"use client";

import { useEffect, useState } from "react";
import { AlbumPanel } from "@/components/album-panel";
import { NoticePanel } from "@/components/notice-panel";
import { PopularGroupsPanel } from "@/components/popular-groups-panel";
import { useAuth } from "@/components/auth-provider";
import { GroupPostFeed } from "@/components/group-post-feed";
import { MarketingLanding } from "@/components/landing/marketing-landing";
import { ApiError, listMyGroups, type Group } from "@/lib/api";

export default function Home() {
  const { accessToken, isReady } = useAuth();

  if (!isReady) return null;
  if (!accessToken) return <MarketingLanding />;
  return <LoungeFeed token={accessToken} />;
}

function LoungeFeed({ token }: { token: string }) {
  // 라운지 id를 찾기 위한 조회. 사이드바 "인기 그룹" 패널은 탐색 API(sort=popular)를 따로 쓴다.
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [albumRefreshKey, setAlbumRefreshKey] = useState(0);

  useEffect(() => {
    listMyGroups(token)
      .then((fetched) => {
        if (!fetched.some((g) => g.isLounge)) {
          setLoadError("라운지를 찾을 수 없습니다");
          return;
        }
        setGroups(fetched);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "피드를 불러오지 못했습니다"));
  }, [token]);

  const loungeGroupId = groups?.find((g) => g.isLounge)?.id ?? null;

  // 피드 + 오른쪽 앨범 패널 2단(B안). 좁은 화면에선 패널이 피드 아래로 내려간다(.page-split).
  return (
    <div className="container page page-split">
      <div>
        {loadError && <p className="field-error">{loadError}</p>}
        {loungeGroupId !== null ? (
          <GroupPostFeed
            key={loungeGroupId}
            token={token}
            groupId={loungeGroupId}
            // 앨범은 게시글 첨부의 파생 뷰라 첨부 있는 글이 올라오면 패널을 재조회시킨다.
            onPostCreated={(post) => {
              if (post.images.length > 0 || (post.videos ?? []).length > 0) setAlbumRefreshKey((k) => k + 1);
            }}
          />
        ) : (
          !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>
        )}
      </div>
      <aside className="page-side">
        {groups !== null && loungeGroupId !== null && (
          <>
            <NoticePanel token={token} groupId={loungeGroupId} />
            <AlbumPanel token={token} groupId={loungeGroupId} refreshKey={albumRefreshKey} />
            <PopularGroupsPanel token={token} />
          </>
        )}
      </aside>
    </div>
  );
}
