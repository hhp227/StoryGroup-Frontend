"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listGroupPhotos, type GroupPhotosPage } from "@/lib/api";
import { MediaThumb } from "./media-thumb";

const PREVIEW_COUNT = 4;

// 사이드바 앨범 패널(B안): 별도 앨범 엔티티 없이 그룹 게시글 첨부 사진을 모아 보여주는 파생 뷰.
// 라운지도 그룹이라 홈/그룹 메인이 이 컴포넌트 하나를 groupId만 바꿔 공유한다.
// 사진이 없으면 아무것도 렌더하지 않는다 — 빈 카드로 자리를 차지하지 않게.
export function AlbumPanel({
  token,
  groupId,
  refreshKey = 0,
}: {
  token: string;
  groupId: number;
  // 파생 뷰라 원본(게시글 첨부)이 바뀌면 다시 불러와야 한다 — 부모가 이 값을 올리면 재조회.
  refreshKey?: number;
}) {
  const [data, setData] = useState<GroupPhotosPage | null>(null);

  useEffect(() => {
    let cancelled = false;
    listGroupPhotos(token, groupId, 0, PREVIEW_COUNT)
      .then((fetched) => {
        if (!cancelled) setData(fetched);
      })
      .catch(() => {}); // 부가 정보라 실패 시 조용히 숨긴다(피드가 주인공)
    return () => {
      cancelled = true;
    };
  }, [token, groupId, refreshKey]);

  if (!data || data.totalCount === 0) return null;

  const remaining = data.totalCount - data.photos.length;

  return (
    <div className="card" style={{ padding: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "var(--sp-3)" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
          앨범{" "}
          <span style={{ color: "var(--ink-faint)", fontWeight: 600, fontSize: "0.8rem" }}>{data.totalCount}장</span>
        </span>
        <Link href={`/groups/${groupId}/photos`} style={{ color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600 }}>
          전체 보기 →
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" }}>
        {data.photos.map((photo, index) => {
          const isOverflowTile = remaining > 0 && index === data.photos.length - 1;
          return (
            <Link
              key={photo.id}
              // 마지막 칸이 "+N"이면 갤러리로, 나머지는 사진의 원본 게시글로(맥락 보존).
              href={isOverflowTile ? `/groups/${groupId}/photos` : `/groups/${groupId}/posts/${photo.postId}`}
              style={{ position: "relative", display: "block", aspectRatio: "1", borderRadius: 10, overflow: "hidden" }}
            >
              <MediaThumb photo={photo} />
              {isOverflowTile && (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0, 0, 0, 0.45)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                >
                  +{remaining}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
