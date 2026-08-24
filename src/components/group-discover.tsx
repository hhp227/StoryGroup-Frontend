"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  cancelJoinRequest,
  discoverGroups,
  joinGroup,
  joinGroupByCode,
  type DiscoverGroup,
} from "@/lib/api";
import { DiscoverGroupCard } from "@/components/discover-group-card";
import { GroupCover } from "@/components/group-cover";
import { Modal } from "@/components/modal";

const PAGE_SIZE = 20;

// "그룹 찾기" 탭 - 라운지를 뺀 모든 그룹을 노출한다(레거시 동작 복원).
// 카드를 클릭하면 상세 다이얼로그가 열리고, 가입/신청은 그 안에서 이루어진다.
export function GroupDiscover({ token }: { token: string }) {
  const [groups, setGroups] = useState<DiscoverGroup[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DiscoverGroup | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const load = useCallback(
    async (q: string, p: number, append: boolean) => {
      setLoadError(null);
      try {
        const fetched = await discoverGroups(token, q, p, PAGE_SIZE);
        setGroups((prev) => (append && prev ? [...prev, ...fetched] : fetched));
        setPage(p);
        setHasMore(fetched.length === PAGE_SIZE);
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : "그룹 목록을 불러오지 못했습니다");
      }
    },
    [token],
  );

  useEffect(() => {
    load("", 0, false);
  }, [load]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setActiveQuery(q);
    setGroups(null);
    await load(q, 0, false);
  }

  async function handleLoadMore() {
    setIsLoadingMore(true);
    await load(activeQuery, page + 1, true);
    setIsLoadingMore(false);
  }

  // 다이얼로그에서 신청/취소하면 목록 카드의 상태(칩)도 같이 갱신한다.
  function updateMembership(groupId: number, membership: DiscoverGroup["membership"]) {
    setGroups((prev) => prev?.map((g) => (g.id === groupId ? { ...g, membership } : g)) ?? null);
    setSelected((prev) => (prev && prev.id === groupId ? { ...prev, membership } : prev));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", flexWrap: "wrap" }}>
        <form onSubmit={handleSearch} className="field" style={{ display: "flex", gap: "var(--sp-2)", flexDirection: "row", flex: "1 1 240px" }}>
          <input
            type="search"
            placeholder="그룹 이름이나 소개로 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary" type="submit">
            검색
          </button>
        </form>
        <button className="btn btn-ghost" type="button" onClick={() => setShowInviteDialog(true)}>
          초대 코드로 가입
        </button>
      </div>

      {loadError && <p className="field-error">{loadError}</p>}
      {groups === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {groups?.length === 0 && (
        <p style={{ color: "var(--ink-faint)" }}>
          {activeQuery ? "검색 결과가 없습니다." : "아직 참여할 수 있는 그룹이 없습니다."}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "var(--sp-5)" }}>
        {groups?.map((group) => (
          <DiscoverGroupCard key={group.id} group={group} onSelect={() => setSelected(group)} />
        ))}
      </div>

      {hasMore && (
        <button
          className="btn btn-secondary"
          type="button"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          style={{ alignSelf: "center" }}
        >
          {isLoadingMore ? "불러오는 중..." : "더 보기"}
        </button>
      )}

      {selected && (
        <GroupDetailDialog
          token={token}
          group={selected}
          onClose={() => setSelected(null)}
          onMembershipChange={updateMembership}
        />
      )}
      {showInviteDialog && <JoinByCodeDialog token={token} onClose={() => setShowInviteDialog(false)} />}
    </div>
  );
}

// 그룹 상세 다이얼로그 - 이름/멤버 수/가입 방식/개설일/소개를 보여주고 여기서 가입/신청한다.
// 홈 "인기 그룹" 패널도 재사용한다.
export function GroupDetailDialog({
  token,
  group,
  onClose,
  onMembershipChange,
}: {
  token: string;
  group: DiscoverGroup;
  onClose: () => void;
  onMembershipChange: (groupId: number, membership: DiscoverGroup["membership"]) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);

  const isApproval = group.joinType === "APPROVAL_REQUIRED";

  async function handleJoin() {
    setError(null);
    setBusy(true);
    try {
      const result = await joinGroup(token, group.id);
      if (result.status === "JOINED") {
        router.push(`/groups/${group.id}`);
        return;
      }
      setRequested(true);
      onMembershipChange(group.id, "PENDING");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "가입 처리에 실패했습니다");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setError(null);
    setBusy(true);
    try {
      await cancelJoinRequest(token, group.id);
      setRequested(false);
      onMembershipChange(group.id, "NONE");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "신청 취소에 실패했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div style={{ display: "flex", gap: "var(--sp-4)", alignItems: "center" }}>
          <div style={{ width: 72, flexShrink: 0 }}>
            <GroupCover groupId={group.id} name={group.name} image={group.image} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem" }}>{group.name}</span>
            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
              멤버 {group.memberCount}명 · {isApproval ? "승인제" : "자동 승인"}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>
              {new Date(group.createdAt).toLocaleDateString("ko-KR")} 개설
            </span>
          </div>
        </div>

        {group.description && (
          <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)", whiteSpace: "pre-wrap" }}>{group.description}</p>
        )}

        {group.membership === "NONE" && isApproval && !requested && (
          <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)" }}>
            승인제 그룹이에요. 가입 신청 후 방장/부방장이 승인하면 가입됩니다.
          </p>
        )}
        {requested && (
          <p style={{ fontSize: "0.82rem", color: "var(--accent)" }}>가입 신청을 보냈어요. 승인되면 알림으로 알려드릴게요.</p>
        )}
        {group.membership === "PENDING" && !requested && (
          <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)" }}>가입 신청 대기 중이에요.</p>
        )}
        {error && <p className="field-error">{error}</p>}

        <div style={{ display: "flex", gap: "var(--sp-2)", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            닫기
          </button>
          {group.membership === "MEMBER" ? (
            <button className="btn btn-primary" type="button" onClick={() => router.push(`/groups/${group.id}`)}>
              그룹으로 이동
            </button>
          ) : group.membership === "PENDING" ? (
            <button className="btn btn-secondary" type="button" onClick={handleCancel} disabled={busy}>
              {busy ? "처리 중..." : "신청 취소"}
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={handleJoin} disabled={busy}>
              {busy ? "처리 중..." : isApproval ? "가입 신청" : "가입하기"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// 초대 코드 가입 다이얼로그 - 비공개 초대 흐름(joinByCode)은 탐색 노출과 무관하게 계속 동작한다.
function JoinByCodeDialog({ token, onClose }: { token: string; onClose: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError(null);
    setBusy(true);
    try {
      const group = await joinGroupByCode(token, trimmed);
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "초대 코드 가입에 실패했습니다");
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", marginBottom: "var(--sp-1)" }}>
            초대 코드로 가입
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
            전달받은 8자리 초대 코드를 입력하면 바로 가입됩니다.
          </p>
        </div>
        <div className="field">
          <input
            type="text"
            placeholder="예: ABCD2345"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
            autoFocus
            style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "var(--font-mono)" }}
          />
        </div>
        {error && <p className="field-error">{error}</p>}
        <div style={{ display: "flex", gap: "var(--sp-2)", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            닫기
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy || !code.trim()}>
            {busy ? "가입 중..." : "가입하기"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
