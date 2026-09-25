"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, deleteAccount, getMyProfile } from "@/lib/api";

// 서버 UserService.DELETE_CONFIRM_TEXT와 같은 값 — 비밀번호 없는(구글 전용) 계정의 본인 확인
const CONFIRM_TEXT = "탈퇴";

// 회원 탈퇴 폼(설계 §5) — 성공 시 세션 정리는 부모(onDeleted)가 담당한다.
export function DeleteAccountForm({ token, onDeleted }: { token: string; onDeleted: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  // 로드 전·실패 시엔 비밀번호 폼(기존 동작) — 구글 전용 계정만 확인 문구로 바뀐다
  const [hasPassword, setHasPassword] = useState(true);

  useEffect(() => {
    getMyProfile(token)
      .then((profile) => setHasPassword(profile.hasPassword))
      .catch(() => {});
  }, [token]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteAccount(token, hasPassword ? { password } : { confirmText });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "탈퇴를 처리하지 못했습니다");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <span style={{ fontWeight: 700 }}>회원 탈퇴</span>
      <ul style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: "1.2em", color: "var(--ink-soft)", fontSize: "0.9rem" }}>
        <li>탈퇴하면 계정을 되돌릴 수 없습니다.</li>
        <li>작성한 게시글, 댓글, 채팅 메시지는 삭제되지 않고 &quot;탈퇴한 사용자&quot;로 남습니다.</li>
        <li>같은 이메일로 다시 가입할 수 있습니다.</li>
      </ul>
      {hasPassword ? (
        <div className="field">
          <label htmlFor="delete-account-password">비밀번호</label>
          <input
            id="delete-account-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="delete-account-confirm">확인을 위해 &quot;{CONFIRM_TEXT}&quot;를 입력하세요</label>
          <input
            id="delete-account-confirm"
            type="text"
            required
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
      <button className="btn btn-danger" type="submit" disabled={isSubmitting || (!hasPassword && confirmText.trim() !== CONFIRM_TEXT)}
        style={{ alignSelf: "flex-start" }}>
        {isSubmitting ? "탈퇴하는 중..." : "탈퇴하기"}
      </button>
    </form>
  );
}
