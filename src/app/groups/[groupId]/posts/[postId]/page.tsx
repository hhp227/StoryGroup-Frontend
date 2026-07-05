"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  ApiError,
  createComment,
  deleteComment,
  deletePost,
  getGroup,
  getPost,
  getUserIdFromToken,
  likePost,
  listComments,
  listLikes,
  setPostNotice,
  unlikePost,
  unsetPostNotice,
  type Comment,
  type Group,
  type Like,
  type Post,
} from "@/lib/api";
import { canModerate } from "@/lib/roles";

export default function PostDetailPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string; postId: string }>();
  const groupId = Number(params.groupId);
  const postId = Number(params.postId);

  const [post, setPost] = useState<Post | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [likes, setLikes] = useState<Like[] | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const myUserId = accessToken ? getUserIdFromToken(accessToken) : null;
  const iLiked = likes?.some((l) => l.userId === myUserId) ?? false;
  const isModerator = canModerate(group?.myRole);

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    Promise.all([
      getPost(accessToken, groupId, postId),
      getGroup(accessToken, groupId),
      listLikes(accessToken, groupId, postId),
      listComments(accessToken, groupId, postId),
    ])
      .then(([p, g, l, c]) => {
        setPost(p);
        setGroup(g);
        setLikes(l);
        setComments(c);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "게시글을 불러오지 못했습니다"));
  }, [isReady, accessToken, groupId, postId, router]);

  async function toggleLike() {
    if (!accessToken) return;
    try {
      if (iLiked) {
        await unlikePost(accessToken, groupId, postId);
        setLikes((prev) => prev?.filter((l) => l.userId !== myUserId) ?? null);
      } else {
        await likePost(accessToken, groupId, postId);
        setLikes((prev) => [...(prev ?? []), { userId: myUserId!, authorName: "", authorProfileImg: null, createdAt: new Date().toISOString() }]);
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "좋아요 처리에 실패했습니다");
    }
  }

  async function handleDeletePost() {
    if (!accessToken) return;
    setIsDeletingPost(true);
    try {
      await deletePost(accessToken, groupId, postId);
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "게시글 삭제에 실패했습니다");
      setIsDeletingPost(false);
    }
  }

  async function handleToggleNotice() {
    if (!accessToken || !post) return;
    try {
      const updated = post.isNotice
        ? await unsetPostNotice(accessToken, groupId, postId)
        : await setPostNotice(accessToken, groupId, postId);
      setPost(updated);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "공지 설정에 실패했습니다");
    }
  }

  if (!isReady || !accessToken) return null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      {loadError && <p className="field-error">{loadError}</p>}

      {post && (
        <article className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            <div className="avatar">{post.authorName.slice(0, 1)}</div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ fontSize: "0.92rem", fontWeight: 700 }}>{post.authorName}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                {new Date(post.createdAt).toLocaleString("ko-KR")}
              </span>
            </div>
            {post.isNotice && <span className="chip chip-owner">공지</span>}
            {isModerator && (
              <button
                type="button"
                onClick={handleToggleNotice}
                style={{ fontSize: "0.78rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {post.isNotice ? "공지 해제" : "공지 등록"}
              </button>
            )}
            {(post.userId === myUserId || isModerator) && (
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={isDeletingPost}
                style={{ fontSize: "0.78rem", color: "var(--rust)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                삭제
              </button>
            )}
          </div>
          <p style={{ fontSize: "0.98rem", lineHeight: 1.6, margin: "var(--sp-4) 0", whiteSpace: "pre-wrap" }}>{post.text}</p>
          {post.images.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
              {post.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.image} alt="" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--stone-border)" }} />
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "var(--sp-4)", borderTop: "1px solid var(--stone-border)", paddingTop: "var(--sp-3)" }}>
            <button
              type="button"
              onClick={toggleLike}
              className="btn btn-ghost"
              style={{ padding: "4px 8px", color: iLiked ? "var(--accent)" : "var(--ink-soft)" }}
            >
              {iLiked ? "♥" : "♡"} 좋아요 {likes?.length ?? 0}
            </button>
            <span style={{ display: "flex", alignItems: "center", fontSize: "0.85rem", color: "var(--ink-soft)" }}>
              댓글 {comments?.length ?? 0}
            </span>
          </div>
        </article>
      )}

      {comments && post && (
        <CommentSection
          token={accessToken}
          groupId={groupId}
          postId={postId}
          comments={comments}
          myUserId={myUserId}
          isModerator={isModerator}
          onChange={setComments}
        />
      )}
    </div>
  );
}

function CommentSection({
  token,
  groupId,
  postId,
  comments,
  myUserId,
  isModerator,
  onChange,
}: {
  token: string;
  groupId: number;
  postId: number;
  comments: Comment[];
  myUserId: number | null;
  isModerator: boolean;
  onChange: (comments: Comment[]) => void;
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topLevel = comments.filter((c) => c.parentReplyId === null);
  const repliesOf = (id: number) => comments.filter((c) => c.parentReplyId === id);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createComment(token, groupId, postId, text, replyTo?.id);
      onChange([...comments, created]);
      setText("");
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "댓글 작성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(commentId: number) {
    try {
      await deleteComment(token, groupId, postId, commentId);
      onChange(comments.filter((c) => c.id !== commentId && c.parentReplyId !== commentId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "댓글 삭제에 실패했습니다");
    }
  }

  function CommentRow({ comment, isReply }: { comment: Comment; isReply: boolean }) {
    return (
      <div style={{ display: "flex", gap: "var(--sp-3)", marginLeft: isReply ? 40 : 0 }}>
        <div className="avatar sm">{comment.authorName.slice(0, 1)}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{comment.authorName}</span>
          <span style={{ fontSize: "0.9rem" }}>{comment.text}</span>
          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--ink-faint)" }}>
              {new Date(comment.createdAt).toLocaleString("ko-KR")}
            </span>
            {!isReply && (
              <button
                type="button"
                onClick={() => setReplyTo(comment)}
                style={{ fontSize: "0.72rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                답글
              </button>
            )}
            {(comment.userId === myUserId || isModerator) && (
              <button
                type="button"
                onClick={() => handleDelete(comment.id)}
                style={{ fontSize: "0.72rem", color: "var(--rust)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <span style={{ fontWeight: 700 }}>댓글</span>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        {topLevel.length === 0 && <p style={{ color: "var(--ink-faint)", fontSize: "0.9rem" }}>첫 댓글을 남겨보세요.</p>}
        {topLevel.map((comment) => (
          <div key={comment.id} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            <CommentRow comment={comment} isReply={false} />
            {repliesOf(comment.id).map((reply) => (
              <CommentRow key={reply.id} comment={reply} isReply />
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
        {replyTo && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--ink-faint)" }}>
            <span>{replyTo.authorName}님에게 답글 다는 중</span>
            <button type="button" onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer" }}>
              취소
            </button>
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
          <input
            type="text"
            required
            placeholder={replyTo ? "답글 작성..." : "댓글 작성..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              flex: 1,
              fontFamily: "var(--font-body)",
              fontSize: "0.95rem",
              padding: "var(--sp-3)",
              borderRadius: 10,
              border: "1px solid var(--stone-border)",
              background: "var(--linen)",
              color: "var(--ink)",
            }}
          />
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            등록
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
      </form>
    </div>
  );
}
