"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ApiError, createGroup } from "@/lib/api";
import { ImageUploadField } from "@/components/image-upload-field";

export default function NewGroupPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await createGroup(accessToken, name, description || null, image || null);
      router.push(`/groups/${created.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "그룹 생성에 실패했습니다");
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "var(--sp-7) var(--sp-5)", display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "var(--sp-2)" }}>
          새 그룹 만들기
        </h1>
        <p style={{ color: "var(--ink-soft)" }}>같이할 사람들을 위한 공간을 만들어보세요.</p>
      </div>

      <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div className="field">
          <label htmlFor="group-name">그룹 이름</label>
          <input id="group-name" type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="group-desc">소개 (선택)</label>
          <input id="group-desc" type="text" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <ImageUploadField token={accessToken} label="대표 이미지 (선택)" value={image} onChange={setImage} />
        {formError && <p className="field-error">{formError}</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ alignSelf: "flex-start" }}>
          {isSubmitting ? "만드는 중..." : "그룹 만들기"}
        </button>
      </form>
    </div>
  );
}
