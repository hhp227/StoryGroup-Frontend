"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listFiles, type GroupFile } from "@/lib/api";

const PREVIEW_COUNT = 3;

// group-file-list와 같은 규칙의 축약 표기(사이드바용 로컬 복사).
function formatSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 그룹 사이드바 "최근 파일": 최근 3건, 줄 클릭 → 파일 열기(새 탭), 헤더 → 파일 페이지.
// 파일이 없으면 렌더하지 않는다.
export function FilePanel({ token, groupId }: { token: string; groupId: number }) {
  const [files, setFiles] = useState<GroupFile[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listFiles(token, groupId, 0, PREVIEW_COUNT)
      .then((fetched) => {
        if (!cancelled) setFiles(fetched);
      })
      .catch(() => {}); // 부가 정보라 실패 시 조용히 숨긴다
    return () => {
      cancelled = true;
    };
  }, [token, groupId]);

  if (!files || files.length === 0) return null;

  return (
    <div className="card" style={{ padding: "var(--sp-4)", paddingBottom: "var(--sp-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>최근 파일</span>
        <Link href={`/groups/${groupId}/files`} style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600 }}>
          전체 보기 →
        </Link>
      </div>
      {files.map((file) => (
        <a
          key={file.id}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            padding: "9px 0",
            borderTop: "1px solid var(--stone-border)",
            fontSize: "0.85rem",
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </span>
          {formatSize(file.size) && (
            <span style={{ color: "var(--ink-faint)", fontSize: "0.75rem", flexShrink: 0 }}>{formatSize(file.size)}</span>
          )}
          <span aria-hidden style={{ color: "var(--ink-faint)" }}>
            ›
          </span>
        </a>
      ))}
    </div>
  );
}
