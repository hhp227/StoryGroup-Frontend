"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { ApiError, createPost, listMyGroups, listPosts, type Post } from "@/lib/api";

export default function Home() {
  const { accessToken, isReady } = useAuth();

  if (!isReady) return null;
  if (!accessToken) return <MarketingLanding />;
  return <LoungeFeed token={accessToken} />;
}

function MarketingLanding() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-8) var(--sp-5)" }}>
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
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listMyGroups(token)
      .then((groups) => {
        const lounge = groups.find((g) => g.isLounge);
        if (!lounge) {
          setLoadError("라운지를 찾을 수 없습니다");
          return;
        }
        setLoungeGroupId(lounge.id);
        return listPosts(token, lounge.id).then(setPosts);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "피드를 불러오지 못했습니다"));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!loungeGroupId) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await createPost(token, loungeGroupId, text);
      setPosts((prev) => [created, ...(prev ?? [])]);
      setText("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "게시글 작성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <div className="field">
          <label htmlFor="post-text">무슨 이야기가 있나요?</label>
          <textarea id="post-text" rows={3} required value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {formError && <p className="field-error">{formError}</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting || !loungeGroupId} style={{ alignSelf: "flex-start" }}>
          {isSubmitting ? "올리는 중..." : "게시하기"}
        </button>
      </form>

      {loadError && <p className="field-error">{loadError}</p>}
      {posts === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {posts?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>아직 이야기가 없습니다. 첫 이야기를 남겨보세요.</p>}

      {posts?.map((post) => (
        <article key={post.id} className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            <div className="avatar">{post.authorName.slice(0, 1)}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.92rem", fontWeight: 700 }}>{post.authorName}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                {new Date(post.createdAt).toLocaleString("ko-KR")}
              </span>
            </div>
          </div>
          <p style={{ fontSize: "0.98rem", lineHeight: 1.6, margin: "var(--sp-4) 0", whiteSpace: "pre-wrap" }}>{post.text}</p>
          {post.images.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
              {post.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.image}
                  alt=""
                  style={{ width: "100%", borderRadius: 10, border: "1px solid var(--stone-border)" }}
                />
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
