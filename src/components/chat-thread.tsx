"use client";

import { useCallback } from "react";
import { deleteMessage, getUserIdFromToken, listChatReads, listMembers, listMessages, markChatRead, sendMessage, type MessageAttachment } from "@/lib/api";
import { MessageThread } from "@/components/message-thread";

export function ChatThread({
  token,
  groupId,
  chatRoomId,
  roomName,
  onStartCall,
  drawerOpen,
  onDrawerClose,
}: {
  token: string;
  groupId: number;
  chatRoomId: number;
  roomName?: string;
  onStartCall?: (video: boolean) => void;
  // 드로어 열림 상태는 페이지 헤더의 ☰ 버튼이 소유한다.
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}) {
  const myUserId = getUserIdFromToken(token);

  const fetchMessages = useCallback(
    (page: number) => listMessages(token, groupId, chatRoomId, page).then((fetched) => [...fetched].reverse()),
    [token, groupId, chatRoomId]
  );
  const onSend = useCallback(
    (text: string, attachment?: MessageAttachment) => sendMessage(token, groupId, chatRoomId, text, attachment),
    [token, groupId, chatRoomId]
  );
  const onDelete = useCallback(
    (messageId: number) => deleteMessage(token, groupId, chatRoomId, messageId),
    [token, groupId, chatRoomId]
  );
  const fetchReads = useCallback(() => listChatReads(token, groupId, chatRoomId), [token, groupId, chatRoomId]);
  // 드로어 대화상대 — 채팅방 참여자 API가 없어 그룹 멤버 목록을 쓴다(KMP 미러).
  const fetchMembers = useCallback(() => listMembers(token, groupId), [token, groupId]);
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
      onStartCall={onStartCall}
      roomTitle={roomName}
      fetchMembers={fetchMembers}
      drawerOpen={drawerOpen}
      onDrawerClose={onDrawerClose}
    />
  );
}
