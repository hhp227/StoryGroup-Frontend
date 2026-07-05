"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { DmRoomList } from "@/components/dm-room-list";

export default function DmRoomsPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>DM</h1>
      <DmRoomList token={accessToken} />
    </div>
  );
}
