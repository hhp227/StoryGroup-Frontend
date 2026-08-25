"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Post } from "@/lib/api";

/** 미디어 그리드에 보여줄 최대 장수 — 넘치면 마지막 타일에 "+N"(전체는 상세에서). KMP MEDIA_GRID_MAX 미러 */
const MEDIA_GRID_MAX = 6;

type PostMedia = { url: string; isVideo: boolean };

/** 공유 본문 — KMP Share.kt postShareText 미러: "작성자 — 본문", 본문 없는 첨부 전용 글은 첫 첨부 URL로 대체 */
function postShareText(post: Post): string {
  const firstAttachment = post.images[0]?.image ?? (post.videos ?? [])[0]?.video ?? "";
  const body = post.text.length > 0 ? post.text : firstAttachment;
  return `${post.authorName} — ${body}`;
}

/** 액션 바 한 칸(KMP SgPostCardAction 미러) — 버튼/링크의 기본 모양 리셋 포함 */
const actionCellStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "10px 0",
  background: "none",
  border: "none",
  font: "inherit",
  fontSize: "0.82rem",
  color: "var(--ink-soft)",
  cursor: "pointer",
};

export function PostCard({ post, onToggleLike }: { post: Post; onToggleLike?: () => void }) {
  const videos = post.videos ?? [];
  // 미디어=이미지 먼저+동영상 뒤(KMP 순서) — 카드 전폭 풀블리드 블록으로 그린다.
  const media: PostMedia[] = [
    ...post.images.map((img) => ({ url: img.image, isVideo: false })),
    ...videos.map((v) => ({ url: v.video, isVideo: true })),
  ];
  const detailHref = `/groups/${post.groupId}/posts/${post.id}`;
  // 공유 폴백(클립보드 복사) 피드백 — 1.5초간 공유 칸 라벨을 "복사됨"으로 바꾼다.
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
    };
  }, []);

  // KMP share(postShareText) 미러 — 지원 브라우저는 OS 공유 시트, 미지원은 상세 URL 복사.
  async function handleShare() {
    const url = `${window.location.origin}${detailHref}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: postShareText(post), url });
      } catch {
        // 공유 시트 취소(AbortError) 등 — 조용히 무시
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
      copyResetRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한 거부 — 조용히 무시
    }
  }

  return (
    // 액션 바가 카드 클릭(Link)과 겹치지 않도록 Link는 콘텐츠 영역만 감싼다(a>button 중첩 회피).
    <article className="card" style={{ padding: 0, overflow: "hidden" }}>
      <Link href={detailHref} style={{ display: "block", padding: "var(--sp-5)", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <div className="avatar">{post.authorName.slice(0, 1)}</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: "0.92rem", fontWeight: 700 }}>{post.authorName}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
              {new Date(post.createdAt).toLocaleString("ko-KR")}
            </span>
          </div>
          {post.isNotice && <span className="chip chip-owner">공지</span>}
        </div>
        {post.text.length > 0 ? (
          <p
            style={{
              fontSize: "0.98rem",
              lineHeight: 1.6,
              margin: "var(--sp-4) 0",
              whiteSpace: "pre-wrap",
              display: "-webkit-box",
              WebkitLineClamp: 6,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.text}
          </p>
        ) : (
          // 첨부만 있는 게시글 - 빈 문단의 위아래 여백 대신 최소 간격만 둔다.
          <div style={{ height: "var(--sp-3)" }} />
        )}
        <PostCardMediaBlock media={media} />
      </Link>
      {/* KMP SgPostCard 액션 바 미러 — 전폭 구분선+등분 3버튼, 카운트 0이면 숫자 생략, likedByMe면 칸 전체 accent. */}
      <div style={{ display: "flex", borderTop: "1px solid var(--stone-border)" }}>
        <button
          type="button"
          onClick={onToggleLike}
          style={{ ...actionCellStyle, color: post.likedByMe ? "var(--accent)" : actionCellStyle.color }}
        >
          <span aria-hidden>{post.likedByMe ? "♥" : "♡"}</span>
          좋아요{(post.likeCount ?? 0) > 0 ? ` ${post.likeCount}` : ""}
        </button>
        <Link href={detailHref} style={actionCellStyle}>
          댓글{(post.replyCount ?? 0) > 0 ? ` ${post.replyCount}` : ""}
        </Link>
        <button type="button" onClick={handleShare} style={actionCellStyle}>
          <span aria-hidden>{copied ? "✓" : "⤴"}</span>
          {copied ? "복사됨" : "공유"}
        </button>
      </div>
    </article>
  );
}

// 카드 전폭 미디어 블록 — 레거시 iv_post(match_parent+adjustViewBounds) 풀블리드 미러(KMP PostCardMediaBlock).
// Link 패딩(sp-5)을 음수 마진으로 상쇄해 양옆·아래(구분선까지)를 꽉 채운다.
// 1개=원본 비율 한 장, 2~6개=2열 스태거드(타일 간 2px) — 크기 메타데이터가 없어 열 배분은 인덱스 교대(0·2·4→왼쪽).
function PostCardMediaBlock({ media }: { media: PostMedia[] }) {
  if (media.length === 0) return null;

  const visible = media.slice(0, MEDIA_GRID_MAX);
  const overflow = media.length - visible.length;

  return (
    <div style={{ margin: "0 calc(-1 * var(--sp-5)) calc(-1 * var(--sp-5))" }}>
      {media.length === 1 ? (
        <MediaTile media={media[0]} overflowCount={0} />
      ) : (
        <div style={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          {[0, 1].map((column) => (
            <div key={column} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {visible.map((item, index) =>
                index % 2 === column ? (
                  <MediaTile
                    key={`${index}-${item.url}`}
                    media={item}
                    overflowCount={index === visible.length - 1 ? overflow : 0}
                  />
                ) : null,
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 미디어 한 타일 — 폭 맞춤+원본 비율. 동영상은 첫 프레임(preload=metadata)+▶ 오버레이, 재생은 상세에서(카드 전체가 Link).
function MediaTile({ media, overflowCount }: { media: PostMedia; overflowCount: number }) {
  return (
    <div style={{ position: "relative" }}>
      {media.isVideo ? (
        <>
          <video src={media.url} muted preload="metadata" style={{ width: "100%", display: "block" }} />
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: "rgba(0, 0, 0, 0.45)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
              }}
            >
              ▶
            </span>
          </span>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.url} alt="" style={{ width: "100%", display: "block" }} />
      )}
      {overflowCount > 0 && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.45)",
            color: "#fff",
            fontSize: "1.15rem",
            fontWeight: 700,
          }}
        >
          +{overflowCount}
        </span>
      )}
    </div>
  );
}
