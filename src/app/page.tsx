"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { GroupPostFeed } from "@/components/group-post-feed";
import { ApiError, listMyGroups } from "@/lib/api";

export default function Home() {
  const { accessToken, isReady } = useAuth();

  if (!isReady) return null;
  if (!accessToken) return <MarketingLanding />;
  return <LoungeFeed token={accessToken} />;
}

function MarketingLanding() {
  return (
    <div className="container page page-narrow">
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--display-weight)" as never,
          letterSpacing: "var(--display-tracking)",
          fontSize: "2.3rem",
          marginBottom: "var(--sp-4)",
        }}
      >
        조용히, 우리끼리
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: "1.05rem", lineHeight: 1.65, marginBottom: "var(--sp-6)", maxWidth: "56ch" }}>
        친한 사람들끼리만 모이는 폐쇄형 그룹 SNS, StoryGroup입니다. 그룹을 만들고 게시글, 댓글, 채팅, 화상회의까지 한곳에서.
      </p>
      <div style={{ display: "flex", gap: "var(--sp-3)" }}>
        <Link className="btn btn-primary" href="/register">
          시작하기
        </Link>
        <Link className="btn btn-secondary" href="/login">
          로그인
        </Link>
      </div>
    </div>
  );
}

function LoungeFeed({ token }: { token: string }) {
  const [loungeGroupId, setLoungeGroupId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listMyGroups(token)
      .then((groups) => {
        const lounge = groups.find((g) => g.isLounge);
        if (!lounge) {
          setLoadError("라운지를 찾을 수 없습니다");
          return;
        }
        setLoungeGroupId(lounge.id);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "피드를 불러오지 못했습니다"));
  }, [token]);

  return (
    <div className="container page page-narrow">
      {loadError && <p className="field-error">{loadError}</p>}
      {loungeGroupId !== null ? (
        <GroupPostFeed key={loungeGroupId} token={token} groupId={loungeGroupId} />
      ) : (
        !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>
      )}
    </div>
  );
}
