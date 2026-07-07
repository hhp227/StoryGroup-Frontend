"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { DirectMessageThread } from "@/components/dm-thread";
import { DmCall } from "@/components/dm-call";

export default function DmThreadPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ chatRoomId: string }>();
  const chatRoomId = Number(params.chatRoomId);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <DmCall key={`call-${chatRoomId}`} token={accessToken} chatRoomId={chatRoomId} />
      <DirectMessageThread key={chatRoomId} token={accessToken} chatRoomId={chatRoomId} />
    </div>
  );
}
