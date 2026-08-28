"use client";

import { useEffect } from "react";
import { useAuth } from "./auth-provider";
import { registerPushToken } from "@/lib/api";
import { obtainPushToken } from "@/lib/push";

/** 로그인 상태로 앱 진입 시 1회 — 권한 요청 후 FCM 토큰을 서버에 등록한다(설계 §8). 렌더 없음 */
export function PushRegister() {
  const { accessToken, isReady } = useAuth();

  useEffect(() => {
    if (!isReady || !accessToken) return;
    let cancelled = false;
    (async () => {
      const pushToken = await obtainPushToken().catch(() => null);
      if (!pushToken || cancelled) return;
      await registerPushToken(accessToken, pushToken).catch(() => {
        // 등록 실패는 무시 — 다음 진입에서 멱등 재시도(설계 §10)
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, accessToken]);

  return null;
}
