"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Post } from "@/lib/api";
import { VideoAttachment } from "./video-attachment";

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
        {post.images.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            {post.images.slice(0, 1).map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.image}
                alt=""
                style={{ width: "100%", borderRadius: 10, border: "1px solid var(--stone-border)" }}
              />
            ))}
          </div>
        ) : videos.length > 0 ? (
          <VideoAttachment src={videos[0].video} />
        ) : null}
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
