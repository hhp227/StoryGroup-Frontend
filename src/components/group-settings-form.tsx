"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, deleteGroup, getGroup, updateGroup, type Group } from "@/lib/api";

export function GroupSettingsForm({ token, groupId }: { token: string; groupId: number }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getGroup(token, groupId)
      .then((g) => {
        setGroup(g);
        setName(g.name);
        setDescription(g.description ?? "");
        setImage(g.image ?? "");
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "그룹 정보를 불러오지 못했습니다"));
  }, [token, groupId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    setIsSubmitting(true);
    try {
      const updated = await updateGroup(token, groupId, name, description || null, image || null);
      setGroup(updated);
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "저장에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteGroup(token, groupId);
      router.push("/groups");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "삭제에 실패했습니다");
      setIsDeleting(false);
    }
  }

  if (loadError) return <p className="field-error">{loadError}</p>;
  if (!group) return <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div className="field">
          <label htmlFor="group-name">그룹 이름</label>
          <input id="group-name" type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="group-description">설명</label>
          <textarea id="group-description" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="group-image">대표 이미지 URL</label>
          <input id="group-image" type="url" maxLength={255} value={image} onChange={(e) => setImage(e.target.value)} />
        </div>

        {formError && <p className="field-error">{formError}</p>}
        {saved && <p style={{ color: "var(--accent)", fontSize: "0.85rem" }}>저장했습니다.</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ alignSelf: "flex-start" }}>
          {isSubmitting ? "저장하는 중..." : "저장"}
        </button>
      </form>

      {!group.isLounge && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          <span style={{ fontWeight: 700 }}>위험 구역</span>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
            그룹을 삭제하면 되돌릴 수 없습니다. 게시글, 채팅, 파일이 모두 사라집니다.
          </p>
          {deleteError && <p className="field-error">{deleteError}</p>}
          {!confirmingDelete ? (
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => setConfirmingDelete(true)}
              style={{ alignSelf: "flex-start" }}
            >
              그룹 삭제
            </button>
          ) : (
            <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem" }}>정말 삭제할까요?</span>
              <button className="btn btn-danger" type="button" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "삭제하는 중..." : "삭제 확정"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setConfirmingDelete(false)} disabled={isDeleting}>
                취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
