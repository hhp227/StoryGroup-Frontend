"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

// 웹 OAuth 클라이언트 ID는 공개값 — env로 바꿀 수 있게만 열어 둔다(설계 §4)
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "476947981226-8p3os2079vk0uueh9v70lgr8cdvi32i0.apps.googleusercontent.com";

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

// "또는" 구분선 + Google Identity Services 공식 버튼. 콜백의 credential이 ID 토큰(JWT)이다.
// 로그인·가입 화면이 같이 쓴다 — 구글은 가입과 로그인이 한 경로(서버가 없으면 만든다).
export function GoogleSignInButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 다른 페이지에서 이미 스크립트를 받아 둔 경우 onReady를 기다리지 않는다
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && !!window.google);
  // 부모가 매 렌더 새 콜백을 넘겨도 버튼을 다시 그리지 않도록 ref로 최신값만 참조
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const gis = window.google?.accounts.id;
    if (!scriptReady || !gis || !containerRef.current) return;
    gis.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (res) => onCredentialRef.current(res.credential) });
    gis.renderButton(containerRef.current, { theme: "outline", size: "large", text: "continue_with", width: 320, locale: "ko" });
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
      <div ref={containerRef} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} />
    </>
  );
}
