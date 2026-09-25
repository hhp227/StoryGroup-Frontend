"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

// 웹 OAuth 클라이언트 ID는 공개값 — env로 바꿀 수 있게만 열어 둔다(설계 §4)
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "476947981226-8p3os2079vk0uueh9v70lgr8cdvi32i0.apps.googleusercontent.com";

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: () => void;
}

interface GoogleAccountsOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string }) => void;
  }) => TokenClient;
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleAccountsOauth2 } };
  }
}

// 구글 브랜드 4색 G — 핑크(accent) 버튼 위에서도 보이도록 흰 원 배지에 얹는다
function GoogleLogo() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        // 글자 줄 높이보다 큰 배지가 버튼을 키우지 않게 — 로그인 버튼과 높이를 똑같이 맞춘다
        margin: "-4px 0",
        borderRadius: "50%",
        background: "#ffffff",
        flexShrink: 0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    </span>
  );
}

// "또는" 구분선 + 로그인 버튼과 같은 btn-primary 구글 버튼. 공식 GIS 버튼(iframe)은 스타일을 바꿀 수 없어
// 토큰 클라이언트 팝업으로 액세스 토큰을 받는다 — 서버가 tokeninfo로 aud를 확인한다(/api/auth/google/access-token).
// 로그인·가입 화면이 같이 쓴다 — 구글은 가입과 로그인이 한 경로(서버가 없으면 만든다).
export function GoogleSignInButton({
  onAccessToken,
  onError,
  disabled,
}: {
  onAccessToken: (accessToken: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  // 다른 페이지에서 이미 스크립트를 받아 둔 경우 onReady를 기다리지 않는다
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && !!window.google);
  const clientRef = useRef<TokenClient | null>(null);
  // 부모가 매 렌더 새 콜백을 넘겨도 클라이언트를 다시 만들지 않도록 ref로 최신값만 참조
  const callbacksRef = useRef({ onAccessToken, onError });
  useEffect(() => {
    callbacksRef.current = { onAccessToken, onError };
  }, [onAccessToken, onError]);

  useEffect(() => {
    const oauth2 = window.google?.accounts.oauth2;
    if (!scriptReady || !oauth2) return;
    clientRef.current = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (res) => {
        if (res.access_token) callbacksRef.current.onAccessToken(res.access_token);
        else callbacksRef.current.onError("구글 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      },
      // 사용자가 팝업을 닫은 경우(popup_closed)는 조용히 — 차단 등 그 밖의 실패만 안내
      error_callback: (err) => {
        if (err.type !== "popup_closed") callbacksRef.current.onError("구글 로그인 창을 열지 못했습니다. 팝업 차단을 확인해주세요.");
      },
    });
  }, [scriptReady]);

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-3)",
          margin: "var(--sp-5) 0",
          color: "var(--ink-soft)",
          fontSize: "0.85rem",
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--stone-border)" }} />
        또는
        <span style={{ flex: 1, height: 1, background: "var(--stone-border)" }} />
      </div>
      <button
        className="btn btn-primary"
        type="button"
        style={{ width: "100%" }}
        disabled={disabled || !scriptReady}
        onClick={() => clientRef.current?.requestAccessToken()}
      >
        <GoogleLogo />
        Google로 계속하기
      </button>
    </>
  );
}
