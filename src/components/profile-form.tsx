"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, getMyProfile, updateMyProfile, type Profile } from "@/lib/api";

export function ProfileForm({ token }: { token: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [profileImg, setProfileImg] = useState("");
  const [bio, setBio] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyProfile(token)
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setProfileImg(p.profileImg ?? "");
        setBio(p.bio ?? "");
        setStatusMessage(p.statusMessage ?? "");
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "프로필을 불러오지 못했습니다"));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    setIsSubmitting(true);
    try {
      const updated = await updateMyProfile(token, name, profileImg || null, bio || null, statusMessage || null);
      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "저장에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadError) return <p className="field-error">{loadError}</p>;
  if (!profile) return <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
        <div className="avatar">{name.slice(0, 1) || "?"}</div>
        <span style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>{profile.email}</span>
      </div>

      <div className="field">
        <label htmlFor="profile-name">이름</label>
        <input id="profile-name" type="text" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="profile-status">상태메시지</label>
        <input
          id="profile-status"
          type="text"
          maxLength={100}
          placeholder="지금 기분이나 한마디"
          value={statusMessage}
          onChange={(e) => setStatusMessage(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="profile-bio">소개</label>
        <textarea id="profile-bio" rows={4} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="profile-img">프로필 이미지 URL</label>
        <input id="profile-img" type="url" maxLength={255} value={profileImg} onChange={(e) => setProfileImg(e.target.value)} />
      </div>

      {formError && <p className="field-error">{formError}</p>}
      {saved && <p style={{ color: "var(--accent)", fontSize: "0.85rem" }}>저장했습니다.</p>}
      <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ alignSelf: "flex-start" }}>
        {isSubmitting ? "저장하는 중..." : "저장"}
      </button>
    </form>
  );
}
