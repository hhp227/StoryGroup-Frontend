"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, listDirectRooms, listMyGroupChatRooms, type DirectRoom, type GroupChatRoom } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format-time";
import { useNotificationSocket } from "@/hooks/use-notification-socket";
import type { NotificationQueueEvent } from "@/lib/ws";

// 미리보기 라벨 — 첨부 전용 메시지(text 빈 문자열)는 종류로 표기(KMP ChatScreen.messagePreview 미러).
function messagePreview(room: {
  lastMessageText?: string | null;
  lastMessageType?: string | null;
  lastMessageAt?: string | null;
}): string {
  if (!room.lastMessageAt) return "아직 메시지가 없습니다";
  if (room.lastMessageText) return room.lastMessageText;
  if (room.lastMessageType?.startsWith("image/")) return "사진";
  return "파일";
}

// 섹션 안 최근 활동순(카카오톡 관례) — 같은 서버가 같은 오프셋으로 주는 ISO-8601이라 문자열 내림차순=최신순(KMP 미러).
function byRecentActivity<T extends { createdAt: string; lastMessageAt?: string | null }>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
}

/** 미읽음 수 뱃지 — 0이면 그리지 않고, 99 초과는 "99+"(KMP SgUnreadBadge 미러) */
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="chat-hub-unread">{count > 99 ? "99+" : count}</span>;
}

/** 채팅방 한 줄 — 카카오톡식(아바타 + 제목·마지막 메시지 2줄 + 우측 시각·미읽음), 카드 없음(KMP ChatRoomRow 미러) */
function ChatRoomRow({
  href,
  title,
  roomName,
  imageUrl,
  isGroup,
  unreadCount,
  preview,
  lastMessageAt,
}: {
  href: string;
  title: string;
  roomName: string | null;
  imageUrl: string | null;
  isGroup: boolean;
  unreadCount: number;
  preview: string;
  lastMessageAt: string | null;
}) {
  return (
    <Link href={href} className="chat-hub-row">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="chat-hub-avatar" />
      ) : (
        <div className={`chat-hub-avatar ${isGroup ? "group" : "dm"}`}>{title.slice(0, 1)}</div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </span>
          {roomName && (
            <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)", whiteSpace: "nowrap", flexShrink: 0 }}>{roomName}</span>
          )}
        </div>
        <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {preview}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        {lastMessageAt && <span style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>{formatRelativeTime(lastMessageAt)}</span>}
        <UnreadBadge count={unreadCount} />
      </div>
    </Link>
  );
}

// 채팅 허브 목록 — KMP ChatViewModel 미러: 그룹 채팅방+DM 병렬 조회, 방별 미읽음은 서버 집계
// (unreadCount) 스냅숏을 받고 개인 큐(STOMP) CHAT_MESSAGE로 실시간 증가·미리보기 갱신·재정렬한다.
// 방 진입은 페이지 이동이라 KMP의 RoomOpened/activeRoomId는 불필요 — 돌아오면 재마운트 재조회.
export function ChatHubList({ token }: { token: string }) {
  const [rooms, setRooms] = useState<{ group: GroupChatRoom[]; direct: DirectRoom[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 실시간 이벤트가 "목록에 있는 방인지"를 최신 상태로 판정하기 위한 미러(setState 업데이터 안 부작용 회피).
  const roomsRef = useRef(rooms);
  useEffect(() => {
    roomsRef.current = rooms;
  });
  // 첫 연결은 초기 로드와 겹친다 — 재연결부터만 공백 복구 재조회(KMP hasConnectedOnce 미러).
  const hasConnectedOnceRef = useRef(false);

  // setState는 전부 프라미스 콜백 안에서만 — react-hooks/set-state-in-effect(error)가 effect 경유
  // 호출까지 분석하므로 async/await 대신 .then 체인으로 쓴다(group-member-strip 관례).
  const load = useCallback(() => {
    Promise.all([listMyGroupChatRooms(token), listDirectRooms(token)])
      .then(([group, direct]) => {
        setRooms({ group: byRecentActivity(group), direct: byRecentActivity(direct) });
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "채팅방을 불러오지 못했습니다."));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConnect = useCallback(() => {
    if (hasConnectedOnceRef.current) load();
    hasConnectedOnceRef.current = true;
  }, [load]);

  // 개인 큐 실시간 — 목록에 있는 방이면 미읽음 +1·미리보기 갱신·재정렬, 모르는 방(새 DM 등)이면 재조회(KMP 미러).
  const handleEvent = useCallback(
    (event: NotificationQueueEvent) => {
      if (event.type !== "CHAT_MESSAGE") return;
      const badge = event; // 좁혀진 타입을 const로 고정 — 클로저 안에서는 유니온 좁힘이 풀린다
      const current = roomsRef.current;
      if (!current) return; // 초기 로드 전 — 곧 load 결과에 반영된다
      const known =
        current.group.some((room) => room.id === badge.chatRoomId) ||
        current.direct.some((room) => room.id === badge.chatRoomId);
      if (!known) {
        load();
        return;
      }
      // 구서버 이벤트(미리보기 필드 없음)면 미읽음만 올린다 — createdAt 유무로 판별(KMP 미러).
      const hasPreview = badge.createdAt != null;
      function bump<T extends GroupChatRoom | DirectRoom>(list: T[]): T[] {
        return byRecentActivity(
          list.map((room) =>
            room.id !== badge.chatRoomId
              ? room
              : {
                  ...room,
                  unreadCount: (room.unreadCount ?? 0) + 1,
                  lastMessageText: hasPreview ? (badge.text ?? "") : room.lastMessageText,
                  lastMessageType: hasPreview ? (badge.attachmentType ?? null) : room.lastMessageType,
                  lastMessageAt: hasPreview ? badge.createdAt : room.lastMessageAt,
                }
          )
        );
      }
      setRooms((prev) => (prev ? { group: bump(prev.group), direct: bump(prev.direct) } : prev));
    },
    [load]
  );

  useNotificationSocket(token, handleConnect, handleEvent);

  if (rooms === null && loadError !== null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-2)", padding: "var(--sp-6) 0" }}>
        <p style={{ color: "var(--rust)", fontSize: "0.9rem" }}>{loadError}</p>
        <button className="btn btn-ghost" type="button" onClick={load}>
          다시 시도
        </button>
      </div>
    );
  }
  if (rooms === null) return <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>;
  if (rooms.group.length === 0 && rooms.direct.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-1)", padding: "var(--sp-6) 0" }}>
        <p style={{ fontWeight: 700 }}>채팅방이 없습니다</p>
        <p style={{ fontSize: "0.85rem", color: "var(--ink-faint)" }}>그룹에 가입하거나 친구에게 메시지를 보내보세요.</p>
      </div>
    );
  }
  return (
    <div className="chat-hub-list">
      {rooms.group.length > 0 && (
        <>
          <span className="chat-hub-section">그룹 채팅</span>
          {rooms.group.map((room) => (
            <ChatRoomRow
              key={`group-${room.id}`}
              href={`/groups/${room.groupId}/chat?room=${room.id}`}
              title={room.groupName}
              roomName={room.name}
              imageUrl={null}
              isGroup
              unreadCount={room.unreadCount ?? 0}
              preview={messagePreview(room)}
              lastMessageAt={room.lastMessageAt ?? null}
            />
          ))}
        </>
      )}
      {rooms.direct.length > 0 && (
        <>
          <span className="chat-hub-section">다이렉트 메시지</span>
          {rooms.direct.map((room) => (
            <ChatRoomRow
              key={`dm-${room.id}`}
              href={`/dm/${room.id}`}
              title={room.otherUserName}
              roomName={null}
              imageUrl={room.otherUserProfileImg}
              isGroup={false}
              unreadCount={room.unreadCount ?? 0}
              preview={messagePreview(room)}
              lastMessageAt={room.lastMessageAt ?? null}
            />
          ))}
        </>
      )}
    </div>
  );
}
