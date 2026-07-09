"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ApiError, listGroupPhotos, type GroupPhoto } from "@/lib/api";
import { MediaThumb } from "@/components/media-thumb";

const PAGE_SIZE = 30;

function monthLabel(createdAt: string): string {
  const date = new Date(createdAt);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

// 그룹 앨범 전체 보기: 게시글 첨부 사진을 월별 섹션 + 3열 그리드로.
// 썸네일 클릭 → 원본 게시글 상세(사진의 맥락 보존). 라이트박스는 필요해지면 그때.
export default function GroupPhotosPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  const [photos, setPhotos] = useState<GroupPhoto[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPage = useCallback(
    (token: string, page: number) =>
      listGroupPhotos(token, groupId, page, PAGE_SIZE)
        .then((fetched) => {
          setTotalCount(fetched.totalCount);
          setPhotos((prev) => (page === 0 ? fetched.photos : [...(prev ?? []), ...fetched.photos]));
        })
        .catch((err) => setLoadError(err instanceof ApiError ? err.message : "사진을 불러오지 못했습니다")),
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
    if (!photos || !accessToken) return;
    setIsLoadingMore(true);
    // 오프셋 기반이라 로드 사이에 새 사진이 올라오면 한 장쯤 겹칠 수 있다 — 갤러리 특성상 허용.
    await loadPage(accessToken, Math.floor(photos.length / PAGE_SIZE));
    setIsLoadingMore(false);
  }

  // 월별 섹션: 목록이 이미 최신 게시글 순이라 순서대로 끊기만 하면 된다.
  const sections: { label: string; items: GroupPhoto[] }[] = [];
  for (const photo of photos ?? []) {
    const label = monthLabel(photo.createdAt);
    const last = sections[sections.length - 1];
    if (last && last.label === label) last.items.push(photo);
    else sections.push({ label, items: [photo] });
  }

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-3)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>앨범</h1>
        {totalCount > 0 && <span style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>{totalCount}장</span>}
        <Link href={`/groups/${groupId}`} style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.85rem", fontWeight: 600 }}>
          그룹으로 →
        </Link>
      </div>

      {loadError && <p className="field-error">{loadError}</p>}
      {photos === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {photos?.length === 0 && (
        <p style={{ color: "var(--ink-faint)" }}>아직 사진이 없습니다. 게시글에 사진이나 동영상을 올리면 여기에 모여요.</p>
      )}

      {sections.map((section) => (
        <section key={section.label}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink-soft)", margin: "0 0 var(--sp-3)" }}>
            {section.label}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-2)" }}>
            {section.items.map((photo) => (
              <Link
                key={photo.id}
                href={`/groups/${groupId}/posts/${photo.postId}`}
                title={`${photo.authorName}의 게시글로 이동`}
                style={{ display: "block", aspectRatio: "1", borderRadius: 10, overflow: "hidden" }}
              >
                <MediaThumb photo={photo} />
              </Link>
            ))}
          </div>
        </section>
      ))}

      {photos && photos.length < totalCount && (
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
