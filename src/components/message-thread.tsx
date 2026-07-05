"use client";

import { memo, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, type ChatMessage } from "@/lib/api";
import { useMessagePolling } from "@/hooks/use-message-polling";

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

// 그룹 채팅(ChatThread)과 DM(DirectMessageThread)이 공유하는 렌더링/폴링 로직.
// 두 화면은 메시지 조회/전송/삭제가 향하는 엔드포인트만 다르고 나머지 동작은 동일해서,
// 호출부가 그 세 콜백만 자신의 엔드포인트에 바인딩해 넘기도록 뽑아냈다.
export interface MessageThreadProps {
  myUserId: number | null;
  fetchMessages: () => Promise<ChatMessage[]>;
  deps: unknown[];
  onSend: (text: string) => Promise<ChatMessage>;
  onDelete: (messageId: number) => Promise<void>;
}

export function MessageThread({ myUserId, fetchMessages, deps, onSend, onDelete }: MessageThreadProps) {
  const { messages, error, appendLocal, removeLocal } = useMessagePolling(fetchMessages, deps);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSendError(null);
    setIsSending(true);
    try {
      const created = await onSend(text);
      appendLocal(created);
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
        removeLocal(messageId);
      } catch (err) {
        setSendError(err instanceof ApiError ? err.message : "삭제에 실패했습니다");
      }
    },
    [onDelete, removeLocal]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {error && <p className="field-error">{error}</p>}
      <div className="chat-thread" style={{ maxHeight: "60vh", overflowY: "auto", padding: "var(--sp-2)" }}>
        {messages === null && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
        {messages?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>아직 메시지가 없습니다.</p>}
        {messages?.map((m) => (
          <MessageBubble key={m.id} message={m} isMine={m.userId === myUserId} onDelete={handleDelete} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "var(--sp-2)" }}>
        <input
          type="text"
          required
          placeholder="메시지 보내기..."
          value={text}
          onChange={(e) => setText(e.target.value)}
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
