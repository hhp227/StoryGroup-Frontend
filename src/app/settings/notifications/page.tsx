"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ApiError, getPushPreferences, updatePushPreferences, type PushPreferences } from "@/lib/api";

// 알림 설정(푸시 on/off, 설계 §5) — 계정 단위라 앱에서도 같은 값이 보인다.
// 끄면 OS 푸시만 멈추고 인앱 실시간·뱃지·알림 목록은 그대로다(서버 PushBroadcaster 게이트).
export default function NotificationSettingsPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const [prefs, setPrefs] = useState<PushPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // "다시 시도"가 올리는 카운터 — effect 의존성으로 재조회를 유발한다
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getPushPreferences(accessToken)
      .then((loaded) => {
        if (!cancelled) setPrefs(loaded);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "알림 설정을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, reloadKey]);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  // 낙관적 갱신 — 화면은 즉시 바뀌고, 실패하면 호출 직전 값으로 되돌리며 에러를 보여준다
  async function toggle(patch: Partial<PushPreferences>) {
    if (!prefs || !accessToken) return;
    const previous = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaveError(null);
    try {
      await updatePushPreferences(accessToken, next);
    } catch (err) {
      setPrefs(previous);
      setSaveError(err instanceof ApiError ? err.message : "알림 설정을 저장하지 못했습니다.");
    }
  }

  return (
    <div className="container page page-form" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div>
        <Link href="/settings" style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          ‹ 설정
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginTop: "var(--sp-2)" }}>알림 설정</h1>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)", marginTop: 4 }}>
          끄면 이 계정의 모든 기기에서 해당 푸시 알림이 오지 않습니다. 앱 안의 알림 목록과 배지는 그대로입니다.
        </p>
      </div>

      {loadError ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", alignItems: "flex-start" }}>
          <p className="field-error">{loadError}</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setLoadError(null);
              setReloadKey((k) => k + 1);
            }}
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid var(--stone-border)",
            borderRadius: "var(--radius-card)",
            background: "var(--linen)",
            overflow: "hidden",
          }}
        >
          <ToggleRow
            label="채팅 알림"
            description="그룹 채팅·DM 메시지 푸시"
            checked={prefs?.chatEnabled ?? true}
            disabled={!prefs}
            onChange={(value) => toggle({ chatEnabled: value })}
          />
          <ToggleRow
            label="활동 알림"
            description="댓글·좋아요·공지 등 푸시"
            checked={prefs?.activityEnabled ?? true}
            disabled={!prefs}
            onChange={(value) => toggle({ activityEnabled: value })}
          />
        </div>
      )}
      {saveError && <p className="field-error">{saveError}</p>}
    </div>
  );
}

// 스위치 행 — 허브 SettingsRow와 같은 행 레이아웃에 우측 토글. 네이티브 체크박스 대신 role="switch" 버튼
// (키보드·스크린리더 호환, 스타일은 토큰으로). 로드 전(disabled)에는 기본값 ON 모양으로 반투명.
function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className="settings-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--sp-3)",
        padding: "var(--sp-4)",
        borderBottom: "1px solid var(--stone-border)",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{label}</span>
        <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          border: "none",
          padding: 3,
          background: checked ? "var(--accent)" : "var(--stone-border)",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          display: "flex",
          justifyContent: checked ? "flex-end" : "flex-start",
          transition: "background 0.15s",
        }}
      >
        <span
          aria-hidden
          style={{ width: 20, height: 20, borderRadius: 999, background: "var(--paper)", boxShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
        />
      </button>
    </div>
  );
}
