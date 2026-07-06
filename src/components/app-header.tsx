"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { countUnreadNotifications } from "@/lib/api";
import { useNotificationSocket } from "@/hooks/use-notification-socket";
import { useAuth } from "./auth-provider";

// 벨울림 배너는 이 시간이 지나면 자동으로 사라진다(부재중 이력은 남기지 않는 휘발성 신호).
const CALL_BANNER_TIMEOUT_MS = 30_000;

export function AppHeader() {
  const { accessToken, isReady, logout } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  // DM 통화 벨울림(CALL_INVITE) — 헤더는 전역이라 어느 화면에서든 배너를 띄울 수 있다.
  const [incomingCall, setIncomingCall] = useState<{ chatRoomId: number; fromUserName: string } | null>(null);
  const callBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchUnread = useCallback(() => {
    if (!accessToken) return;
    countUnreadNotifications(accessToken)
      .then((r) => setUnreadCount(r.count))
      .catch(() => {}); // 배지는 부가 정보라 실패해도 조용히 넘어간다
  }, [accessToken]);

  const dismissCall = useCallback(() => {
    if (callBannerTimerRef.current) clearTimeout(callBannerTimerRef.current);
    callBannerTimerRef.current = null;
    setIncomingCall(null);
  }, []);

  // 20초 REST 폴링을 대체: (재)연결 시 REST로 개수 복구 + 이후 개인 큐 이벤트로 증가.
  useNotificationSocket(accessToken, refetchUnread, (event) => {
    if (event.type === "NOTIFICATION") {
      setUnreadCount((c) => c + 1);
      return;
    }
    // CALL_INVITE — 같은 사람이 다시 걸면 배너/타이머를 갱신한다.
    if (callBannerTimerRef.current) clearTimeout(callBannerTimerRef.current);
    setIncomingCall({ chatRoomId: event.chatRoomId, fromUserName: event.fromUserName });
    callBannerTimerRef.current = setTimeout(() => setIncomingCall(null), CALL_BANNER_TIMEOUT_MS);
  });

  useEffect(() => {
    const timer = callBannerTimerRef;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function acceptCall() {
    if (!incomingCall) return;
    const roomId = incomingCall.chatRoomId;
    dismissCall();
    // ?call=1 — DM 화면이 마운트되면서 벨울림 없이 바로 통화에 합류한다(받는 쪽).
    router.push(`/dm/${roomId}?call=1`);
  }

  // 알림 화면에서 읽음 처리하면 그쪽에서 이 이벤트를 쏘고, 여기서 배지를 다시 센다.
  useEffect(() => {
    window.addEventListener("sg-notifications-read", refetchUnread);
    return () => window.removeEventListener("sg-notifications-read", refetchUnread);
  }, [refetchUnread]);

  // 로그아웃 시 리셋은 불필요 — 배지는 로그인 상태에서만 렌더되고,
  // 재로그인하면 소켓 (재)연결 시 refetchUnread가 정확한 값으로 다시 채운다.

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
      {incomingCall && (
        <div
          role="alert"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-3)",
            padding: "var(--sp-3) var(--sp-4)",
            borderRadius: 14,
            border: "1px solid var(--stone-border)",
            background: "var(--paper)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>📞</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{incomingCall.fromUserName}님의 통화 요청</span>
          <button className="btn btn-primary" type="button" onClick={acceptCall}>
            받기
          </button>
          <button className="btn btn-ghost" type="button" onClick={dismissCall}>
            거절
          </button>
        </div>
      )}
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
