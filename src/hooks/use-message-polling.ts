"use client";

import { useCallback } from "react";
import { listMessages, type ChatMessage } from "@/lib/api";
import { usePolling } from "./use-polling";

// 내용이 안 바뀐 메시지는 이전 객체 참조를 그대로 재사용한다 — ChatThread의 MessageBubble이
// React.memo로 감싸져 있어서, 이렇게 해야 매 폴링마다 전체가 아니라 실제로 바뀐 행만 리렌더된다.
function mergeMessages(prev: ChatMessage[] | null, next: ChatMessage[]): ChatMessage[] {
  if (!prev) return next;
  const prevById = new Map(prev.map((m) => [m.id, m]));
  return next.map((m) => {
    const old = prevById.get(m.id);
    return old && old.text === m.text && old.createdAt === m.createdAt ? old : m;
  });
}

export function useMessagePolling(token: string, groupId: number, chatRoomId: number, intervalMs = 4000) {
  const fetchPage = useCallback(
    () => listMessages(token, groupId, chatRoomId).then((page) => [...page].reverse()),
    [token, groupId, chatRoomId]
  );
  const { data, error, setData } = usePolling(fetchPage, intervalMs, [token, groupId, chatRoomId], mergeMessages);

  const appendLocal = useCallback((message: ChatMessage) => {
    setData((prev) => (prev ? [...prev, message] : [message]));
  }, [setData]);

  const removeLocal = useCallback((messageId: number) => {
    setData((prev) => prev?.filter((m) => m.id !== messageId) ?? null);
  }, [setData]);

  return { messages: data, error, appendLocal, removeLocal };
}
