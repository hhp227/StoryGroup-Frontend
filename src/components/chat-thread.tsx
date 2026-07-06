"use client";

import { useCallback } from "react";
import { deleteMessage, getUserIdFromToken, listChatReads, listMessages, markChatRead, sendMessage } from "@/lib/api";
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
  const fetchReads = useCallback(() => listChatReads(token, groupId, chatRoomId), [token, groupId, chatRoomId]);
  const onMarkRead = useCallback(
    (lastReadMessageId: number) => markChatRead(token, groupId, chatRoomId, lastReadMessageId),
    [token, groupId, chatRoomId]
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
