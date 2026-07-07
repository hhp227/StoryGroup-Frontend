"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "가입에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container page page-form">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", marginBottom: "var(--sp-2)" }}>
        같이할 사람들을 위한 자리
      </h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: "var(--sp-6)" }}>
        StoryGroup에 가입하고 그룹을 만들어보세요.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div className="field">
          <label htmlFor="name">이름</label>
          <input id="name" type="text" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "가입하는 중..." : "가입하기"}
        </button>
      </form>

      <p style={{ marginTop: "var(--sp-5)", fontSize: "0.9rem", color: "var(--ink-soft)" }}>
        이미 계정이 있나요? <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>로그인</Link>
      </p>
    </div>
  );
}
