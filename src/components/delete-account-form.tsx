"use client";

import { useState, type FormEvent } from "react";
import { ApiError, deleteAccount } from "@/lib/api";

// 회원 탈퇴 폼(설계 §5) — 성공 시 세션 정리는 부모(onDeleted)가 담당한다.
export function DeleteAccountForm({ token, onDeleted }: { token: string; onDeleted: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteAccount(token, password);
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
      {error && <p className="field-error">{error}</p>}
      <button className="btn btn-danger" type="submit" disabled={isSubmitting} style={{ alignSelf: "flex-start" }}>
        {isSubmitting ? "탈퇴하는 중..." : "탈퇴하기"}
      </button>
    </form>
  );
}
