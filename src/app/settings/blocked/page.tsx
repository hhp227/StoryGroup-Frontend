"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ApiError, listBlockedUsers, unblockUser, type BlockedUser } from "@/lib/api";

export default function BlockedUsersPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !accessToken) router.push("/login");
  }, [isReady, accessToken, router]);

  if (!isReady || !accessToken) return null;

  return (
    <div className="container page page-form" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div>
        <Link href="/settings" style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          ‹ 설정
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginTop: "var(--sp-2)" }}>
          차단 사용자 관리
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)", marginTop: 4 }}>
          차단한 사용자의 게시글·댓글·채팅이 내 화면에서 숨겨지고, 서로 DM을 보낼 수 없습니다.
        </p>
      </div>
      <BlockedUserList token={accessToken} />
    </div>
  );
}

function BlockedUserList({ token }: { token: string }) {
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<number | null>(null);

  useEffect(() => {
    listBlockedUsers(token)
      .then(setBlocked)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "차단 목록을 불러오지 못했습니다"));
  }, [token]);

  async function handleUnblock(user: BlockedUser) {
    setActionError(null);
    setBusyFor(user.userId);
    try {
      await unblockUser(token, user.userId);
      setBlocked((prev) => prev?.filter((u) => u.userId !== user.userId) ?? null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "차단 해제에 실패했습니다");
    } finally {
      setBusyFor(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {actionError && <p className="field-error">{actionError}</p>}
      {blocked === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {blocked?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>차단한 사용자가 없습니다.</p>}
      {blocked?.map((user) => (
        <div key={user.userId} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <div className="avatar">{user.name.slice(0, 1)}</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700 }}>{user.name}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
              {new Date(user.blockedAt).toLocaleDateString("ko-KR")} 차단
            </span>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => handleUnblock(user)}
            disabled={busyFor === user.userId}
          >
            차단 해제
          </button>
        </div>
      ))}
    </div>
  );
}
