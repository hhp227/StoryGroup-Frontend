"use client";

import { useState } from "react";
import Script from "next/script";
import type { AppleLoginPayload } from "@/lib/api";

// Services ID·Return URL은 공개값(콘솔 등록값) — env로 바꿀 수 있게만 열어 둔다(구글 클라이언트 ID와 같은 방식).
// Return URL은 콘솔에 등록한 값과 글자 하나까지 같아야 한다 — localhost는 등록 불가라 로컬에선 팝업이 실패한다
const APPLE_SERVICES_ID = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID ?? "com.hhp227.Application.web";
const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ?? "https://storygroup-frontend.vercel.app/login";

interface AppleSignInResponse {
  authorization: { id_token: string; code: string };
  user?: { name?: { firstName?: string; lastName?: string } };
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
        signIn: () => Promise<AppleSignInResponse>;
      };
    };
  }
}

function AppleLogo() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" style={{ flexShrink: 0 }}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

// 애플 HIG — 검정 배경·흰 로고. 팝업 모드라 페이지 이동 없이 id_token·code를 받는다.
// 로그인·가입 화면 공용(애플도 가입=로그인)
export function AppleSignInButton({
  onCredential,
  onError,
  disabled,
}: {
  onCredential: (payload: AppleLoginPayload) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && !!window.AppleID);
  if (!APPLE_SERVICES_ID || !APPLE_REDIRECT_URI) return null;

  async function handleClick() {
    const auth = window.AppleID?.auth;
    if (!auth) return;
    auth.init({ clientId: APPLE_SERVICES_ID, scope: "name email", redirectURI: APPLE_REDIRECT_URI, usePopup: true });
    try {
      const res = await auth.signIn();
      onCredential({
        identityToken: res.authorization.id_token,
        authorizationCode: res.authorization.code,
        firstName: res.user?.name?.firstName,
        lastName: res.user?.name?.lastName,
      });
    } catch (err) {
      // 사용자가 팝업을 닫거나 취소한 경우는 조용히
      const code = (err as { error?: string } | null)?.error;
      if (code === "popup_closed_by_user" || code === "user_cancelled_authorize") return;
      onError("애플 로그인 창을 열지 못했습니다. 팝업 차단을 확인해주세요.");
    }
  }

  return (
    <>
      <Script
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/ko_KR/appleid.auth.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <button
        className="btn"
        type="button"
        style={{ width: "100%", marginBottom: "var(--sp-3)", background: "#000000", color: "#ffffff", borderColor: "#000000" }}
        disabled={disabled || !scriptReady}
        onClick={handleClick}
      >
        <AppleLogo />
        Apple로 계속하기
      </button>
    </>
  );
}
