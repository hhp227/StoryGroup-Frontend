"use client";

import { useState, type ReactNode } from "react";

// 대표 이미지가 없는 그룹은 단색 대신 그룹마다 다른 색을 골라 카드가 다 똑같아 보이지 않게 한다.
const COVER_COLORS = ["--accent", "--accent2", "--moss", "--amber"] as const;

// 그룹 카드 공용 커버(내 그룹 목록/그룹 탐색/그룹 상세 배너). children은 커버 위 오버레이(역할 칩 등)로 쓰인다.
// 상세 배너처럼 타이틀을 직접 얹는 자리에서는 showInitial=false로 이니셜 폴백을 끈다(이름이 두 번 보이지 않게).
export function GroupCover({
  groupId,
  name,
  image,
  aspectRatio = "1 / 1",
  showInitial = true,
  minHeight,
  children,
}: {
  groupId: number;
  name: string;
  image: string | null;
  aspectRatio?: string;
  showInitial?: boolean;
  // 좁은 화면에서 aspect-ratio로 계산된 높이가 오버레이(타이틀+버튼)를 못 담을 때를 위한 하한.
  minHeight?: number;
  children?: ReactNode;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!image && !imageFailed;
  const coverColor = COVER_COLORS[groupId % COVER_COLORS.length];

  return (
    <div
      className="group-cover"
      style={{
        position: "relative",
        aspectRatio,
        minHeight,
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        boxShadow: "0 2px 8px var(--shadow)",
        background: showImage ? undefined : `linear-gradient(135deg, var(${coverColor}), var(--accent2))`,
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image!}
          alt=""
          onError={() => setImageFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : showInitial ? (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "2.4rem",
            color: "var(--on-accent)",
          }}
        >
          {name.slice(0, 1)}
        </span>
      ) : null}
      {children}
    </div>
  );
}
