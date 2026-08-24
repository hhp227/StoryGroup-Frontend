"use client";

import Link from "next/link";
import type { Group } from "@/lib/api";
import { GroupCover } from "@/components/group-cover";
import { roleChipClass, roleLabel } from "@/lib/roles";

export function GroupCard({ group }: { group: Group }) {
  return (
    <Link href={`/groups/${group.id}`} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <GroupCover groupId={group.id} name={group.name} image={group.image}>
        <span
          className={roleChipClass(group.myRole)}
          style={{ position: "absolute", top: 8, right: 8, background: "var(--linen)" }}
        >
          {roleLabel(group.myRole)}
        </span>
      </GroupCover>

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
