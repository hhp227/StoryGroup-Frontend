"use client";

import { useCallback } from "react";
import { deleteDirectMessage, getUserIdFromToken, listDirectMessages, sendDirectMessage } from "@/lib/api";
import { MessageThread } from "@/components/message-thread";

export function DirectMessageThread({ token, chatRoomId }: { token: string; chatRoomId: number }) {
  const myUserId = getUserIdFromToken(token);

  const fetchMessages = useCallback(
    () => listDirectMessages(token, chatRoomId).then((page) => [...page].reverse()),
    [token, chatRoomId]
  );
  const onSend = useCallback((text: string) => sendDirectMessage(token, chatRoomId, text), [token, chatRoomId]);
  const onDelete = useCallback(
    (messageId: number) => deleteDirectMessage(token, chatRoomId, messageId),
    [token, chatRoomId]
  );

  return (
    <MessageThread
      key={chatRoomId}
      token={token}
      chatRoomId={chatRoomId}
      myUserId={myUserId}
      fetchMessages={fetchMessages}
      onSend={onSend}
      onDelete={onDelete}
    />
  );
}
