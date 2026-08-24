"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useNotificationSocket } from "@/hooks/use-notification-socket";
import {
  ApiError,
  addFriend,
  getOrCreateDirectRoom,
  getUserIdFromToken,
  listFriends,
  removeFriend,
  search,
  type Friend,
  type SearchResults,
  type UserSearchResult,
} from "@/lib/api";

export default function SearchPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [friendBusyFor, setFriendBusyFor] = useState<number | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    listFriends(accessToken)
      .then(setFriends)
      .catch((err) => setFriendsError(err instanceof ApiError ? err.message : "친구 목록을 불러오지 못했습니다"));
  }, [accessToken]);

  // 친구 프레즌스 실시간 반영 — 해당 친구의 online만 패치. (재)연결 시엔 끊긴 사이 전환을
  // 놓쳤을 수 있어 스냅샷을 다시 읽는다(헤더 refetchUnread와 같은 복구 관용구).
  useNotificationSocket(
    accessToken,
    () => {
      if (accessToken) listFriends(accessToken).then(setFriends).catch(() => {});
    },
    (event) => {
      if (event.type !== "PRESENCE_CHANGED") return;
      setFriends((prev) => prev?.map((f) => (f.userId === event.userId ? { ...f, online: event.online } : f)) ?? prev);
    }
  );

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  const myUserId = getUserIdFromToken(accessToken);
  const friendIds = new Set((friends ?? []).map((f) => f.userId));

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

  async function handleMessage(userId: number) {
    if (!accessToken) return;
    setError(null);
    try {
      const room = await getOrCreateDirectRoom(accessToken, userId);
      router.push(`/dm/${room.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "DM을 시작하지 못했습니다");
    }
  }

  // 검색 결과에서 추가할 때는 상대 프로필을 이미 알고 있어 재조회 없이 목록에 반영한다(이름순 유지).
  async function handleAddFriend(user: UserSearchResult) {
    if (!accessToken) return;
    setError(null);
    setFriendBusyFor(user.id);
    try {
      await addFriend(accessToken, user.id);
      const added: Friend = {
        userId: user.id,
        name: user.name,
        profileImg: user.profileImg,
        statusMessage: user.statusMessage,
        friendedAt: new Date().toISOString(),
      };
      setFriends((prev) => [...(prev ?? []), added].sort((a, b) => a.name.localeCompare(b.name, "ko")));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "친구 등록에 실패했습니다");
    } finally {
      setFriendBusyFor(null);
    }
  }

  async function handleRemoveFriend(userId: number) {
    if (!accessToken) return;
    setError(null);
    setFriendBusyFor(userId);
    try {
      await removeFriend(accessToken, userId);
      setFriends((prev) => prev?.filter((f) => f.userId !== userId) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "친구 해제에 실패했습니다");
    } finally {
      setFriendBusyFor(null);
    }
  }

  const isEmpty =
    results !== null &&
    results.groups.length === 0 &&
    results.posts.length === 0 &&
    results.files.length === 0 &&
    results.messages.length === 0 &&
    results.users.length === 0;

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
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

      {/* 친구 섹션: 검색 전 기본 화면. 검색하면 결과가 이 자리를 대신한다(카카오톡 친구 탭 패턴). */}
      {results === null && (
        <ResultSection title="친구">
          {friendsError && <p className="field-error">{friendsError}</p>}
          {friends === null && !friendsError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
          {friends?.length === 0 && (
            <p style={{ color: "var(--ink-faint)", fontSize: "0.9rem" }}>
              아직 친구가 없습니다. 사용자를 검색해서 친구로 등록해보세요.
            </p>
          )}
          {friends?.map((friend) => (
            <div key={friend.userId} className="card" style={{ padding: "var(--sp-4)", display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div className="avatar sm">{friend.name.slice(0, 1)}</div>
                {friend.online && (
                  <span
                    style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderRadius: "50%", background: "#34c759", border: "2px solid var(--linen)" }}
                  />
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{friend.name}</span>
                {friend.statusMessage && (
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>{friend.statusMessage}</span>
                )}
              </div>
              <button className="btn btn-secondary" type="button" onClick={() => handleMessage(friend.userId)}>
                메시지
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => handleRemoveFriend(friend.userId)}
                disabled={friendBusyFor === friend.userId}
              >
                해제
              </button>
            </div>
          ))}
        </ResultSection>
      )}

      {results && results.users.length > 0 && (
        <ResultSection title="사용자">
          {results.users.map((u) => (
            <div key={u.id} className="card" style={{ padding: "var(--sp-4)", display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
              <div className="avatar sm">{u.name.slice(0, 1)}</div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{u.name}</span>
                {u.statusMessage && (
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>{u.statusMessage}</span>
                )}
              </div>
              {u.id !== myUserId && (
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => (friendIds.has(u.id) ? handleRemoveFriend(u.id) : handleAddFriend(u))}
                  disabled={friendBusyFor === u.id}
                >
                  {friendIds.has(u.id) ? "친구 해제" : "친구 추가"}
                </button>
              )}
              <button className="btn btn-secondary" type="button" onClick={() => handleMessage(u.id)}>
                메시지
              </button>
            </div>
          ))}
        </ResultSection>
      )}

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
