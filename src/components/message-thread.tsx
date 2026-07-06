"use client";

import { memo, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type ChatMessage } from "@/lib/api";
import { useChatSocket } from "@/hooks/use-chat-socket";
import type { ChatSocketEvent } from "@/lib/ws";

const MessageBubble = memo(function MessageBubble({
  message,
  isMine,
  onDelete,
}: {
  message: ChatMessage;
  isMine: boolean;
  onDelete: (id: number) => void;
}) {
  return (
    <div className={`bubble-row ${isMine ? "mine" : ""}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: isMine ? "flex-end" : "flex-start" }}>
        {!isMine && <span style={{ fontSize: "0.72rem", color: "var(--ink-faint)", marginLeft: 4 }}>{message.authorName}</span>}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
          {isMine && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              style={{ fontSize: "0.68rem", color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              삭제
            </button>
          )}
          <div className={`bubble ${isMine ? "mine" : "theirs"}`}>{message.text}</div>
        </div>
      </div>
    </div>
  );
});

// 입력 중 신호는 이 간격으로만 보내고(연타 방지), 받는 쪽은 마지막 신호 후 HIDE 시간이 지나면
// 표시를 지운다. 보내는 간격 < 지우는 시간이어야 계속 입력 중일 때 표시가 깜빡이지 않는다.
const TYPING_SEND_INTERVAL_MS = 2500;
const TYPING_HIDE_MS = 4000;

// 그룹 채팅(ChatThread)과 DM(DirectMessageThread)이 공유하는 렌더링 로직.
// 실시간 수신은 WebSocket/STOMP(useChatSocket)로 받고, REST는 쓰기(전송/삭제)와
// (재)연결 시 히스토리 재조회에만 쓴다 — 4초 폴링(useMessagePolling)은 제거됨.
// 방(chatRoomId)이 바뀔 때는 호출부에서 key={chatRoomId}로 리마운트해 상태를 초기화한다.
export interface MessageThreadProps {
  token: string;
  chatRoomId: number;
  myUserId: number | null;
  fetchMessages: () => Promise<ChatMessage[]>;
  onSend: (text: string) => Promise<ChatMessage>;
  onDelete: (messageId: number) => Promise<void>;
}

export function MessageThread({ token, chatRoomId, myUserId, fetchMessages, onSend, onDelete }: MessageThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [typists, setTypists] = useState<{ id: number; name: string }[]>([]);
  const typingTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const lastTypingSentRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchRef = useRef(fetchMessages);
  useEffect(() => {
    fetchRef.current = fetchMessages;
  });

  // (재)연결 성공 때마다 호출 — 초기 로드와 끊김 구간 복구가 같은 경로.
  const refresh = useCallback(async () => {
    try {
      const page = await fetchRef.current();
      setMessages(page);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "메시지를 불러오지 못했습니다");
    }
  }, []);

  // userId의 입력 중 표시를 켜고, 마지막 신호 후 TYPING_HIDE_MS가 지나면 자동으로 끈다.
  const noteTyping = useCallback((userId: number, userName: string) => {
    setTypists((prev) => (prev.some((t) => t.id === userId) ? prev : [...prev, { id: userId, name: userName }]));
    const timers = typingTimersRef.current;
    clearTimeout(timers.get(userId));
    timers.set(
      userId,
      setTimeout(() => {
        timers.delete(userId);
        setTypists((prev) => prev.filter((t) => t.id !== userId));
      }, TYPING_HIDE_MS)
    );
  }, []);

  const clearTypist = useCallback((userId: number) => {
    const timers = typingTimersRef.current;
    clearTimeout(timers.get(userId));
    timers.delete(userId);
    setTypists((prev) => (prev.some((t) => t.id === userId) ? prev.filter((t) => t.id !== userId) : prev));
  }, []);

  useEffect(() => {
    const timers = typingTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEvent = useCallback(
    (event: ChatSocketEvent) => {
      if (event.type === "TYPING") {
        // 내 신호도 토픽으로 되돌아오므로 걸러낸다.
        if (event.userId != null && event.userId !== myUserId && event.userName) {
          noteTyping(event.userId, event.userName);
        }
        return;
      }
      // 입력 중이던 사람의 메시지가 도착하면 표시를 바로 지운다(타이머 만료를 기다리지 않음).
      if (event.type === "MESSAGE_CREATED" && event.message) clearTypist(event.message.userId);
      setMessages((prev) => {
        if (!prev) return prev; // 초기 로드 전이면 곧 refresh 결과에 포함된다
        switch (event.type) {
          case "MESSAGE_CREATED": {
            const created = event.message;
            // 내가 보낸 메시지는 REST 응답으로 이미 추가돼 있을 수 있어 id로 dedupe.
            if (!created || prev.some((m) => m.id === created.id)) return prev;
            return [...prev, created];
          }
          case "MESSAGE_UPDATED": {
            const updated = event.message;
            if (!updated) return prev;
            return prev.map((m) => (m.id === updated.id ? updated : m));
          }
          case "MESSAGE_DELETED":
            return prev.filter((m) => m.id !== event.messageId);
          default:
            return prev;
        }
      });
    },
    [myUserId, noteTyping, clearTypist]
  );

  const { status: socketStatus, sendTyping } = useChatSocket(token, chatRoomId, refresh, handleEvent);

  function handleTextChange(value: string) {
    setText(value);
    const now = Date.now();
    if (value && now - lastTypingSentRef.current >= TYPING_SEND_INTERVAL_MS) {
      lastTypingSentRef.current = now;
      sendTyping();
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSendError(null);
    setIsSending(true);
    try {
      const created = await onSend(text);
      // WS 이벤트가 먼저 도착해 이미 목록에 있을 수 있다.
      setMessages((prev) => (prev ? (prev.some((m) => m.id === created.id) ? prev : [...prev, created]) : [created]));
      setText("");
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "메시지 전송에 실패했습니다");
    } finally {
      setIsSending(false);
    }
  }

  const handleDelete = useCallback(
    async (messageId: number) => {
      try {
        await onDelete(messageId);
        // WS DELETED 이벤트도 오지만 즉각 반영을 위해 로컬에서도 제거(멱등).
        setMessages((prev) => prev?.filter((m) => m.id !== messageId) ?? null);
      } catch (err) {
        setSendError(err instanceof ApiError ? err.message : "삭제에 실패했습니다");
      }
    },
    [onDelete]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {socketStatus === "error" && (
        <p className="field-error">실시간 연결이 거부되었습니다. 새로고침하거나 다시 로그인해주세요.</p>
      )}
      {socketStatus === "connecting" && messages !== null && (
        <p style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>실시간 연결 대기 중... 재연결되면 자동으로 이어집니다.</p>
      )}
      <div className="chat-thread" style={{ maxHeight: "60vh", overflowY: "auto", padding: "var(--sp-2)" }}>
        {messages === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
        {messages?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>아직 메시지가 없습니다.</p>}
        {messages?.map((m) => (
          <MessageBubble key={m.id} message={m} isMine={m.userId === myUserId} onDelete={handleDelete} />
        ))}
        <div ref={bottomRef} />
      </div>

      {typists.length > 0 && (
        <p style={{ fontSize: "0.78rem", color: "var(--ink-faint)", margin: 0 }}>
          {typists.map((t) => t.name).join(", ")}님이 입력 중...
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "var(--sp-2)" }}>
        <input
          type="text"
          required
          placeholder="메시지 보내기..."
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          style={{
            flex: 1,
            fontFamily: "var(--font-body)",
            fontSize: "0.95rem",
            padding: "var(--sp-3)",
            borderRadius: 10,
            border: "1px solid var(--stone-border)",
            background: "var(--linen)",
            color: "var(--ink)",
          }}
        />
        <button className="btn btn-primary" type="submit" disabled={isSending}>
          전송
        </button>
      </form>
      {sendError && <p className="field-error">{sendError}</p>}
    </div>
  );
}
