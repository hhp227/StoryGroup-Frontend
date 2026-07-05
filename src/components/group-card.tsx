"use client";

import { useState } from "react";
import Link from "next/link";
import type { Group } from "@/lib/api";

// 대표 이미지가 없는 그룹은 단색 대신 그룹마다 다른 색을 골라 카드가 다 똑같아 보이지 않게 한다.
const COVER_COLORS = ["--accent", "--accent2", "--moss", "--amber"] as const;

export function GroupCard({ group }: { group: Group }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!group.image && !imageFailed;
  const coverColor = COVER_COLORS[group.id % COVER_COLORS.length];

  return (
    <Link href={`/groups/${group.id}`} style={{ display: "block" }}>
      <article className="card group-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}>
        <div
          style={{
            position: "relative",
            aspectRatio: "16 / 9",
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
            className={`chip ${group.myRole === "OWNER" ? "chip-owner" : "chip-member"}`}
            style={{ position: "absolute", top: 10, right: 10, background: "var(--linen)" }}
          >
            {group.myRole === "OWNER" ? "방장" : "멤버"}
          </span>
        </div>
        <div style={{ padding: "var(--sp-4)", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>{group.name}</span>
          {group.description && (
            <span
              style={{
                fontSize: "0.85rem",
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
      </article>
    </Link>
  );
}
