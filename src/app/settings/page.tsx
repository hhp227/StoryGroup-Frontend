"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getMyProfile } from "@/lib/api";

// 설정 허브 - 항목은 하위 페이지로 분리하고 여기는 그룹핑된 메뉴 목록만 둔다.
// 테마처럼 로그인 없이도 의미 있는 항목과 약관/정책은 비로그인에게도 보여준다.
export default function SettingsPage() {
  const { accessToken, isReady, logout } = useAuth();
  const router = useRouter();
  const isLoggedIn = isReady && !!accessToken;

  // 운영자 메뉴 노출용. 조회 실패는 무시한다 - 설정 허브 자체는 프로필 없이도 동작해야 한다.
  // 로그아웃 상태에서는 isLoggedIn 조건이 섹션을 숨기므로 동기 리셋은 필요 없다(lint: set-state-in-effect).
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    getMyProfile(accessToken)
      .then((profile) => setIsAdmin(profile.isAdmin))
      .catch(() => {});
  }, [accessToken]);

  return (
    <div className="container page page-form" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>설정</h1>

      {isLoggedIn && (
        <SettingsSection title="계정">
          <SettingsRow href="/settings/profile" label="프로필 설정" description="이름, 프로필 사진, 상태 메시지" />
          <SettingsRow href="/settings/password" label="비밀번호 변경" description="로그인 비밀번호를 바꿉니다" />
          {/* 모바일 프로필 화면 미러 — 계정 메뉴의 마지막 행에 두고 rust 색으로 구분한다.
              헤더 우측 상단에 있던 버튼을 여기로 옮겼다(상시 노출할 만큼 자주 쓰는 동작이 아니다). */}
          <SettingsActionRow
            label="로그아웃"
            description="이 기기에서 계정 연결을 끊습니다"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          />
        </SettingsSection>
      )}

      {isLoggedIn && (
        <SettingsSection title="개인정보 보호">
          <SettingsRow href="/settings/blocked" label="차단 사용자 관리" description="차단한 사용자를 확인하고 해제합니다" />
        </SettingsSection>
      )}

      {isLoggedIn && isAdmin && (
        <SettingsSection title="운영자">
          <SettingsRow href="/admin/reports" label="사용자 신고 관리" description="접수된 사용자 신고를 확인하고 처리합니다" />
        </SettingsSection>
      )}

      <SettingsSection title="화면">
        <SettingsRow href="/settings/theme" label="테마" description="무드와 라이트/다크 모드" />
      </SettingsSection>

      <SettingsSection title="약관 및 정책">
        <SettingsRow href="/terms" label="이용약관" />
        <SettingsRow href="/privacy" label="개인정보처리방침" />
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <h2 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-soft)" }}>{title}</h2>
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
        {children}
      </div>
    </section>
  );
}

// 이동이 아니라 그 자리에서 실행되는 행 — 링크가 아니므로 이동 표시(›)를 달지 않는다.
function SettingsActionRow({ label, description, onClick }: { label: string; description?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="settings-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--sp-3)",
        padding: "var(--sp-4)",
        // 바로 위 행이 이미 아래쪽 구분선을 갖고 있어 여기선 테두리가 필요 없다
        // (카드 마지막 행이라 .settings-row:last-child가 아래 선도 지운다).
        border: "none",
        background: "none",
        cursor: "pointer",
        textAlign: "left",
        font: "inherit",
        color: "var(--rust)",
        width: "100%",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{label}</span>
        {description && <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>{description}</span>}
      </span>
    </button>
  );
}

function SettingsRow({ href, label, description }: { href: string; label: string; description?: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--sp-3)",
        padding: "var(--sp-4)",
        borderBottom: "1px solid var(--stone-border)",
        color: "inherit",
      }}
      className="settings-row"
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{label}</span>
        {description && <span style={{ fontSize: "0.8rem", color: "var(--ink-faint)" }}>{description}</span>}
      </span>
      <span aria-hidden style={{ color: "var(--ink-faint)", fontSize: "1.1rem" }}>
        ›
      </span>
    </Link>
  );
}
