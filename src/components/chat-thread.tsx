"use client";

import { memo, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, deleteMessage, getUserIdFromToken, sendMessage, type ChatMessage } from "@/lib/api";
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

export function ChatThread({ token, groupId, chatRoomId }: { token: string; groupId: number; chatRoomId: number }) {
  const { messages, error, appendLocal, removeLocal } = useMessagePolling(token, groupId, chatRoomId);
  const myUserId = getUserIdFromToken(token);
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
      const created = await sendMessage(token, groupId, chatRoomId, text);
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
        await deleteMessage(token, groupId, chatRoomId, messageId);
        removeLocal(messageId);
      } catch (err) {
        setSendError(err instanceof ApiError ? err.message : "삭제에 실패했습니다");
      }
    },
    [token, groupId, chatRoomId, removeLocal]
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
