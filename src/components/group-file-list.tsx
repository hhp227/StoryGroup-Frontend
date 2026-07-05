"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, deleteFile, getUserIdFromToken, listFiles, uploadGroupFile, type GroupFile } from "@/lib/api";

function formatSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function GroupFileList({ token, groupId }: { token: string; groupId: number }) {
  const myUserId = getUserIdFromToken(token);
  const [files, setFiles] = useState<GroupFile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listFiles(token, groupId)
      .then(setFiles)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "파일 목록을 불러오지 못했습니다"));
  }, [token, groupId]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await uploadGroupFile(token, groupId, selectedFile);
      setFiles((prev) => [created, ...(prev ?? [])]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "업로드에 실패했습니다");
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
      <form onSubmit={handleUpload} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <div className="field">
          <label htmlFor="file-input">파일 선택 (최대 20MB)</label>
          <input
            id="file-input"
            ref={fileInputRef}
            type="file"
            required
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {formError && <p className="field-error">{formError}</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting || !selectedFile} style={{ alignSelf: "flex-start" }}>
          {isSubmitting ? "업로드 중..." : "업로드"}
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
              {[file.authorName, formatSize(file.size), new Date(file.createdAt).toLocaleString("ko-KR")]
                .filter(Boolean)
                .join(" · ")}
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
