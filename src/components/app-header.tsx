"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { countUnreadNotifications } from "@/lib/api";
import { usePolling } from "@/hooks/use-polling";
import { useAuth } from "./auth-provider";
import { useTheme } from "./theme-provider";

export function AppHeader() {
  const { mood, mode, setMood, setMode } = useTheme();
  const { accessToken, isReady, logout } = useAuth();
  const router = useRouter();

  const fetchUnreadCount = useCallback(
    () => (accessToken ? countUnreadNotifications(accessToken).then((r) => r.count) : Promise.resolve(0)),
    [accessToken]
  );
  const { data: unreadCount } = usePolling(fetchUnreadCount, 20000, [accessToken]);

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
        <div style={{ display: "flex", gap: "4px", background: "var(--paper)", border: "1px solid var(--stone-border)", borderRadius: 999, padding: 3 }}>
          <ThemeButton active={mood === "warm"} onClick={() => setMood("warm")}>
            다정함
          </ThemeButton>
          <ThemeButton active={mood === "vibrant"} onClick={() => setMood("vibrant")}>
            캐주얼
          </ThemeButton>
        </div>
        <div style={{ display: "flex", gap: "4px", background: "var(--paper)", border: "1px solid var(--stone-border)", borderRadius: 999, padding: 3 }}>
          <ThemeButton active={mode === "light"} onClick={() => setMode("light")}>
            라이트
          </ThemeButton>
          <ThemeButton active={mode === "dark"} onClick={() => setMode("dark")}>
            다크
          </ThemeButton>
        </div>

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

function ThemeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "0.78rem",
        fontWeight: 700,
        color: active ? "var(--on-accent)" : "var(--ink-soft)",
        background: active ? "var(--accent)" : "transparent",
        border: "none",
        borderRadius: 999,
        padding: "6px 12px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
