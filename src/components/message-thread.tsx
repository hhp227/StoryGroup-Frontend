"use client";

import { memo, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, uploadChatFile, type ChatMessage, type MessageAttachment, type ReadPosition } from "@/lib/api";
import { useChatSocket } from "@/hooks/use-chat-socket";
import type { ChatSocketEvent } from "@/lib/ws";

function isImageAttachment(attachment: MessageAttachment) {
  return attachment.contentType?.startsWith("image/") ?? false;
}

function formatFileSize(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 말풍선 안 첨부 표시 — 이미지는 인라인(클릭 시 원본 새 탭), 그 외 파일은 다운로드 링크.
function AttachmentContent({ attachment }: { attachment: MessageAttachment }) {
  if (isImageAttachment(attachment)) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" style={{ display: "block", lineHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name ?? "첨부 이미지"}
          style={{ maxWidth: 220, maxHeight: 260, borderRadius: 10, objectFit: "cover" }}
        />
      </a>
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      download={attachment.name ?? undefined}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "underline", color: "inherit", wordBreak: "break-all" }}
    >
      📄 {attachment.name ?? "파일"}
      {attachment.size != null && (
        <span style={{ fontSize: "0.72rem", opacity: 0.75 }}>({formatFileSize(attachment.size)})</span>
      )}
    </a>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  isMine,
  readCount,
  onDelete,
}: {
  message: ChatMessage;
  isMine: boolean;
  // 나 말고 이 메시지까지 읽은 사람 수 — 내 메시지에만 의미 있음(그 외엔 0으로 옴).
  readCount: number;
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
          <div className={`bubble ${isMine ? "mine" : "theirs"}`}>
            {message.attachment && <AttachmentContent attachment={message.attachment} />}
            {message.text && (
              <div style={message.attachment ? { marginTop: 6 } : undefined}>{message.text}</div>
            )}
          </div>
        </div>
        {isMine && readCount > 0 && (
          <span style={{ fontSize: "0.66rem", color: "var(--accent)", marginRight: 2 }}>
            읽음{readCount > 1 ? ` ${readCount}` : ""}
          </span>
        )}
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
  fetchReads: () => Promise<ReadPosition[]>;
  onSend: (text: string, attachment?: MessageAttachment) => Promise<ChatMessage>;
  onDelete: (messageId: number) => Promise<void>;
  onMarkRead: (lastReadMessageId: number) => Promise<void>;
}

export function MessageThread({ token, chatRoomId, myUserId, fetchMessages, fetchReads, onSend, onDelete, onMarkRead }: MessageThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  // userId -> 그 사람이 마지막으로 읽은 메시지 id.
  const [reads, setReads] = useState<Record<number, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  // 전송 대기 중인 첨부 파일 — 업로드는 고르는 시점이 아니라 전송 시점에 한다
  // (보내기 전에 마음을 바꾸면 스토리지에 고아 객체가 남지 않도록).
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [typists, setTypists] = useState<{ id: number; name: string }[]>([]);
  // 나 말고 지금 이 방을 보고 있는 사람들(PRESENCE 전체 목록에서 나를 뺀 것). null이면 아직 미수신.
  const [viewers, setViewers] = useState<{ userId: number; userName: string }[] | null>(null);
  const typingTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const lastTypingSentRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchRef = useRef(fetchMessages);
  const fetchReadsRef = useRef(fetchReads);
  const onMarkReadRef = useRef(onMarkRead);
  useEffect(() => {
    fetchRef.current = fetchMessages;
    fetchReadsRef.current = fetchReads;
    onMarkReadRef.current = onMarkRead;
  });

  // (재)연결 성공 때마다 호출 — 초기 로드와 끊김 구간 복구가 같은 경로.
  const refresh = useCallback(async () => {
    try {
      const [page, readList] = await Promise.all([fetchRef.current(), fetchReadsRef.current()]);
      setMessages(page);
      setReads(Object.fromEntries(readList.map((r) => [r.userId, r.lastReadMessageId])));
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
      if (event.type === "PRESENCE") {
        setViewers((event.users ?? []).filter((u) => u.userId !== myUserId));
        return;
      }
      if (event.type === "READ") {
        const { userId, messageId } = event;
        if (userId == null || messageId == null) return;
        // 백엔드가 단조 증가를 보장하지만, 이벤트 도착 순서가 섞일 수 있어 여기서도 max로만 갱신.
        setReads((prev) => ((prev[userId] ?? 0) >= messageId ? prev : { ...prev, [userId]: messageId }));
        return;
      }
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

  // 탭이 보이는 상태에서 최신 메시지가 갱신되면 읽음 위치를 서버에 보고한다.
  const latestMessageIdRef = useRef(0);
  const lastReportedReadRef = useRef(0);

  const reportRead = useCallback(() => {
    const id = latestMessageIdRef.current;
    if (!id || document.visibilityState !== "visible" || id <= lastReportedReadRef.current) return;
    lastReportedReadRef.current = id;
    onMarkReadRef.current(id).catch(() => {
      // 실패하면 마커를 되돌려 다음 기회(새 메시지 도착/탭 복귀)에 재시도.
      lastReportedReadRef.current = 0;
    });
  }, []);

  useEffect(() => {
    const last = messages?.[messages.length - 1];
    latestMessageIdRef.current = last?.id ?? 0;
    reportRead();
  }, [messages, reportRead]);

  // 백그라운드 탭에서 받은 메시지는 읽음 처리하지 않다가, 탭으로 돌아왔을 때 보고한다.
  useEffect(() => {
    document.addEventListener("visibilitychange", reportRead);
    return () => document.removeEventListener("visibilitychange", reportRead);
  }, [reportRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  function selectFile(file: File | undefined) {
    if (!file) return;
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    });
    setPendingFile(file);
  }

  const clearPendingFile = useCallback(() => {
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // 방 이동 등으로 언마운트되면 미리보기 object URL을 정리한다.
  useEffect(() => () => {
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && !pendingFile) return;
    setSendError(null);
    setIsSending(true);
    try {
      // 첨부는 전송 시점에 업로드 — 실패하면 파일을 유지한 채 에러만 보여 재시도할 수 있다.
      const attachment = pendingFile ? await uploadChatFile(token, pendingFile) : undefined;
      const created = await onSend(text, attachment);
      // WS 이벤트가 먼저 도착해 이미 목록에 있을 수 있다.
      setMessages((prev) => (prev ? (prev.some((m) => m.id === created.id) ? prev : [...prev, created]) : [created]));
      setText("");
      clearPendingFile();
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

  // 내가 아닌 사람들의 읽음 위치 — 내 메시지 옆 "읽음 n" 계산에 쓴다.
  const otherReadPositions = Object.entries(reads)
    .filter(([uid]) => Number(uid) !== myUserId)
    .map(([, pos]) => pos);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {socketStatus === "error" && (
        <p className="field-error">실시간 연결이 거부되었습니다. 새로고침하거나 다시 로그인해주세요.</p>
      )}
      {socketStatus === "connecting" && messages !== null && (
        <p style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>실시간 연결 대기 중... 재연결되면 자동으로 이어집니다.</p>
      )}
      {viewers !== null && viewers.length > 0 && (
        <p style={{ fontSize: "0.78rem", color: "var(--ink-faint)", margin: 0 }}>
          {viewers.map((v) => v.userName).join(", ")}님이 지금 이 방을 보고 있어요
        </p>
      )}
      <div className="chat-thread" style={{ maxHeight: "60vh", overflowY: "auto", padding: "var(--sp-2)" }}>
        {messages === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
        {messages?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>아직 메시지가 없습니다.</p>}
        {messages?.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isMine={m.userId === myUserId}
            readCount={m.userId === myUserId ? otherReadPositions.filter((pos) => pos >= m.id).length : 0}
            onDelete={handleDelete}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {typists.length > 0 && (
        <p style={{ fontSize: "0.78rem", color: "var(--ink-faint)", margin: 0 }}>
          {typists.map((t) => t.name).join(", ")}님이 입력 중...
        </p>
      )}

      {pendingFile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            padding: "var(--sp-2)",
            borderRadius: 10,
            border: "1px solid var(--stone-border)",
            background: "var(--linen)",
            alignSelf: "flex-start",
          }}
        >
          {pendingPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pendingPreviewUrl}
              alt=""
              style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }}
            />
          ) : (
            <span style={{ fontSize: "1.2rem" }}>📄</span>
          )}
          <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)", wordBreak: "break-all" }}>
            {pendingFile.name} <span style={{ color: "var(--ink-faint)" }}>({formatFileSize(pendingFile.size)})</span>
          </span>
          <button
            type="button"
            onClick={clearPendingFile}
            disabled={isSending}
            aria-label="첨부 취소"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: "0.9rem", padding: 2 }}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "var(--sp-2)" }}>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => selectFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          aria-label="파일 첨부"
          title="파일 첨부"
          style={{ padding: "0 var(--sp-3)" }}
        >
          📎
        </button>
        <input
          type="text"
          required={!pendingFile}
          placeholder={pendingFile ? "메시지 (선택)..." : "메시지 보내기..."}
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
          {isSending && pendingFile ? "업로드 중..." : "전송"}
        </button>
      </form>
      {sendError && <p className="field-error">{sendError}</p>}
    </div>
  );
}
