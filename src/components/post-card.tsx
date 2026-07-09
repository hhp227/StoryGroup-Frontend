import Link from "next/link";
import type { Post } from "@/lib/api";

export function PostCard({ post }: { post: Post }) {
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
        ) : post.videos.length > 0 ? (
          // 카드 전체가 Link라 재생 컨트롤 클릭이 상세 페이지로 튀지 않게 video 위의 클릭만 막는다.
          <video
            src={post.videos[0].video}
            controls
            preload="metadata"
            onClick={(e) => e.preventDefault()}
            style={{ width: "100%", borderRadius: 10, border: "1px solid var(--stone-border)" }}
          />
        ) : null}
      </article>
    </Link>
  );
}
