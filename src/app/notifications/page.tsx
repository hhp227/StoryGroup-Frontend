"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { NotificationList } from "@/components/notification-list";

export default function NotificationsPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>알림</h1>
      <NotificationList token={accessToken} />
    </div>
  );
}
