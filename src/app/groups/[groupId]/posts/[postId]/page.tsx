"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { UserActionMenu } from "@/components/user-action-menu";
import { VideoAttachment } from "@/components/video-attachment";
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
  reportPost,
  setPostNotice,
  updatePost,
  unlikePost,
  unsetPostNotice,
  uploadImage,
  type Comment,
  type Group,
  type Like,
  type Post,
} from "@/lib/api";
import { attachVideoWithCompression } from "@/lib/attach-video";
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
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  // 본문 수정 — 별도 페이지 없이 그 자리에서 textarea로 바뀐다. 첨부(이미지·동영상)도 이 폼이 관리한다:
  // 기존 목록을 편집 상태로 복사해 삭제/추가 후 전체 교체 전송(서버 3상태 계약).
  const [editText, setEditText] = useState<string | null>(null);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editVideos, setEditVideos] = useState<string[]>([]);
  // 첨부 파이프라인 상태 문구("압축 중 n%"/"업로드 중...") — 작성 폼(group-post-feed) 미러
  const [editAttachStatus, setEditAttachStatus] = useState<string | null>(null);
  const [editAttachError, setEditAttachError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  // 편집 목록을 전체 교체로 보낸다 — 서버의 images/videos는 전체 교체라 빼먹으면 첨부가 사라진다.
  async function handleSaveEdit() {
    if (!post || editText === null) return;
    setIsSavingEdit(true);
    try {
      const updated = await updatePost(accessToken!, groupId, postId, editText, editImages, editVideos);
      setPost(updated);
      closeEdit();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "게시글 수정에 실패했습니다");
    } finally {
      setIsSavingEdit(false);
    }
  }

  // 수정 진입 — 기존 첨부를 편집 목록으로 복사(삭제/추가는 이 사본에서만 일어난다)
  function openEdit() {
    if (!post) return;
    setEditText(post.text);
    setEditImages(post.images.map((i) => i.image));
    setEditVideos((post.videos ?? []).map((v) => v.video));
    setEditAttachError(null);
  }

  function closeEdit() {
    setEditText(null);
    setEditImages([]);
    setEditVideos([]);
    setEditAttachStatus(null);
    setEditAttachError(null);
  }

  // 작성 폼(group-post-feed handleAttach) 미러 — 동영상은 5MB 압축 파이프라인 공용(§2)
  async function handleEditAttach(files: FileList | null) {
    if (!files || files.length === 0 || !accessToken) return;
    setEditAttachError(null);
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith("video/")) {
          const url = await attachVideoWithCompression(accessToken, file, setEditAttachStatus);
          setEditVideos((prev) => [...prev, url]);
        } else {
          setEditAttachStatus("업로드 중...");
          const { url } = await uploadImage(accessToken, file);
          setEditImages((prev) => [...prev, url]);
        }
      }
    } catch (err) {
      setEditAttachError(err instanceof Error ? err.message : "첨부 파일 업로드에 실패했습니다");
    } finally {
      setEditAttachStatus(null);
      if (editFileInputRef.current) editFileInputRef.current.value = "";
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

  // 게시글 자체를 신고(작성자 신고는 UserActionMenu가 따로 담당). 접수는 방장/부방장 신고함으로 간다.
  async function handleReportPost() {
    if (!accessToken) return;
    if (!confirm("이 게시글을 신고할까요?")) return;
    try {
      await reportPost(accessToken, groupId, postId);
      setActionNotice("신고가 접수되었습니다");
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "신고에 실패했습니다");
      setActionNotice(null);
    }
  }

  if (!isReady || !accessToken) return null;

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {actionNotice && <p style={{ color: "var(--moss)", fontSize: "0.9rem", margin: 0 }}>{actionNotice}</p>}

      {post && (
        <article className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            {/* 작성자 아바타/이름 클릭 → 사용자 액션 메뉴(프로필/DM/신고/차단, 본인 글이면 프로필만) */}
            <UserActionMenu
              token={accessToken}
              userId={post.userId}
              userName={post.authorName}
              isSelf={post.userId === myUserId}
              // 차단하면 이 글 자체가 숨겨지므로 그룹 피드로 되돌린다.
              onBlocked={() => router.push(`/groups/${groupId}`)}
              onNotice={(message, isError) => {
                if (isError) {
                  setLoadError(message);
                  setActionNotice(null);
                } else {
                  setActionNotice(message);
                  setLoadError(null);
                }
              }}
            >
              <div className="avatar">{post.authorName.slice(0, 1)}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.92rem", fontWeight: 700 }}>{post.authorName}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
                  {new Date(post.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
            </UserActionMenu>
            <div style={{ flex: 1 }} />
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
            {post.userId !== myUserId && (
              <button
                type="button"
                onClick={handleReportPost}
                style={{ fontSize: "0.78rem", color: "var(--rust)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                신고
              </button>
            )}
            {/* 수정은 작성자 본인만 — 서버도 같은 규칙(requirePostOwner)이라 모더레이터에게도 안 보인다
                (삭제는 모더레이터도 가능해서 조건이 다르다) */}
            {post.userId === myUserId && editText === null && (
              <button
                type="button"
                onClick={openEdit}
                style={{ fontSize: "0.78rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                수정
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
          {editText !== null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", margin: "var(--sp-4) 0" }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={5}
                autoFocus
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.98rem",
                  lineHeight: 1.6,
                  padding: "var(--sp-3)",
                  borderRadius: 10,
                  border: "1px solid var(--stone-border)",
                  background: "var(--linen)",
                  color: "var(--ink)",
                  resize: "vertical",
                }}
              />
              {/* 첨부 편집 — 작성 폼과 같은 썸네일+✕ 패턴, 신규 첨부는 압축→업로드 파이프라인 공용 */}
              {(editImages.length > 0 || editVideos.length > 0) && (
                <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
                  {editImages.map((url) => (
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
                        onClick={() => setEditImages((prev) => prev.filter((u) => u !== url))}
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
                  {editVideos.map((url) => (
                    <div key={url} style={{ position: "relative" }}>
                      {/* preload="metadata"로 첫 프레임만 받아 썸네일처럼 보여준다 */}
                      <video
                        src={url}
                        muted
                        preload="metadata"
                        style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid var(--stone-border)" }}
                      />
                      <button
                        type="button"
                        aria-label="동영상 제거"
                        onClick={() => setEditVideos((prev) => prev.filter((u) => u !== url))}
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
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => handleEditAttach(e.target.files)}
                  disabled={editAttachStatus !== null || isSavingEdit}
                  style={{ fontSize: "0.82rem" }}
                />
                {editAttachStatus && <span style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>{editAttachStatus}</span>}
              </div>
              {editAttachError && <p className="field-error">{editAttachError}</p>}
              <div style={{ display: "flex", gap: "var(--sp-2)", alignSelf: "flex-end" }}>
                <button className="btn btn-ghost" type="button" onClick={closeEdit} disabled={isSavingEdit}>
                  취소
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || editAttachStatus !== null}
                >
                  {isSavingEdit ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          ) : post.text.length > 0 ? (
            <p style={{ fontSize: "0.98rem", lineHeight: 1.6, margin: "var(--sp-4) 0", whiteSpace: "pre-wrap" }}>{post.text}</p>
          ) : (
            // 첨부만 있는 게시글 - 피드 카드와 동일하게 헤더와 첨부 사이 최소 간격만 둔다.
            <div style={{ height: "var(--sp-3)" }} />
          )}
          {(post.images.length > 0 || (post.videos ?? []).length > 0) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
              {post.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.image} alt="" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--stone-border)" }} />
              ))}
              {(post.videos ?? []).map((v) => (
                <VideoAttachment key={v.id} src={v.video} />
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
  const [notice, setNotice] = useState<string | null>(null);
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
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginLeft: isReply ? 40 : 0 }}>
        {/* 게시글 작성자와 동일한 사용자 액션 메뉴. 차단 시 그 작성자의 댓글을 목록에서 바로 걷어낸다(서버 숨김과 동일 효과). */}
        <UserActionMenu
          token={token}
          userId={comment.userId}
          userName={comment.authorName}
          isSelf={comment.userId === myUserId}
          onBlocked={() => onChange(comments.filter((c) => c.userId !== comment.userId))}
          onNotice={(message, isError) => {
            if (isError) {
              setError(message);
              setNotice(null);
            } else {
              setNotice(message);
              setError(null);
            }
          }}
        >
          <div className="avatar sm">{comment.authorName.slice(0, 1)}</div>
          <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{comment.authorName}</span>
        </UserActionMenu>
        {/* 본문/메타는 아바타 폭(30px)+간격만큼 들여써서 기존 정렬을 유지한다 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginLeft: 42 }}>
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
      {notice && <p style={{ color: "var(--moss)", fontSize: "0.85rem", margin: 0 }}>{notice}</p>}

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
