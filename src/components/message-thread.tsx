"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, uploadChatFile, type ChatMessage, type Member, type MessageAttachment, type ReadPosition } from "@/lib/api";
import { prepareVideoForUpload } from "@/lib/attach-video";
import { ChatRoomDrawer } from "@/components/chat-room-drawer";
import { ComposerAttachmentMenu } from "@/components/composer-attachment-menu";
import { useChatSocket } from "@/hooks/use-chat-socket";
import type { ChatSocketEvent } from "@/lib/ws";

function isImageAttachment(attachment: MessageAttachment) {
  return attachment.contentType?.startsWith("image/") ?? false;
}

function isVideoAttachment(attachment: MessageAttachment) {
  return attachment.contentType?.startsWith("video/") ?? false;
}

function formatFileSize(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 첨부 표시 — 이미지/영상은 말풍선 없이 미디어만 노출(이미지는 클릭 시 원본 새 탭),
// 그 외 파일은 말풍선 안 다운로드 링크.
function AttachmentContent({ attachment }: { attachment: MessageAttachment }) {
  if (isVideoAttachment(attachment)) {
    return (
      <video
        src={attachment.url}
        controls
        preload="metadata"
        style={{ maxWidth: "min(300px, 100%)", maxHeight: 340, borderRadius: 14, display: "block" }}
      />
    );
  }
  if (isImageAttachment(attachment)) {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" style={{ display: "block", lineHeight: 0, maxWidth: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name ?? "첨부 이미지"}
          style={{ maxWidth: "min(280px, 100%)", maxHeight: 320, borderRadius: 14, objectFit: "cover" }}
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
  showAuthor,
  readCount,
  onDelete,
}: {
  message: ChatMessage;
  isMine: boolean;
  // 직전 메시지와 작성자가 다를 때만 true — 연속 메시지는 아바타/이름을 생략하고 자리만 비워 정렬을 맞춘다.
  showAuthor: boolean;
  // 나 말고 이 메시지까지 읽은 사람 수 — 내 메시지에만 의미 있음(그 외엔 0으로 옴).
  readCount: number;
  onDelete: (id: number) => void;
}) {
  // 이미지/영상 첨부는 말풍선 배경 없이 미디어 자체만 보여준다(텍스트가 있으면 아래 별도 말풍선).
  const isMediaAttachment =
    message.attachment != null && (isImageAttachment(message.attachment) || isVideoAttachment(message.attachment));

  const media = isMediaAttachment && message.attachment ? <AttachmentContent attachment={message.attachment} /> : null;
  const bubble =
    message.text || (message.attachment && !isMediaAttachment) ? (
      <div className={`bubble ${isMine ? "mine" : "theirs"}`}>
        {message.attachment && !isMediaAttachment && <AttachmentContent attachment={message.attachment} />}
        {message.text && (
          <div style={message.attachment && !isMediaAttachment ? { marginTop: 6 } : undefined}>{message.text}</div>
        )}
      </div>
    ) : null;

  return (
    <div className={`bubble-row ${isMine ? "mine" : ""}`} data-message-id={message.id}>
      {!isMine &&
        (showAuthor ? (
          message.authorProfileImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.authorProfileImg}
              alt=""
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--stone-border)" }}
            />
          ) : (
            <div className="avatar" style={{ width: 32, height: 32, fontSize: "0.78rem" }}>
              {message.authorName.slice(0, 1)}
            </div>
          )
        ) : (
          <span aria-hidden style={{ width: 32, flexShrink: 0 }} />
        ))}
      {/* 폭 제한(78%)은 행 전체 폭이 기준인 여기서 건다 — 말풍선 자체에 %를 걸면 조기 줄바꿈된다. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: isMine ? "flex-end" : "flex-start", maxWidth: "78%", minWidth: 0 }}>
        {!isMine && showAuthor && (
          <span style={{ fontSize: "0.72rem", color: "var(--ink-faint)", marginLeft: 4 }}>{message.authorName}</span>
        )}
        {/* 미디어와 글이 같이 온 메시지는 미디어를 윗줄에 따로 놓는다 — 한 행에 같이 두면
            행 너비가 미디어 폭이 되어 삭제·읽음이 말풍선에서 멀찍이 떨어진 채 붙는다. */}
        {media && bubble && <div style={{ maxWidth: "100%", marginBottom: 2 }}>{media}</div>}
        {/* 삭제·읽음은 메시지의 마지막 요소(글이 있으면 말풍선, 없으면 미디어) 옆·바닥에 붙는다. */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, maxWidth: "100%", minWidth: 0 }}>
          {isMine && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              style={{ fontSize: "0.68rem", color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              삭제
            </button>
          )}
          {/* "읽음 N"은 버블 옆·바닥 정렬(모바일 미러) — 버블 아래에 두면 내 메시지마다
              세로로 한 줄씩 벌어져 대화가 성기게 읽힌다. 버블에 가장 가까이 붙이고
              삭제는 바깥으로 밀어 둔다(읽음은 그 말풍선의 상태, 삭제는 그 말풍선에 대한 동작). */}
          {isMine && readCount > 0 && (
            <span style={{ fontSize: "0.66rem", color: "var(--accent)", whiteSpace: "nowrap", flexShrink: 0 }}>
              읽음{readCount > 1 ? ` ${readCount}` : ""}
            </span>
          )}
          {bubble ?? media}
        </div>
      </div>
    </div>
  );
});

// 입력 중 신호는 이 간격으로만 보내고(연타 방지), 받는 쪽은 마지막 신호 후 HIDE 시간이 지나면
// 표시를 지운다. 보내는 간격 < 지우는 시간이어야 계속 입력 중일 때 표시가 깜빡이지 않는다.
const TYPING_SEND_INTERVAL_MS = 2500;
const TYPING_HIDE_MS = 4000;

// 페이지당 메시지 수 — API 기본 size(50)와 같아야 "응답 < PAGE_SIZE = 소진" 판정이 맞는다(KMP PAGE_SIZE 미러).
const PAGE_SIZE = 50;

// 그룹 채팅(ChatThread)과 DM(DirectMessageThread)이 공유하는 렌더링 로직.
// 실시간 수신은 WebSocket/STOMP(useChatSocket)로 받고, REST는 쓰기(전송/삭제)와
// (재)연결 시 히스토리 재조회에만 쓴다 — 4초 폴링(useMessagePolling)은 제거됨.
// 방(chatRoomId)이 바뀔 때는 호출부에서 key={chatRoomId}로 리마운트해 상태를 초기화한다.
export interface MessageThreadProps {
  token: string;
  chatRoomId: number;
  myUserId: number | null;
  // page 0=최신 50개(호출부가 오래된 순으로 뒤집어 줌), page N=그보다 옛 블록.
  fetchMessages: (page: number) => Promise<ChatMessage[]>;
  fetchReads: () => Promise<ReadPosition[]>;
  onSend: (text: string, attachment?: MessageAttachment) => Promise<ChatMessage>;
  onDelete: (messageId: number) => Promise<void>;
  onMarkRead: (lastReadMessageId: number) => Promise<void>;
  // 첨부 패널의 보이스톡/페이스톡 — 통화 세션은 이 화면 위(GroupCallSession·DmCall)에 있고
  // 시작만 위임받는다. 없으면 패널에서 통화 항목이 빠진다.
  onStartCall?: (video: boolean) => void;
  // 우측 드로어용 — 방 이름(그룹=방 이름, DM=상대 이름)과 멤버 API(그룹만, 없으면 DM 규칙=메시지에서 상대 파생).
  // 햄버거 버튼과 열림 상태는 페이지 헤더가 소유하고(KMP 상단바 미러) 여기는 드로어만 렌더한다.
  roomTitle?: string;
  fetchMembers?: () => Promise<Member[]>;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}

export function MessageThread({ token, chatRoomId, myUserId, fetchMessages, fetchReads, onSend, onDelete, onMarkRead, onStartCall, roomTitle, fetchMembers, drawerOpen, onDrawerClose }: MessageThreadProps) {
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
  // 동영상 압축 진행 문구("압축 중 n%") — null이면 압축 중 아님, 압축 중엔 전송 비활성
  const [attachStatus, setAttachStatus] = useState<string | null>(null);
  // 첨부 패널의 "사진"과 "파일"은 같은 업로드 경로를 쓰지만 입력이 따로다 —
  // 사진은 accept로 걸러 이미지만 보이는 대화상자를 열어준다.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [typists, setTypists] = useState<{ id: number; name: string }[]>([]);
  // 나 말고 지금 이 방을 보고 있는 사람들(PRESENCE 전체 목록에서 나를 뺀 것). null이면 아직 미수신.
  const [viewers, setViewers] = useState<{ userId: number; userName: string }[] | null>(null);
  const typingTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const lastTypingSentRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const fetchRef = useRef(fetchMessages);
  const fetchReadsRef = useRef(fetchReads);
  const onMarkReadRef = useRef(onMarkRead);
  useEffect(() => {
    fetchRef.current = fetchMessages;
    fetchReadsRef.current = fetchReads;
    onMarkReadRef.current = onMarkRead;
  });

  // 이전 페이지 로드 상태(KMP ChatRoomViewModel.loadOlder 미러) — 렌더와 무관한 값은 ref로 둔다.
  // refresh·loadOlder(useCallback)가 캡처하므로 그보다 먼저 선언해야 한다(react-hooks/immutability).
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const oldestLoadedPageRef = useRef(0);
  const canLoadOlderRef = useRef(false);
  const isLoadingOlderRef = useRef(false);
  // 초기 바닥 정렬 후에만 상단 트리거 발화(KMP initialScrolled 미러) — 진입 직후 scrollTop 0 오발화 방지.
  const initialScrolledRef = useRef(false);
  // 위로 병합 직전에 기록한 스크롤 기준 — useLayoutEffect가 페인트 전에 제자리로 보정한다.
  const prependAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  // (재)연결 성공 때마다 호출 — 초기 로드와 끊김 구간 복구가 같은 경로. 페이지 0부터 다시라
  // 위로 로드해 둔 옛 페이지는 버리고 페이징 상태도 리셋한다(KMP loadLatest 미러).
  const refresh = useCallback(async () => {
    try {
      const [page, readList] = await Promise.all([fetchRef.current(0), fetchReadsRef.current()]);
      oldestLoadedPageRef.current = 0;
      canLoadOlderRef.current = page.length === PAGE_SIZE;
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

  // 고른 이모지는 입력창 끝에 덧붙는다(모바일 미러) — 패널은 열린 채로 두어 연달아 고를 수 있다.
  function appendEmoji(emoji: string) {
    handleTextChange(text + emoji);
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

  // 진입/새 메시지 스크롤은 그 시점의 높이 기준이라, width/height 예약이 없는 이미지(로드 전 0px)·
  // 영상(메타데이터 전 기본 높이)이 뒤늦게 로드되면 콘텐츠가 자라 바닥이 밀려난다 — 바닥에 붙어
  // 있는 동안(pinned)은 미디어 로드 때마다 다시 바닥으로 붙인다(KMP는 인덱스 스크롤이라 없는 문제).
  // 사용자가 위로 올리면 고정이 풀려 이력을 읽는 중엔 당겨지지 않는다.
  const pinnedRef = useRef(true);

  const loadOlder = useCallback(async () => {
    if (isLoadingOlderRef.current || !canLoadOlderRef.current) return;
    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);
    setOlderError(null);
    const page = oldestLoadedPageRef.current + 1;
    try {
      const fetched = await fetchRef.current(page);
      oldestLoadedPageRef.current = page;
      canLoadOlderRef.current = fetched.length === PAGE_SIZE;
      const el = threadRef.current;
      if (el) prependAnchorRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
      setMessages((prev) => {
        if (!prev) return fetched;
        // 로드 사이 새 메시지 유입으로 오프셋이 밀리면 중복이 올 수 있어 id로 거른다(KMP 미러).
        const knownIds = new Set(prev.map((m) => m.id));
        return [...fetched.filter((m) => !knownIds.has(m.id)), ...prev];
      });
    } catch (err) {
      setOlderError(err instanceof ApiError ? err.message : "이전 메시지를 불러오지 못했습니다.");
    } finally {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, []);

  // 위로 병합한 프레임에서 페인트 전에 스크롤을 제자리로 — KMP LazyColumn 키 앵커의 수동 미러.
  useLayoutEffect(() => {
    const anchor = prependAnchorRef.current;
    const el = threadRef.current;
    if (!anchor || !el) return;
    prependAnchorRef.current = null;
    el.scrollTop = anchor.scrollTop + (el.scrollHeight - anchor.scrollHeight);
  }, [messages]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const rePin = () => {
      if (pinnedRef.current) el.scrollTop = el.scrollHeight;
    };
    const onScroll = () => {
      pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      // 상단 근처 = 이전 페이지 로드(KMP first<3 미러) — 가드는 loadOlder 안에 있다.
      if (initialScrolledRef.current && el.scrollTop < 100) loadOlder();
    };
    el.addEventListener("scroll", onScroll);
    // load(이미지)·loadedmetadata(영상 크기 확정)·error(실패로 자리가 꺼질 때)는 버블링하지 않아 캡처로 받는다.
    el.addEventListener("load", rePin, true);
    el.addEventListener("loadedmetadata", rePin, true);
    el.addEventListener("error", rePin, true);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("load", rePin, true);
      el.removeEventListener("loadedmetadata", rePin, true);
      el.removeEventListener("error", rePin, true);
    };
  }, [loadOlder]);

  // 바닥 따라가기 — 길이가 아니라 최신 id 기준(KMP latestMessageId 미러): 위로 옛 페이지를
  // 병합해도 발화하지 않고, 중간 메시지 삭제로 끌려가지도 않는다.
  const latestMessageId = messages?.[messages.length - 1]?.id;

  useEffect(() => {
    if (latestMessageId === undefined) return; // 초기 로드 전이거나 빈 방
    initialScrolledRef.current = true;
    pinnedRef.current = true; // 진입·새 메시지 = 바닥 따라가기(기존 동작 유지)
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [latestMessageId]);

  function selectFile(file: File | undefined) {
    if (!file) return;
    // 동영상은 선택 시점에 5MB 목표 압축을 거친다(§4-b) — 업로드는 기존대로 전송 시점.
    if (file.type.startsWith("video/")) {
      selectVideo(file);
      return;
    }
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    });
    setPendingFile(file);
  }

  // 압축 중 다른 파일을 고르거나 첨부를 지우면 늦게 끝난 결과를 버린다(세대 카운터)
  const attachGenerationRef = useRef(0);

  async function selectVideo(file: File) {
    const generation = ++attachGenerationRef.current;
    setSendError(null);
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingFile(file); // 칩에 원본을 먼저 보여주고, 압축이 끝나면 압축본으로 바꾼다
    try {
      const prepared = await prepareVideoForUpload(file, (label) => {
        if (attachGenerationRef.current === generation) setAttachStatus(label);
      });
      if (attachGenerationRef.current !== generation) return;
      setPendingFile(prepared);
    } catch (err) {
      if (attachGenerationRef.current !== generation) return;
      setPendingFile(null);
      setSendError(err instanceof Error ? err.message : "동영상 압축에 실패했습니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      if (attachGenerationRef.current === generation) setAttachStatus(null);
    }
  }

  const clearPendingFile = useCallback(() => {
    attachGenerationRef.current++; // 진행 중 압축 결과가 있어도 버린다
    setAttachStatus(null);
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingFile(null);
    // 같은 파일을 다시 고를 수 있게 두 입력 모두 비운다(값이 같으면 change가 안 뜬다).
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
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
    if (attachStatus !== null) return; // 압축 완료 전 Enter 제출 방지(버튼 비활성의 백업)
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

  // 드로어 사진 클릭 → 해당 메시지로 스크롤(KMP animateScrollToItem 미러).
  const jumpToMessage = useCallback((messageId: number) => {
    // 점프 중 미디어가 로드되며 바닥 고정이 목적지를 빼앗지 않게 먼저 해제한다.
    pinnedRef.current = false;
    threadRef.current
      ?.querySelector(`[data-message-id="${messageId}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  // 드로어 제목 — 그룹은 방 이름, DM은 메시지에서 파생한 상대 이름(KMP DM 대화상대 규칙 미러).
  const drawerTitle = roomTitle ?? messages?.find((m) => m.userId !== myUserId)?.authorName ?? "1:1 대화";

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
      <div ref={threadRef} className="chat-thread" style={{ maxHeight: "60vh", overflowY: "auto", padding: "var(--sp-2)" }}>
        {isLoadingOlder && (
          <p style={{ fontSize: "0.78rem", color: "var(--ink-faint)", textAlign: "center", margin: 0 }}>
            이전 메시지 불러오는 중...
          </p>
        )}
        {olderError && !isLoadingOlder && (
          <p style={{ fontSize: "0.78rem", color: "var(--rust)", textAlign: "center", margin: 0 }}>{olderError}</p>
        )}
        {messages === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
        {messages?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>아직 메시지가 없습니다.</p>}
        {messages?.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            isMine={m.userId === myUserId}
            showAuthor={messages[i - 1]?.userId !== m.userId}
            readCount={m.userId === myUserId ? otherReadPositions.filter((pos) => pos >= m.id).length : 0}
            onDelete={handleDelete}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-composer">
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
              <span style={{ fontSize: "1.2rem" }}>{pendingFile.type.startsWith("video/") ? "🎬" : "📄"}</span>
            )}
            <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)", wordBreak: "break-all" }}>
              {pendingFile.name} <span style={{ color: "var(--ink-faint)" }}>({formatFileSize(pendingFile.size)})</span>
              {attachStatus && <span style={{ color: "var(--ink-faint)" }}> · {attachStatus}</span>}
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
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => selectFile(e.target.files?.[0])}
          />
          <ComposerAttachmentMenu
            disabled={isSending}
            onPickImage={() => imageInputRef.current?.click()}
            onPickFile={() => fileInputRef.current?.click()}
            onPickEmoji={appendEmoji}
            onStartCall={onStartCall}
          />
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
          {/* 압축이 끝나기 전에 보내면 원본이 그대로 나간다 — 완료까지 전송을 막는다(§4-b) */}
          <button className="btn btn-primary" type="submit" disabled={isSending || attachStatus !== null}>
            {isSending && pendingFile ? "업로드 중..." : "전송"}
          </button>
        </form>
        {sendError && <p className="field-error">{sendError}</p>}
      </div>

      <ChatRoomDrawer
        open={drawerOpen ?? false}
        onClose={() => onDrawerClose?.()}
        title={drawerTitle}
        isGroup={fetchMembers != null}
        myUserId={myUserId}
        messages={messages ?? []}
        fetchMembers={fetchMembers}
        onJumpToMessage={jumpToMessage}
        onStartCall={onStartCall}
      />
    </div>
  );
}
