"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
  type NotificationType,
} from "@/lib/api";
import { formatRelativeTime } from "@/lib/format-time";

// 페이지당 알림 수 — listNotifications 기본 size(20)와 같아야 "응답 < PAGE_SIZE = 소진" 판정이 맞는다.
const PAGE_SIZE = 20;

const TYPE_LABEL: Record<NotificationType, string> = {
  NEW_POST: "새 게시글",
  COMMENT: "댓글",
  LIKE: "좋아요",
  MENTION: "멘션",
  CHAT: "채팅 메시지",
  MEETING_STARTED: "화상회의 시작",
  NOTICE: "공지",
  INVITE: "초대",
  JOIN_REQUEST: "가입 신청",
  JOIN_APPROVED: "가입 승인",
  JOIN_REJECTED: "가입 거절",
};

// 메달리온 아이콘 — KMP typeIcon(Material)/iOS SF Symbol과 의미 매핑한 이모지.
const TYPE_ICON: Record<NotificationType, string> = {
  NEW_POST: "📄",
  COMMENT: "💬",
  LIKE: "❤️",
  MENTION: "@",
  CHAT: "🗨️",
  MEETING_STARTED: "📹",
  NOTICE: "📢",
  INVITE: "✉️",
  JOIN_REQUEST: "🙋",
  JOIN_APPROVED: "✅",
  JOIN_REJECTED: "❌",
};

// 컨텍스트 줄 — 어떤 그룹/게시글의 알림인지. 서버가 못 푼 참조(삭제 등)는 null이라 줄째 숨긴다(KMP contextLine 미러).
function contextLine(n: AppNotification): string | null {
  if (n.groupName && n.postPreview) return `${n.groupName} · ${n.postPreview}`;
  return n.postPreview ?? n.groupName ?? null;
}

// 알림 목록 — KMP NotificationsScreen 미러(풀블리드 행·미읽음 헤더·컨텍스트·게시글 이동).
// 미읽음 건수는 서버 집계(unread-count)를 쓰고, 읽음 처리 성공 시 sg-notifications-read로 헤더 종 뱃지를 동기화한다.
export function NotificationList({ token }: { token: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // 한 건씩만 처리 — 처리 중엔 모든 행의 읽음 버튼을 잠근다(KMP processingId 미러, 모두 읽음은 -1).
  const [processingId, setProcessingId] = useState<number | null>(null);
  // 초기 로드 실패 시 "다시 시도" — effect를 다시 돌린다(setState는 .then 안에서만 — 린트 error 회피).
  const [reloadKey, setReloadKey] = useState(0);
  const nextPageRef = useRef(1);

  useEffect(() => {
    listNotifications(token)
      .then((page) => {
        nextPageRef.current = 1;
        setNotifications(page);
        setHasMore(page.length === PAGE_SIZE);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "알림을 불러오지 못했습니다"));
    // 미읽음 건수는 서버 집계(KMP와 같은 소스) — 실패해도 목록은 보여준다(헤더 줄만 빠짐).
    countUnreadNotifications(token)
      .then((r) => setUnreadCount(r.count))
      .catch(() => {});
  }, [token, reloadKey]);

  async function handleLoadMore() {
    if (isLoadingMore || notifications === null) return;
    setActionError(null);
    setIsLoadingMore(true);
    try {
      const fetched = await listNotifications(token, nextPageRef.current);
      nextPageRef.current += 1;
      setHasMore(fetched.length === PAGE_SIZE);
      setNotifications((prev) => {
        if (!prev) return fetched;
        // 로드 사이 새 알림 유입으로 오프셋이 밀리면 중복이 올 수 있어 id로 거른다.
        const knownIds = new Set(prev.map((n) => n.id));
        return [...prev, ...fetched.filter((n) => !knownIds.has(n.id))];
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "알림을 더 불러오지 못했습니다");
    } finally {
      setIsLoadingMore(false);
    }
  }

  // 헤더 종 뱃지가 듣고 미확인 개수를 다시 세게 한다(app-header.tsx).
  function notifyHeaderBadge() {
    window.dispatchEvent(new Event("sg-notifications-read"));
  }

  async function handleMarkAsRead(id: number) {
    setActionError(null);
    setProcessingId(id);
    try {
      await markNotificationAsRead(token, id);
      setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null);
      setUnreadCount((c) => Math.max(0, c - 1));
      notifyHeaderBadge();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "읽음 처리에 실패했습니다");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleMarkAllAsRead() {
    setActionError(null);
    setProcessingId(-1);
    try {
      await markAllNotificationsAsRead(token);
      setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
      setUnreadCount(0);
      notifyHeaderBadge();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "읽음 처리에 실패했습니다");
    } finally {
      setProcessingId(null);
    }
  }

  // 탭=소비(KMP 미러): 읽음 처리는 걸어두고 기다리지 않고 게시글 상세로 이동한다.
  function handleOpenPost(n: AppNotification) {
    if (n.groupId == null || n.postId == null) return;
    if (!n.isRead && processingId === null) {
      markNotificationAsRead(token, n.id).then(notifyHeaderBadge).catch(() => {});
    }
    router.push(`/groups/${n.groupId}/posts/${n.postId}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {unreadCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", paddingBottom: "var(--sp-2)" }}>
          <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--ink-soft)" }}>미읽음 {unreadCount}건</span>
          <button className="btn btn-ghost" type="button" onClick={handleMarkAllAsRead} disabled={processingId !== null}>
            모두 읽음 처리
          </button>
        </div>
      )}
      {actionError && <p className="field-error">{actionError}</p>}
      {loadError && notifications === null && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-2)", padding: "var(--sp-6) 0" }}>
          <p style={{ color: "var(--rust)", fontSize: "0.9rem" }}>{loadError}</p>
          <button className="btn btn-ghost" type="button" onClick={() => setReloadKey((k) => k + 1)}>
            다시 시도
          </button>
        </div>
      )}
      {notifications === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {notifications?.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-1)", padding: "var(--sp-6) 0" }}>
          <p style={{ fontWeight: 700 }}>알림이 없습니다</p>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-faint)" }}>새 소식이 생기면 여기에 표시됩니다.</p>
        </div>
      )}
      {notifications?.map((n) => {
        const canOpen = n.groupId != null && n.postId != null;
        const context = contextLine(n);
        return (
          <div
            key={n.id}
            className={`noti-row ${n.isRead ? "read" : "unread"}${canOpen ? " clickable" : ""}`}
            onClick={canOpen ? () => handleOpenPost(n) : undefined}
          >
            <div className="noti-medallion">{TYPE_ICON[n.type]}</div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{TYPE_LABEL[n.type]}</span>
              {context && <span className="noti-context">{context}</span>}
              <span style={{ fontSize: "0.72rem", color: "var(--ink-faint)" }}>{formatRelativeTime(n.createdAt)}</span>
            </div>
            {!n.isRead && (
              <button
                type="button"
                onClick={(e) => {
                  // 행 클릭(게시글 이동)으로 번지지 않게.
                  e.stopPropagation();
                  handleMarkAsRead(n.id);
                }}
                disabled={processingId !== null}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: processingId !== null ? "var(--ink-faint)" : "var(--accent)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  padding: "var(--sp-2)",
                  flexShrink: 0,
                  fontFamily: "inherit",
                }}
              >
                {processingId === n.id ? "..." : "읽음"}
              </button>
            )}
          </div>
        );
      })}
      {hasMore && notifications !== null && (
        <button
          className="btn btn-secondary"
          type="button"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          style={{ alignSelf: "center", marginTop: "var(--sp-4)" }}
        >
          {isLoadingMore ? "불러오는 중..." : "더 보기"}
        </button>
      )}
    </div>
  );
}
