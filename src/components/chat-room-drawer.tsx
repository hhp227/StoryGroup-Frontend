"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, type ChatMessage, type GroupRole, type Member } from "@/lib/api";
import { roleChipClass, roleLabel } from "@/lib/roles";

function SectionTitle({ title, countLabel }: { title: string; countLabel: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "var(--sp-3) var(--sp-4) var(--sp-1)" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink-soft)" }}>{title}</span>
      <span style={{ flex: 1 }} />
      {countLabel && <span style={{ fontSize: "0.72rem", color: "var(--ink-faint)" }}>{countLabel}</span>}
    </div>
  );
}

function MemberRow({
  name,
  profileImg,
  role,
  isMe,
  onClick,
}: {
  name: string;
  profileImg: string | null;
  // 역할 칩은 방장/부방장만 — 일반 멤버·DM 상대는 null로 와서 칩을 달지 않는다(KMP 미러).
  role: GroupRole | null;
  isMe: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "var(--sp-2) var(--sp-4)",
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        color: "var(--ink)",
      }}
    >
      {profileImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profileImg}
          alt=""
          style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--stone-border)" }}
        />
      ) : (
        <div className="avatar" style={{ width: 32, height: 32, fontSize: "0.78rem" }}>
          {name.slice(0, 1)}
        </div>
      )}
      <span style={{ fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      {isMe && <span style={{ fontSize: "0.72rem", color: "var(--ink-faint)", flexShrink: 0 }}>나</span>}
      {role && role !== "MEMBER" && (
        <span className={roleChipClass(role)} style={{ flexShrink: 0 }}>
          {roleLabel(role)}
        </span>
      )}
    </button>
  );
}

function CallButton({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "var(--sp-2) 0",
        background: "none",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>{emoji}</span>
      <span style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>{label}</span>
    </button>
  );
}

// 채팅방 우측 사이드 드로어(KMP ChatRoomDrawer 미러 — 대화상대 / 사진 / 통화).
// 채팅방 참여자 API가 없어 대화상대는 그룹 방=fetchMembers(그룹 멤버), DM=메시지에서 파생한 상대 1명이다.
// 사진도 서버 사진함 API가 없어 로드된 메시지 이력에서 파생한다(스크롤할수록 늘어난다).
export function ChatRoomDrawer({
  open,
  onClose,
  title,
  isGroup,
  myUserId,
  messages,
  fetchMembers,
  onJumpToMessage,
  onStartCall,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  isGroup: boolean;
  myUserId: number | null;
  // 오래된 순(MessageThread 상태 그대로) — 사진 파생 시 뒤에서부터 훑어 최신순으로 만든다.
  messages: ChatMessage[];
  fetchMembers?: () => Promise<Member[]>;
  onJumpToMessage: (messageId: number) => void;
  onStartCall?: (video: boolean) => void;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  // 열릴 때마다 갱신(KMP LoadMembers 미러) — 이전 데이터가 있으면 띄운 채 다시 불러온다.
  useEffect(() => {
    if (!open || !fetchMembers) return;
    let cancelled = false;
    fetchMembers()
      .then((list) => {
        if (cancelled) return;
        setMembers(list);
        setMemberError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setMemberError(err instanceof ApiError ? err.message : "대화상대를 불러오지 못했습니다");
      });
    return () => {
      cancelled = true;
    };
  }, [open, fetchMembers]);

  // ESC로 닫기 — 열려 있을 때만 등록(공용 Modal 관례).
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // 로드된 이력 안의 이미지 첨부 — 뒤(최신)에서부터 모아 최신순.
  const photos = useMemo(() => {
    const result: { messageId: number; url: string }[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const attachment = messages[i].attachment;
      if (attachment?.contentType?.startsWith("image/")) result.push({ messageId: messages[i].id, url: attachment.url });
    }
    return result;
  }, [messages]);

  // DM 방엔 참여자 API도 없다 — 상대는 내 것이 아닌 첫 메시지에서 집는다(KMP 미러).
  const dmPeer = useMemo(
    () => (isGroup ? null : (messages.find((m) => m.userId !== myUserId) ?? null)),
    [isGroup, messages, myUserId]
  );

  if (!open) return null;

  function openProfile(userId: number) {
    onClose();
    router.push(`/users/${userId}`);
  }

  // 대화상대 수 표기 — 그룹 방은 로드된 멤버 수, DM은 항상 2명(KMP drawerMemberCount 미러).
  const memberCountLabel = isGroup ? (members ? `${members.length}명` : null) : "2명";

  return (
    <>
      <div className="chat-drawer-scrim" onClick={onClose} />
      <aside className="chat-drawer" role="dialog" aria-modal="true" aria-label="채팅방 메뉴">
        {/* 헤더 — 방 이름과 방 종류 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            padding: "var(--sp-3) var(--sp-2) var(--sp-3) var(--sp-4)",
            background: "var(--linen)",
            borderBottom: "1px solid var(--stone-border)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>{isGroup ? "그룹 대화" : "1:1 대화"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", fontSize: "1rem", padding: "var(--sp-2)" }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--sp-2) 0 var(--sp-4)" }}>
          <SectionTitle title="대화상대" countLabel={memberCountLabel} />
          {isGroup ? (
            members === null && memberError !== null ? (
              <p style={{ fontSize: "0.8rem", color: "var(--rust)", padding: "var(--sp-2) var(--sp-4)" }}>{memberError}</p>
            ) : members === null ? (
              <p style={{ fontSize: "0.8rem", color: "var(--ink-faint)", padding: "var(--sp-2) var(--sp-4)" }}>불러오는 중...</p>
            ) : (
              members.map((member) => (
                <MemberRow
                  key={member.userId}
                  name={member.name}
                  profileImg={member.profileImg}
                  role={member.role}
                  isMe={member.userId === myUserId}
                  onClick={() => openProfile(member.userId)}
                />
              ))
            )
          ) : (
            dmPeer && (
              <MemberRow
                name={dmPeer.authorName}
                profileImg={dmPeer.authorProfileImg}
                role={null}
                isMe={false}
                onClick={() => openProfile(dmPeer.userId)}
              />
            )
          )}
          <hr style={{ border: "none", borderTop: "1px solid var(--stone-border)", margin: "var(--sp-3) 0 var(--sp-1)" }} />
          <SectionTitle title="사진" countLabel={photos.length > 0 ? `${photos.length}장` : null} />
          {photos.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--ink-faint)", padding: "var(--sp-2) var(--sp-4)" }}>
              주고받은 사진이 없습니다.
            </p>
          ) : (
            // 미리보기는 최신 9장 — 더 보려면 이력을 위로 더 불러오면 된다(KMP 미러).
            <div className="chat-drawer-photos" style={{ padding: "var(--sp-1) var(--sp-4) 0" }}>
              {photos.slice(0, 9).map((photo) => (
                <button
                  key={photo.messageId}
                  type="button"
                  onClick={() => {
                    onClose();
                    onJumpToMessage(photo.messageId);
                  }}
                  style={{ padding: 0, border: "none", background: "none", cursor: "pointer", lineHeight: 0 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="사진"
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, background: "var(--linen)" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        {/* 통화 — 입력창 첨부 패널과 같은 경로(onStartCall)를 드로어 하단에도 둔다(KMP 미러). */}
        {onStartCall && (
          <div style={{ display: "flex", gap: "var(--sp-2)", padding: "var(--sp-2)", borderTop: "1px solid var(--stone-border)" }}>
            <CallButton
              emoji="📞"
              label="보이스톡"
              onClick={() => {
                onClose();
                onStartCall(false);
              }}
            />
            <CallButton
              emoji="📹"
              label="페이스톡"
              onClick={() => {
                onClose();
                onStartCall(true);
              }}
            />
          </div>
        )}
      </aside>
    </>
  );
}
