"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { DeleteAccountForm } from "@/components/delete-account-form";

export default function AccountSettingsPage() {
  const { accessToken, isReady, logout } = useAuth();
  const router = useRouter();

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container page page-form" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div>
        <Link href="/settings" style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          ‹ 설정
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginTop: "var(--sp-2)" }}>회원 탈퇴</h1>
      </div>
      <DeleteAccountForm
        token={accessToken}
        onDeleted={() => {
          // 서버가 세션·토큰을 이미 정리했다 - logout()의 서버 호출은 멱등이라 무해(설계 §5)
          logout();
          router.push("/");
        }}
      />
    </div>
  );
}
