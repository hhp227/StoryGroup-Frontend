"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
  type NotificationType,
} from "@/lib/api";

const TYPE_LABEL: Record<NotificationType, string> = {
  NEW_POST: "새 게시글",
  COMMENT: "댓글",
  LIKE: "좋아요",
  MENTION: "멘션",
  CHAT: "채팅 메시지",
  MEETING_STARTED: "화상회의 시작",
  NOTICE: "공지",
  INVITE: "초대",
};

export function NotificationList({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    listNotifications(token)
      .then(setNotifications)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "알림을 불러오지 못했습니다"));
  }, [token]);

  async function handleMarkAsRead(id: number) {
    setActionError(null);
    try {
      await markNotificationAsRead(token, id);
      setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null);
      // 헤더 배지가 듣고 미확인 개수를 다시 세게 한다(app-header.tsx).
      window.dispatchEvent(new Event("sg-notifications-read"));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "읽음 처리에 실패했습니다");
    }
  }

  async function handleMarkAllAsRead() {
    setActionError(null);
    try {
      await markAllNotificationsAsRead(token);
      setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
      window.dispatchEvent(new Event("sg-notifications-read"));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "읽음 처리에 실패했습니다");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {notifications && notifications.some((n) => !n.isRead) && (
        <button className="btn btn-secondary" type="button" onClick={handleMarkAllAsRead} style={{ alignSelf: "flex-end" }}>
          모두 읽음 처리
        </button>
      )}
      {loadError && <p className="field-error">{loadError}</p>}
      {actionError && <p className="field-error">{actionError}</p>}
      {notifications === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {notifications?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>아직 알림이 없습니다.</p>}
      {notifications?.map((n) => (
        <div
          key={n.id}
          className="card"
          style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", opacity: n.isRead ? 0.6 : 1 }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontWeight: 700 }}>{TYPE_LABEL[n.type]}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
              {new Date(n.createdAt).toLocaleString("ko-KR")}
            </span>
          </div>
          {!n.isRead && (
            <button className="btn btn-secondary" type="button" onClick={() => handleMarkAsRead(n.id)}>
              읽음
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
