"use client";

import { useCallback } from "react";
import { deleteMessage, getUserIdFromToken, listMessages, sendMessage } from "@/lib/api";
import { MessageThread } from "@/components/message-thread";

export function ChatThread({ token, groupId, chatRoomId }: { token: string; groupId: number; chatRoomId: number }) {
  const myUserId = getUserIdFromToken(token);

  const fetchMessages = useCallback(
    () => listMessages(token, groupId, chatRoomId).then((page) => [...page].reverse()),
    [token, groupId, chatRoomId]
  );
  const onSend = useCallback(
    (text: string) => sendMessage(token, groupId, chatRoomId, text),
    [token, groupId, chatRoomId]
  );
  const onDelete = useCallback(
    (messageId: number) => deleteMessage(token, groupId, chatRoomId, messageId),
    [token, groupId, chatRoomId]
  );

  return (
    <MessageThread
      myUserId={myUserId}
      fetchMessages={fetchMessages}
      deps={[token, groupId, chatRoomId]}
      onSend={onSend}
      onDelete={onDelete}
    />
  );
}
