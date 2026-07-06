import type { ChatMessage } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface PresenceUser {
  userId: number;
  userName: string;
}

// 백엔드 ChatSocketEvent envelope와 1:1 대응.
// CREATED/UPDATED는 message, DELETED는 messageId, TYPING은 userId/userName,
// PRESENCE는 users(증분이 아닌 전체 목록), READ는 userId+messageId(마지막 읽은 위치)가 채워진다.
export interface ChatSocketEvent {
  type: "MESSAGE_CREATED" | "MESSAGE_UPDATED" | "MESSAGE_DELETED" | "TYPING" | "PRESENCE" | "READ";
  chatRoomId: number;
  message: ChatMessage | null;
  messageId: number | null;
  userId: number | null;
  userName: string | null;
  users: PresenceUser[] | null;
}

export function wsUrl(): string {
  // https://... -> wss://..., http://localhost -> ws://localhost
  return `${API_BASE?.replace(/^http/, "ws")}/ws`;
}

export function chatRoomTopic(chatRoomId: number): string {
  return `/topic/chat-rooms/${chatRoomId}`;
}

// Typing 신호를 보내는 STOMP SEND destination(백엔드 TypingController).
export function typingDestination(chatRoomId: number): string {
  return `/app/chat-rooms/${chatRoomId}/typing`;
}
