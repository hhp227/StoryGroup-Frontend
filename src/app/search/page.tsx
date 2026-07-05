"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ApiError, search, type SearchResults } from "@/lib/api";

export default function SearchPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    setIsSearching(true);
    try {
      setResults(await search(accessToken, query));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "검색에 실패했습니다");
    } finally {
      setIsSearching(false);
    }
  }

  const isEmpty =
    results !== null &&
    results.groups.length === 0 &&
    results.posts.length === 0 &&
    results.files.length === 0 &&
    results.messages.length === 0;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>검색</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "var(--sp-2)" }}>
        <input
          type="search"
          required
          placeholder="그룹, 게시글, 파일, 메시지 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
        <button className="btn btn-primary" type="submit" disabled={isSearching}>
          {isSearching ? "검색 중..." : "검색"}
        </button>
      </form>

      {error && <p className="field-error">{error}</p>}
      {isEmpty && <p style={{ color: "var(--ink-faint)" }}>검색 결과가 없습니다.</p>}

      {results && results.groups.length > 0 && (
        <ResultSection title="그룹">
          {results.groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <div className="card" style={{ padding: "var(--sp-4)", cursor: "pointer" }}>
                <span style={{ fontWeight: 700 }}>{g.name}</span>
                {g.description && (
                  <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)", display: "block" }}>{g.description}</span>
                )}
              </div>
            </Link>
          ))}
        </ResultSection>
      )}

      {results && results.posts.length > 0 && (
        <ResultSection title="게시글">
          {results.posts.map((p) => (
            <Link key={p.id} href={`/groups/${p.groupId}/posts/${p.id}`}>
              <div className="card" style={{ padding: "var(--sp-4)", cursor: "pointer" }}>
                <p style={{ margin: 0, fontSize: "0.92rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {p.text}
                </p>
                <ResultMeta>
                  {p.groupName} · {p.authorName} · {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                </ResultMeta>
              </div>
            </Link>
          ))}
        </ResultSection>
      )}

      {results && results.files.length > 0 && (
        <ResultSection title="파일">
          {results.files.map((f) => (
            <Link key={f.id} href={`/groups/${f.groupId}/files`}>
              <div className="card" style={{ padding: "var(--sp-4)", cursor: "pointer" }}>
                <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{f.name}</span>
                <ResultMeta>
                  {f.groupName} · {new Date(f.createdAt).toLocaleDateString("ko-KR")}
                </ResultMeta>
              </div>
            </Link>
          ))}
        </ResultSection>
      )}

      {results && results.messages.length > 0 && (
        <ResultSection title="메시지">
          {results.messages.map((m) => (
            <Link key={m.id} href={m.groupId !== null ? `/groups/${m.groupId}/chat` : `/dm/${m.chatRoomId}`}>
              <div className="card" style={{ padding: "var(--sp-4)", cursor: "pointer" }}>
                <p style={{ margin: 0, fontSize: "0.92rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {m.text}
                </p>
                <ResultMeta>
                  {m.groupName ?? "DM"} · {m.authorName} · {new Date(m.createdAt).toLocaleDateString("ko-KR")}
                </ResultMeta>
              </div>
            </Link>
          ))}
        </ResultSection>
      )}
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <h2 style={{ fontSize: "0.95rem", color: "var(--ink-soft)", margin: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

function ResultMeta({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)", display: "block", marginTop: 4 }}>{children}</span>;
}
