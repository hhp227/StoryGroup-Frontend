"use client";

import { useRef, useState } from "react";
import { ApiError, uploadImage } from "@/lib/api";

// "이미지 URL" 텍스트 입력을 대체하는 단일 이미지 업로드 필드.
// 파일을 고르면 즉시 서버(/api/images)로 올리고, 부모에는 공개 URL만 넘긴다 — 폼 제출 로직 무변경.
export function ImageUploadField({
  token,
  label,
  value,
  onChange,
}: {
  token: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSelect(file: File | undefined) {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const { url } = await uploadImage(token, file);
      onChange(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "이미지 업로드에 실패했습니다");
    } finally {
      setIsUploading(false);
      // 같은 파일을 다시 골라도 change 이벤트가 나가도록 초기화.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-soft)" }}>{label}</span>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 12, border: "1px solid var(--stone-border)" }}
        />
      )}
      <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleSelect(e.target.files?.[0])}
          disabled={isUploading}
        />
        {value && (
          <button className="btn btn-ghost" type="button" onClick={() => onChange("")}>
            제거
          </button>
        )}
      </div>
      {isUploading && <p style={{ fontSize: "0.78rem", color: "var(--ink-faint)", margin: 0 }}>업로드 중...</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
