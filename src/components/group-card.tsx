"use client";

import { useState } from "react";
import Link from "next/link";
import type { Group } from "@/lib/api";
import { roleChipClass, roleLabel } from "@/lib/roles";

// 대표 이미지가 없는 그룹은 단색 대신 그룹마다 다른 색을 골라 카드가 다 똑같아 보이지 않게 한다.
const COVER_COLORS = ["--accent", "--accent2", "--moss", "--amber"] as const;

export function GroupCard({ group }: { group: Group }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!group.image && !imageFailed;
  const coverColor = COVER_COLORS[group.id % COVER_COLORS.length];

  return (
    <Link href={`/groups/${group.id}`} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <div
        className="group-cover"
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
          boxShadow: "0 2px 8px var(--shadow)",
          cursor: "pointer",
          background: showImage ? undefined : `linear-gradient(135deg, var(${coverColor}), var(--accent2))`,
        }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.image!}
            alt=""
            onError={() => setImageFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
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
            {group.name.slice(0, 1)}
          </span>
        )}
        <span
          className={roleChipClass(group.myRole)}
          style={{ position: "absolute", top: 8, right: 8, background: "var(--linen)" }}
        >
          {roleLabel(group.myRole)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{group.name}</span>
        {group.description && (
          <span
            style={{
              fontSize: "0.82rem",
              color: "var(--ink-soft)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {group.description}
          </span>
        )}
      </div>
    </Link>
  );
}
