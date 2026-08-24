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
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  // 통화 벨울림(CALL_INVITE, DM·그룹 방) — 헤더는 전역이라 어느 화면에서든 배너를 띄울 수 있다.
  const [incomingCall, setIncomingCall] = useState<{
    chatRoomId: number;
    fromUserName: string;
    groupId?: number | null;
    roomName?: string | null;
    // false면 보이스톡(모바일 발신) — 배너 문구만 구분한다(웹 통화 UI는 영상 단일)
    video?: boolean;
  } | null>(null);
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
    // CHAT_MESSAGE(2026-07-29부터 이 큐로 옴)·PRESENCE_CHANGED가 통화 배너로 오인되지 않게 명시 가드
    if (event.type !== "CALL_INVITE") return;
    // CALL_INVITE — 같은 사람이 다시 걸면 배너/타이머를 갱신한다.
    if (callBannerTimerRef.current) clearTimeout(callBannerTimerRef.current);
    setIncomingCall({
      chatRoomId: event.chatRoomId,
      fromUserName: event.fromUserName,
      groupId: event.groupId,
      roomName: event.roomName,
      video: event.video,
    });
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
    const { chatRoomId: roomId, groupId } = incomingCall;
    dismissCall();
    // ?call=1 — 통화 화면이 마운트되면서 벨울림 없이 바로 통화에 합류한다(받는 쪽).
    // 그룹 방이면 그룹 채팅 페이지의 해당 방으로(페이스톡 전환), DM이면 기존 DM 화면으로.
    if (groupId != null) {
      router.push(`/groups/${groupId}/chat?room=${roomId}&call=1`);
    } else {
      router.push(`/dm/${roomId}?call=1`);
    }
  }

  // 알림 화면에서 읽음 처리하면 그쪽에서 이 이벤트를 쏘고, 여기서 배지를 다시 센다.
  useEffect(() => {
    window.addEventListener("sg-notifications-read", refetchUnread);
    return () => window.removeEventListener("sg-notifications-read", refetchUnread);
  }, [refetchUnread]);

  // 로그아웃 시 리셋은 불필요 — 배지는 로그인 상태에서만 렌더되고,
  // 재로그인하면 소켓 (재)연결 시 refetchUnread가 정확한 값으로 다시 채운다.

  return (
    <header
      style={{
        // sticky가 아니라 fixed — 일부 환경에서 스크롤 시 헤더가 밀려 올라가는 문제가 있어
        // 조건 없이 고정한다. 본문은 body의 padding-top(globals.css)이 헤더 높이만큼 내려준다.
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottom: "1px solid var(--stone-border)",
        background: "color-mix(in srgb, var(--linen) 88%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
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
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
            {/* video=false면 보이스톡(모바일 발신) — 문구만 구분, 합류 UI는 영상 통화 공용 */}
            {incomingCall.roomName
              ? `${incomingCall.roomName} — ${incomingCall.fromUserName}님의 ${incomingCall.video === false ? "보이스톡" : "통화"} 요청`
              : `${incomingCall.fromUserName}님의 ${incomingCall.video === false ? "보이스톡" : "통화"} 요청`}
          </span>
          <button className="btn btn-primary" type="button" onClick={acceptCall}>
            받기
          </button>
          <button className="btn btn-ghost" type="button" onClick={dismissCall}>
            거절
          </button>
        </div>
      )}
      <div
        className="container"
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--sp-4)",
        }}
      >
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

        {/* 메뉴는 좌우로 흩지 않고 오른쪽 한 덩어리로 모은다(CatchRhy 랜딩 배치 참고) */}
        <nav style={{ display: "flex", alignItems: "center", gap: "var(--sp-5)" }}>
          {isReady && accessToken && (
            <>
              <Link className="nav-link" href="/">
                홈
              </Link>
              <Link className="nav-link" href="/groups">
                그룹
              </Link>
              <Link className="nav-link" href="/dm">
                채팅
              </Link>
              <Link className="nav-link" href="/search">
                검색
              </Link>
              <Link className="nav-link" href="/notifications">
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
              <span aria-hidden style={{ width: 1, height: 14, background: "var(--stone-border)" }} />
            </>
          )}

          {/* 테마 전환 UI는 /settings로 이동 — 헤더에는 진입 링크만 둔다. */}
          <Link className="nav-link" href="/settings">
            설정
          </Link>

          {isReady && (
            // 로그아웃은 /settings의 계정 메뉴로 옮겼다(모바일 프로필 화면 미러) —
            // 상시 노출할 만큼 자주 쓰는 동작이 아니고, 헤더 항목 수도 줄인다.
            accessToken ? (
              <Link className="nav-link" href="/settings/profile">
                프로필
              </Link>
            ) : (
              <>
                <Link className="nav-link" href="/login">
                  로그인
                </Link>
                <Link className="btn btn-primary" href="/register">
                  가입하기
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
