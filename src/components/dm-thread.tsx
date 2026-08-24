"use client";

import { useCallback } from "react";
import { deleteDirectMessage, getUserIdFromToken, listDirectMessages, listDirectReads, markDirectRead, sendDirectMessage, type MessageAttachment } from "@/lib/api";
import { MessageThread } from "@/components/message-thread";

export function DirectMessageThread({
  token,
  chatRoomId,
  roomTitle,
  onStartCall,
  drawerOpen,
  onDrawerClose,
}: {
  token: string;
  chatRoomId: number;
  // 상대 이름(페이지가 listDirectRooms에서 조회) — 드로어 제목용. 없으면 메시지에서 파생한다.
  roomTitle?: string;
  onStartCall?: (video: boolean) => void;
  // 드로어 열림 상태는 페이지 헤더의 ☰ 버튼이 소유한다. fetchMembers 미전달 = DM 규칙.
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}) {
  const myUserId = getUserIdFromToken(token);

  const fetchMessages = useCallback(
    (page: number) => listDirectMessages(token, chatRoomId, page).then((fetched) => [...fetched].reverse()),
    [token, chatRoomId]
  );
  const onSend = useCallback(
    (text: string, attachment?: MessageAttachment) => sendDirectMessage(token, chatRoomId, text, attachment),
    [token, chatRoomId]
  );
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
      onStartCall={onStartCall}
      roomTitle={roomTitle}
      drawerOpen={drawerOpen}
      onDrawerClose={onDrawerClose}
    />
  );
}
