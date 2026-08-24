"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError, blockUser, getOrCreateDirectRoom, reportUser } from "@/lib/api";

function MenuItem({ label, danger, disabled, onClick }: { label: string; danger?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "0.88rem",
        textAlign: "left",
        padding: "8px 12px",
        background: "none",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        color: danger ? "var(--rust)" : "var(--ink)",
      }}
    >
      {label}
    </button>
  );
}

// 작성자 아바타/이름을 누르면 뜨는 사용자 액션 메뉴(게시글 상세 등).
// 본인이면 프로필 보기/수정, 타인이면 프로필 보기/1:1 DM/신고/차단.
// children이 트리거(아바타+이름 노드)가 된다.
export function UserActionMenu({
  token,
  userId,
  userName,
  isSelf,
  onBlocked,
  onNotice,
  children,
}: {
  token: string;
  userId: number;
  userName: string;
  isSelf: boolean;
  // 차단 성공 직후 처리(예: 글이 숨겨지므로 그룹으로 이동). 없으면 알림만.
  onBlocked?: () => void;
  // isError=false는 완료 안내(신고 접수 등), true는 실패 메시지.
  onNotice: (message: string, isError: boolean) => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function handleDm() {
    setIsBusy(true);
    try {
      const room = await getOrCreateDirectRoom(token, userId);
      router.push(`/dm/${room.id}`);
    } catch (err) {
      onNotice(err instanceof ApiError ? err.message : "DM을 시작하지 못했습니다", true);
      setIsBusy(false);
      setOpen(false);
    }
  }

  async function handleReport() {
    if (!confirm(`${userName}님을 신고할까요?`)) return;
    setIsBusy(true);
    try {
      await reportUser(token, userId);
      onNotice("신고가 접수되었습니다", false);
    } catch (err) {
      onNotice(err instanceof ApiError ? err.message : "신고에 실패했습니다", true);
    } finally {
      setIsBusy(false);
      setOpen(false);
    }
  }

  async function handleBlock() {
    if (!confirm(`${userName}님을 차단할까요?\n차단하면 이 사용자의 게시글/댓글이 내 화면에서 숨겨지고 DM이 막힙니다.`)) return;
    setIsBusy(true);
    try {
      await blockUser(token, userId);
      onNotice(`${userName}님을 차단했습니다`, false);
      onBlocked?.();
    } catch (err) {
      onNotice(err instanceof ApiError ? err.message : "차단에 실패했습니다", true);
    } finally {
      setIsBusy(false);
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-3)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
          color: "inherit",
        }}
      >
        {children}
      </button>
      {open && (
        <>
          {/* 바깥 클릭으로 닫기 위한 투명 오버레이 */}
          <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div
            className="card"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 11,
              display: "flex",
              flexDirection: "column",
              minWidth: 150,
              padding: "var(--sp-2)",
              boxShadow: "0 4px 16px var(--shadow)",
            }}
          >
            <MenuItem label={isSelf ? "내 프로필 보기" : "프로필 보기"} disabled={isBusy} onClick={() => router.push(`/users/${userId}`)} />
            {isSelf ? (
              <MenuItem label="프로필 수정" disabled={isBusy} onClick={() => router.push("/settings/profile")} />
            ) : (
              <>
                <MenuItem label="1:1 DM" disabled={isBusy} onClick={handleDm} />
                <MenuItem label="사용자 신고" danger disabled={isBusy} onClick={handleReport} />
                <MenuItem label="사용자 차단" danger disabled={isBusy} onClick={handleBlock} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
