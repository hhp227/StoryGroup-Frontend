import Link from "next/link";
import type { Post } from "@/lib/api";
import { VideoAttachment } from "./video-attachment";

export function PostCard({ post }: { post: Post }) {
  const videos = post.videos ?? [];

  return (
    <Link href={`/groups/${post.groupId}/posts/${post.id}`} style={{ display: "block" }}>
      <article className="card" style={{ cursor: "pointer" }}>
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
        {/* 좋아요·댓글 카운트(KMP SgPostCard 액션 바의 표시 부분 미러) — 0이면 숫자 생략, 토글은 상세에서. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-5)",
            marginTop: "var(--sp-3)",
            paddingTop: "var(--sp-3)",
            borderTop: "1px solid var(--stone-border)",
            fontSize: "0.82rem",
            color: "var(--ink-soft)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span aria-hidden style={{ color: post.likedByMe ? "var(--accent)" : "var(--ink-soft)" }}>
              {post.likedByMe ? "♥" : "♡"}
            </span>
            좋아요{(post.likeCount ?? 0) > 0 ? ` ${post.likeCount}` : ""}
          </span>
          <span>댓글{(post.replyCount ?? 0) > 0 ? ` ${post.replyCount}` : ""}</span>
        </div>
      </article>
    </Link>
  );
}
