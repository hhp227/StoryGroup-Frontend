"use client";

import type { GroupJoinType } from "@/lib/api";

const OPTIONS: { value: GroupJoinType; label: string; description: string }[] = [
  { value: "AUTO_APPROVE", label: "자동 승인", description: "그룹 찾기에서 누구나 바로 가입할 수 있어요." },
  { value: "APPROVAL_REQUIRED", label: "승인제", description: "가입 신청을 받고 방장/부방장이 승인해요." },
];

// 그룹 생성/설정 공용 가입 방식 선택. 어느 쪽이든 초대 코드로는 바로 가입된다.
export function JoinTypeField({ value, onChange }: { value: GroupJoinType; onChange: (v: GroupJoinType) => void }) {
  return (
    <div className="field">
      <label>가입 방식</label>
      <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            style={{
              display: "flex",
              gap: "var(--sp-2)",
              alignItems: "flex-start",
              padding: "var(--sp-3)",
              border: `1px solid ${value === option.value ? "var(--accent)" : "var(--stone-border)"}`,
              borderRadius: "var(--radius-card)",
              cursor: "pointer",
              flex: "1 1 200px",
              background: value === option.value ? "var(--accent-soft)" : "var(--linen)",
            }}
          >
            <input
              type="radio"
              name="join-type"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              style={{ marginTop: 3 }}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{option.label}</span>
              <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
