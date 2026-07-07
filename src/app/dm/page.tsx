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
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>DM</h1>
      <DmRoomList token={accessToken} />
    </div>
  );
}
