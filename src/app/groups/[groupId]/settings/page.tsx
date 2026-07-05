"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { GroupSettingsForm } from "@/components/group-settings-form";

export default function GroupSettingsPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>그룹 설정</h1>
      <GroupSettingsForm token={accessToken} groupId={groupId} />
    </div>
  );
}
