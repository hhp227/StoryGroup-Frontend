"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  ApiError,
  addFriend,
  getOrCreateDirectRoom,
  getPublicProfile,
  getUserIdFromToken,
  listFriends,
  removeFriend,
  type PublicProfile,
} from "@/lib/api";

// 공개 프로필 페이지 — 게시글 상세의 작성자 메뉴 "프로필 보기"가 진입점.
export default function PublicProfilePage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const myUserId = accessToken ? getUserIdFromToken(accessToken) : null;
  const isSelf = myUserId === userId;

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    getPublicProfile(accessToken, userId)
      .then(setProfile)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "프로필을 불러오지 못했습니다"));
    // 친구 여부는 버튼 상태용 부가 정보 — 실패해도 프로필은 그대로 보여준다.
    listFriends(accessToken)
      .then((friends) => setIsFriend(friends.some((f) => f.userId === userId)))
      .catch(() => {});
  }, [isReady, accessToken, userId, router]);

  if (!isReady || !accessToken) return null;

  async function handleMessage() {
    if (!accessToken) return;
    setActionError(null);
    try {
      const room = await getOrCreateDirectRoom(accessToken, userId);
      router.push(`/dm/${room.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "DM을 시작하지 못했습니다");
    }
  }

  async function handleFriendToggle() {
    if (!accessToken || isFriend === null) return;
    setActionError(null);
    setIsBusy(true);
    try {
      if (isFriend) {
        await removeFriend(accessToken, userId);
      } else {
        await addFriend(accessToken, userId);
      }
      setIsFriend(!isFriend);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "친구 처리에 실패했습니다");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {profile === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}

      {profile && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", padding: "var(--sp-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)" }}>
            {profile.profileImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profileImg}
                alt=""
                style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--stone-border)" }}
              />
            ) : (
              <div className="avatar" style={{ width: 72, height: 72, fontSize: "1.6rem" }}>
                {profile.name.slice(0, 1)}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", margin: 0 }}>{profile.name}</h1>
              {profile.statusMessage && (
                <span style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>{profile.statusMessage}</span>
              )}
              <span style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>
                {new Date(profile.createdAt).toLocaleDateString("ko-KR")} 가입
              </span>
            </div>
          </div>

          {profile.bio && (
            <p style={{ fontSize: "0.92rem", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0, borderTop: "1px solid var(--stone-border)", paddingTop: "var(--sp-4)" }}>
              {profile.bio}
            </p>
          )}

          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            {isSelf ? (
              <Link className="btn btn-secondary" href="/settings/profile">
                프로필 수정
              </Link>
            ) : (
              <>
                <button className="btn btn-primary" type="button" onClick={handleMessage}>
                  1:1 DM
                </button>
                {isFriend !== null && (
                  <button className="btn btn-secondary" type="button" onClick={handleFriendToggle} disabled={isBusy}>
                    {isFriend ? "친구 해제" : "친구 추가"}
                  </button>
                )}
              </>
            )}
          </div>
          {actionError && <p className="field-error">{actionError}</p>}
        </div>
      )}
    </div>
  );
}
