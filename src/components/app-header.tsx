"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { countUnreadNotifications } from "@/lib/api";
import { useNotificationSocket } from "@/hooks/use-notification-socket";
import { useAuth } from "./auth-provider";

export function AppHeader() {
  const { accessToken, isReady, logout } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const refetchUnread = useCallback(() => {
    if (!accessToken) return;
    countUnreadNotifications(accessToken)
      .then((r) => setUnreadCount(r.count))
      .catch(() => {}); // 배지는 부가 정보라 실패해도 조용히 넘어간다
  }, [accessToken]);

  // 20초 REST 폴링을 대체: (재)연결 시 REST로 개수 복구 + 이후 개인 큐 이벤트로 증가.
  useNotificationSocket(accessToken, refetchUnread, () => setUnreadCount((c) => c + 1));

  // 알림 화면에서 읽음 처리하면 그쪽에서 이 이벤트를 쏘고, 여기서 배지를 다시 센다.
  useEffect(() => {
    window.addEventListener("sg-notifications-read", refetchUnread);
    return () => window.removeEventListener("sg-notifications-read", refetchUnread);
  }, [refetchUnread]);

  useEffect(() => {
    if (!accessToken) setUnreadCount(0);
  }, [accessToken]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--sp-4)",
        padding: "var(--sp-4) var(--sp-5)",
        borderBottom: "1px solid var(--stone-border)",
        background: "var(--linen)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-5)" }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--display-weight)" as never,
            letterSpacing: "var(--display-tracking)",
            fontSize: "1.15rem",
          }}
        >
          StoryGroup
        </Link>
        {isReady && accessToken && (
          <nav style={{ display: "flex", gap: "var(--sp-4)" }}>
            <Link href="/" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink-soft)" }}>
              홈
            </Link>
            <Link href="/groups" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink-soft)" }}>
              그룹
            </Link>
            <Link href="/dm" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink-soft)" }}>
              DM
            </Link>
            <Link href="/search" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink-soft)" }}>
              검색
            </Link>
            <Link href="/notifications" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6 }}>
              알림
              {!!unreadCount && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "var(--on-accent)",
                    background: "var(--accent)",
                    borderRadius: 999,
                    padding: "1px 7px",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </Link>
          </nav>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)" }}>
        {/* 테마 전환 UI는 /settings로 이동 — 헤더에는 진입 링크만 둔다. */}
        <Link className="btn btn-ghost" href="/settings">
          설정
        </Link>

        {isReady && (
          accessToken ? (
            <>
              <Link className="btn btn-ghost" href="/profile">
                프로필
              </Link>
              <button className="btn btn-ghost" type="button" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/login">
                로그인
              </Link>
              <Link className="btn btn-primary" href="/register">
                가입하기
              </Link>
            </>
          )
        )}
      </div>
    </header>
  );
}
