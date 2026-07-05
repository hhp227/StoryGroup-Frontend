"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ProfileForm } from "@/components/profile-form";

export default function ProfilePage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>프로필</h1>
      <ProfileForm token={accessToken} />
    </div>
  );
}
