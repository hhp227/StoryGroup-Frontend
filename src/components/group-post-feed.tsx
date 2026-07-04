"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, createPost, listPosts, type Post } from "@/lib/api";
import { PostCard } from "./post-card";

export function GroupPostFeed({ token, groupId }: { token: string; groupId: number }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listPosts(token, groupId)
      .then(setPosts)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "피드를 불러오지 못했습니다"));
  }, [token, groupId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await createPost(token, groupId, text);
      setPosts((prev) => [created, ...(prev ?? [])]);
      setText("");
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
          <textarea id="post-text" rows={3} required value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {formError && <p className="field-error">{formError}</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ alignSelf: "flex-start" }}>
          {isSubmitting ? "올리는 중..." : "게시하기"}
        </button>
      </form>

      {loadError && <p className="field-error">{loadError}</p>}
      {posts === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {posts?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>아직 이야기가 없습니다. 첫 이야기를 남겨보세요.</p>}
      {posts?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
