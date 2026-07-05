"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { GroupCard } from "@/components/group-card";
import { ApiError, createGroup, listMyGroups, type Group } from "@/lib/api";

export default function GroupsPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    listMyGroups(accessToken)
      .then(setGroups)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "그룹 목록을 불러오지 못했습니다"));
  }, [isReady, accessToken, router]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await createGroup(accessToken, name, description || null, image || null);
      setGroups((prev) => [created, ...(prev ?? [])]);
      setName("");
      setDescription("");
      setImage("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "그룹 생성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady || !accessToken) return null;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "var(--sp-7) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", marginBottom: "var(--sp-2)" }}>
          내 그룹
        </h1>
        <p style={{ color: "var(--ink-soft)" }}>참여 중인 그룹 목록입니다.</p>
      </div>

      <form onSubmit={handleCreate} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", maxWidth: 480 }}>
        <span style={{ fontWeight: 700 }}>새 그룹 만들기</span>
        <div className="field">
          <label htmlFor="group-name">그룹 이름</label>
          <input id="group-name" type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="group-desc">소개 (선택)</label>
          <input id="group-desc" type="text" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="group-image">대표 이미지 URL (선택)</label>
          <input id="group-image" type="url" maxLength={255} value={image} onChange={(e) => setImage(e.target.value)} />
        </div>
        {formError && <p className="field-error">{formError}</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ alignSelf: "flex-start" }}>
          {isSubmitting ? "만드는 중..." : "그룹 만들기"}
        </button>
      </form>

      <div>
        {loadError && <p className="field-error">{loadError}</p>}
        {groups === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
        {groups && groups.filter((g) => !g.isLounge).length === 0 && (
          <p style={{ color: "var(--ink-faint)" }}>아직 그룹이 없습니다. 위에서 새로 만들어보세요.</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--sp-4)" }}>
          {groups
            ?.filter((g) => !g.isLounge)
            .map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
        </div>
      </div>
    </div>
  );
}
