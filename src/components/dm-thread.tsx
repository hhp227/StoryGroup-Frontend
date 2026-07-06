"use client";

import { useCallback } from "react";
import { deleteDirectMessage, getUserIdFromToken, listDirectMessages, listDirectReads, markDirectRead, sendDirectMessage } from "@/lib/api";
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
  const fetchReads = useCallback(() => listDirectReads(token, chatRoomId), [token, chatRoomId]);
  const onMarkRead = useCallback(
    (lastReadMessageId: number) => markDirectRead(token, chatRoomId, lastReadMessageId),
    [token, chatRoomId]
  );

  return (
    <MessageThread
      key={chatRoomId}
      token={token}
      chatRoomId={chatRoomId}
      myUserId={myUserId}
      fetchMessages={fetchMessages}
      fetchReads={fetchReads}
      onSend={onSend}
      onDelete={onDelete}
      onMarkRead={onMarkRead}
    />
  );
}
