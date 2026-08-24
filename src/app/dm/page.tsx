"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ChatHubList } from "@/components/chat-hub-list";

// 채팅 허브: 그룹 채팅방과 1:1 DM을 한 화면에 모은다(헤더 "채팅" 탭의 랜딩).
// 경로는 기존 링크/북마크 호환을 위해 /dm을 유지한다. 목록은 KMP ChatScreen 미러(카톡식 풀블리드 행).
export default function ChatHubPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>채팅</h1>
      <ChatHubList token={accessToken} />
    </div>
  );
}
