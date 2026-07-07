"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ApiError } from "@/lib/api";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container page page-form">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", marginBottom: "var(--sp-2)" }}>
        다시 만나서 반가워요
      </h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: "var(--sp-6)" }}>
        이메일과 비밀번호로 로그인하세요.
      </p>

      {justRegistered && (
        <div className="card" style={{ marginBottom: "var(--sp-5)", padding: "var(--sp-3) var(--sp-4)" }}>
          <span style={{ color: "var(--moss)", fontSize: "0.9rem" }}>가입이 완료됐습니다. 로그인해주세요.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "로그인하는 중..." : "로그인"}
        </button>
      </form>

      <p style={{ marginTop: "var(--sp-5)", fontSize: "0.9rem", color: "var(--ink-soft)" }}>
        아직 계정이 없나요? <Link href="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>가입하기</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
