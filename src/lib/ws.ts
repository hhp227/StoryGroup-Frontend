import type { ChatMessage } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

// 백엔드 ChatSocketEvent envelope와 1:1 대응.
// CREATED/UPDATED는 message, DELETED는 messageId, TYPING은 userId/userName만 채워진다.
export interface ChatSocketEvent {
  type: "MESSAGE_CREATED" | "MESSAGE_UPDATED" | "MESSAGE_DELETED" | "TYPING";
  chatRoomId: number;
  message: ChatMessage | null;
  messageId: number | null;
  userId: number | null;
  userName: string | null;
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
