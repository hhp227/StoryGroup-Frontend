"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ProfileForm } from "@/components/profile-form";

export default function ProfileSettingsPage() {
  const { accessToken, isReady } = useAuth();
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
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginTop: "var(--sp-2)" }}>프로필 설정</h1>
      </div>
      <ProfileForm token={accessToken} />
    </div>
  );
}
