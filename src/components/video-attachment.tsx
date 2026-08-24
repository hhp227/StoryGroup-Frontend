"use client";

import { useRef, useState } from "react";

// 게시글 첨부 동영상 공용 플레이어 — 피드 카드와 상세 페이지가 공유해 모양을 통일한다.
// 서버 썸네일이 아직 없어 preload="metadata" 첫 프레임을 포스터처럼 쓰고(앨범 MediaThumb와 같은 방식),
// 재생 전에는 중앙에 원형 ▶ 오버레이를 얹었다가 누르면 네이티브 컨트롤로 넘긴다.
export function VideoAttachment({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <span style={{ position: "relative", display: "block" }}>
      <video
        ref={videoRef}
        src={src}
        controls={hasStarted}
        playsInline
        preload="metadata"
        // 피드 카드는 전체가 Link라 재생 컨트롤 클릭이 상세 페이지로 튀지 않게 막는다.
        onClick={(e) => e.preventDefault()}
        style={{ width: "100%", borderRadius: 10, border: "1px solid var(--stone-border)", display: "block" }}
      />
      {!hasStarted && (
        <button
          type="button"
          aria-label="동영상 재생"
          onClick={(e) => {
            e.preventDefault();
            setHasStarted(true);
            videoRef.current?.play();
          }}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "rgba(0, 0, 0, 0.55)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
              paddingLeft: 4,
            }}
          >
            ▶
          </span>
        </button>
      )}
    </span>
  );
}
