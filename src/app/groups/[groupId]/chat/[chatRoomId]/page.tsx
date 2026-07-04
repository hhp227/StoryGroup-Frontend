"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ChatThread } from "@/components/chat-thread";

export default function ChatThreadPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string; chatRoomId: string }>();
  const groupId = Number(params.groupId);
  const chatRoomId = Number(params.chatRoomId);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)" }}>
      <ChatThread key={chatRoomId} token={accessToken} groupId={groupId} chatRoomId={chatRoomId} />
    </div>
  );
}
