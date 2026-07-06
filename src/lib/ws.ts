import type { AppNotification, ChatMessage } from "./api";

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

// 개인 알림 큐 — Spring이 세션별로 해석해 본인 알림만 전달된다.
export const NOTIFICATIONS_DESTINATION = "/user/queue/notifications";

// 백엔드 NotificationSocketEvent envelope와 1:1 대응.
export interface NotificationSocketEvent {
  type: "NOTIFICATION";
  notification: AppNotification;
}

// ---- WebRTC 시그널링 (Phase 7) ----
// 그룹 회의(meetings/{id})와 DM 통화(chat-rooms/{id})가 같은 destination 체계를 쓴다.

export type RtcRoomKind = "meetings" | "chat-rooms";

export interface RtcPeer {
  userId: number;
  userName: string;
}

// 통화방 토픽으로 오는 로스터 — 증분이 아니라 항상 전체 목록(자가 복구).
export interface RtcPeersEvent {
  type: "PEERS";
  roomKey: string;
  peers: RtcPeer[];
}

// 개인 큐(/user/queue/rtc)로 오는 표적 시그널. payload는 SDP/ICE JSON 문자열.
export interface RtcSignalEvent {
  type: "OFFER" | "ANSWER" | "ICE";
  roomKey: string;
  fromUserId: number;
  fromUserName: string;
  payload: string;
}

// DM 통화 벨울림 — 알림 큐(NOTIFICATIONS_DESTINATION)로 오며 type으로 구분된다(휘발성, DB 알림 아님).
export interface CallInviteEvent {
  type: "CALL_INVITE";
  chatRoomId: number;
  fromUserId: number;
  fromUserName: string;
}

// 알림 큐에 실려 오는 이벤트의 합집합 — 수신 훅이 type으로 분기한다.
export type NotificationQueueEvent = NotificationSocketEvent | CallInviteEvent;

export const RTC_QUEUE_DESTINATION = "/user/queue/rtc";

export function rtcRoomTopic(kind: RtcRoomKind, id: number): string {
  return `/topic/rtc/${kind}/${id}`;
}

export function rtcSignalDestination(kind: RtcRoomKind, id: number): string {
  return `/app/rtc/${kind}/${id}/signal`;
}

export function rtcInviteDestination(chatRoomId: number): string {
  return `/app/rtc/chat-rooms/${chatRoomId}/invite`;
}
