"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, deleteFile, getUserIdFromToken, listFiles, uploadFile, type GroupFile } from "@/lib/api";

export function GroupFileList({ token, groupId }: { token: string; groupId: number }) {
  const myUserId = getUserIdFromToken(token);
  const [files, setFiles] = useState<GroupFile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listFiles(token, groupId)
      .then(setFiles)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "파일 목록을 불러오지 못했습니다"));
  }, [token, groupId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await uploadFile(token, groupId, name, url);
      setFiles((prev) => [created, ...(prev ?? [])]);
      setName("");
      setUrl("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "파일 등록에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(fileId: number) {
    setFormError(null);
    try {
      await deleteFile(token, groupId, fileId);
      setFiles((prev) => prev?.filter((f) => f.id !== fileId) ?? null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "삭제에 실패했습니다");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <form onSubmit={handleAdd} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <div className="field">
          <label htmlFor="file-name">파일 이름</label>
          <input id="file-name" type="text" required maxLength={255} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="file-url">파일 URL</label>
          <input id="file-url" type="url" required maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        {formError && <p className="field-error">{formError}</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ alignSelf: "flex-start" }}>
          공유하기
        </button>
      </form>

      {loadError && <p className="field-error">{loadError}</p>}
      {files === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {files?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>아직 공유된 파일이 없습니다.</p>}
      {files?.map((file) => (
        <div key={file.id} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <a href={file.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
              {file.name}
            </a>
            <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
              {file.authorName} · {new Date(file.createdAt).toLocaleString("ko-KR")}
            </span>
          </div>
          {file.userId === myUserId && (
            <button className="btn btn-secondary" type="button" onClick={() => handleDelete(file.id)}>
              삭제
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
