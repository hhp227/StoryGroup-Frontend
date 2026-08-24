"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ApiError, listGroupNotices, type NoticeSummary } from "@/lib/api";

const PAGE_SIZE = 20;

// 공지 전체 목록 — 공지는 피드에서 제외되므로 사이드바 패널(3건) 밖의 공지는 여기서만 볼 수 있다.
// 줄 클릭 → 게시글 상세(댓글/좋아요는 게시글 화면이 담당).
export default function GroupNoticesPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  const [notices, setNotices] = useState<NoticeSummary[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPage = useCallback(
    (token: string, page: number) =>
      listGroupNotices(token, groupId, page, PAGE_SIZE)
        .then((fetched) => {
          setTotalCount(fetched.totalCount);
          setNotices((prev) => (page === 0 ? fetched.notices : [...(prev ?? []), ...fetched.notices]));
        })
        .catch((err) => setLoadError(err instanceof ApiError ? err.message : "공지를 불러오지 못했습니다")),
    [groupId]
  );

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    loadPage(accessToken, 0);
  }, [isReady, accessToken, router, loadPage]);

  if (!isReady || !accessToken) return null;

  async function handleLoadMore() {
    if (!notices || !accessToken) return;
    setIsLoadingMore(true);
    await loadPage(accessToken, Math.floor(notices.length / PAGE_SIZE));
    setIsLoadingMore(false);
  }

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-3)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>공지사항</h1>
        {totalCount > 0 && <span style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>{totalCount}건</span>}
        <Link href={`/groups/${groupId}`} style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.85rem", fontWeight: 600 }}>
          그룹으로 →
        </Link>
      </div>

      {loadError && <p className="field-error">{loadError}</p>}
      {notices === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {notices?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>등록된 공지가 없습니다.</p>}

      {notices && notices.length > 0 && (
        <div className="card" style={{ padding: "var(--sp-2) var(--sp-4)" }}>
          {notices.map((notice, index) => (
            <Link
              key={notice.id}
              href={`/groups/${groupId}/posts/${notice.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-3)",
                padding: "12px 0",
                borderTop: index === 0 ? "none" : "1px solid var(--stone-border)",
              }}
            >
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.92rem" }}>
                {notice.text}
              </span>
              <span style={{ color: "var(--ink-faint)", fontSize: "0.78rem", flexShrink: 0 }}>
                {notice.authorName} · {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
              </span>
              <span aria-hidden style={{ color: "var(--ink-faint)" }}>
                ›
              </span>
            </Link>
          ))}
        </div>
      )}

      {notices && notices.length < totalCount && (
        <button
          className="btn btn-secondary"
          type="button"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          style={{ alignSelf: "center" }}
        >
          {isLoadingMore ? "불러오는 중..." : "더 보기"}
        </button>
      )}
    </div>
  );
}
