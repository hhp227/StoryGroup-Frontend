"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, createPost, listPosts, uploadImage, type Post } from "@/lib/api";
import { attachVideoWithCompression } from "@/lib/attach-video";
import { PostCard } from "./post-card";

const PAGE_SIZE = 20;

// 새 글 prepend나 React StrictMode의 effect 이중 실행으로 같은 페이지가 두 번 합쳐져도
// 중복 카드가 생기지 않도록 id 기준으로 걸러서 붙인다.
function appendUnique(prev: Post[], next: Post[]): Post[] {
  const seen = new Set(prev.map((p) => p.id));
  return [...prev, ...next.filter((p) => !seen.has(p.id))];
}

export function GroupPostFeed({
  token,
  groupId,
  onPostCreated,
}: {
  token: string;
  groupId: number;
  // 작성 성공을 부모에게 알린다 — 사이드바 앨범 패널처럼 게시글의 파생 뷰를 갱신할 때 쓴다.
  onPostCreated?: (post: Post) => void;
}) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  // 로딩 여부는 별도 state 대신 "요청한 페이지(page) vs 응답까지 끝난 페이지(loadedPage)"에서 파생한다.
  const [loadedPage, setLoadedPage] = useState(-1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingPage = loadedPage < page;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [isAttaching, setIsAttaching] = useState(false);
  // 첨부 파이프라인 상태 문구("압축 중 n%"/"업로드 중...") — 동영상 압축(§2) 진행률 표시
  const [attachStatus, setAttachStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    listPosts(token, groupId, page, PAGE_SIZE)
      .then((rows) => {
        if (cancelled) return;
        setPosts((prev) => appendUnique(prev ?? [], rows));
        setHasMore(rows.length === PAGE_SIZE);
        setLoadedPage(page);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "피드를 불러오지 못했습니다");
        setLoadedPage(page);
      });
    return () => {
      cancelled = true;
    };
  }, [token, groupId, page]);

  // 옵저버는 생성 시점에 현재 교차 상태로 콜백을 한 번 실행하므로, 로딩이 끝나
  // (isLoadingPage 변경으로) 다시 만들어질 때 sentinel이 여전히 화면 안이면
  // 다음 페이지를 이어서 불러온다 - 콘텐츠가 화면보다 짧아도 멈추지 않음.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || isLoadingPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setPage((p) => p + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingPage]);

  // 첨부 즉시 업로드해서 URL을 모아두고, 게시할 때는 URL 목록만 보낸다(기존 API 계약 그대로).
  // 이미지/동영상은 업로드 엔드포인트와 게시글 필드(images/videos)가 달라 MIME으로 갈라 보낸다.
  // 동영상은 5MB 목표 압축을 거친다(§2) — 거부/실패 문구는 Error.message가 그대로 표출된다.
  async function handleAttach(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFormError(null);
    setIsAttaching(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith("video/")) {
          const url = await attachVideoWithCompression(token, file, setAttachStatus);
          setVideos((prev) => [...prev, url]);
        } else {
          setAttachStatus("업로드 중...");
          const { url } = await uploadImage(token, file);
          setImages((prev) => [...prev, url]);
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "첨부 파일 업로드에 실패했습니다");
    } finally {
      setIsAttaching(false);
      setAttachStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await createPost(
        token,
        groupId,
        text,
        images.length > 0 ? images : undefined,
        videos.length > 0 ? videos : undefined,
      );
      setPosts((prev) => [created, ...(prev ?? [])]);
      setText("");
      setImages([]);
      setVideos([]);
      onPostCreated?.(created);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "게시글 작성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <div className="field">
          <label htmlFor="post-text">무슨 이야기가 있나요?</label>
          {/* 첨부가 있으면 본문 없이도 게시 가능 — 백엔드도 같은 규칙(둘 다 비면 400) */}
          <textarea
            id="post-text"
            rows={3}
            required={images.length === 0 && videos.length === 0}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {(images.length > 0 || videos.length > 0) && (
          <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
            {images.map((url) => (
              <div key={url} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid var(--stone-border)" }}
                />
                <button
                  type="button"
                  aria-label="이미지 제거"
                  onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    border: "1px solid var(--stone-border)",
                    background: "var(--paper)",
                    color: "var(--ink-soft)",
                    fontSize: "0.7rem",
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            {videos.map((url) => (
              <div key={url} style={{ position: "relative" }}>
                {/* preload="metadata"로 첫 프레임만 받아 썸네일처럼 보여준다. 재생은 게시 후 카드/상세에서. */}
                <video
                  src={url}
                  muted
                  preload="metadata"
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid var(--stone-border)" }}
                />
                <button
                  type="button"
                  aria-label="동영상 제거"
                  onClick={() => setVideos((prev) => prev.filter((u) => u !== url))}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    border: "1px solid var(--stone-border)",
                    background: "var(--paper)",
                    color: "var(--ink-soft)",
                    fontSize: "0.7rem",
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleAttach(e.target.files)}
            disabled={isAttaching || isSubmitting}
            style={{ fontSize: "0.82rem" }}
          />
          {attachStatus && <span style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>{attachStatus}</span>}
        </div>

        {formError && <p className="field-error">{formError}</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting || isAttaching} style={{ alignSelf: "flex-start" }}>
          {isSubmitting ? "올리는 중..." : "게시하기"}
        </button>
      </form>

      {loadError && <p className="field-error">{loadError}</p>}
      {posts === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {posts?.length === 0 && !hasMore && <p style={{ color: "var(--ink-faint)" }}>아직 이야기가 없습니다. 첫 이야기를 남겨보세요.</p>}
      {posts?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMore && posts !== null && (
        <div ref={sentinelRef} style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: "0.85rem", padding: "var(--sp-3)" }}>
          {isLoadingPage ? "더 불러오는 중..." : ""}
        </div>
      )}
    </div>
  );
}
