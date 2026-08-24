"use client";

import Link from "next/link";
import { useTheme, type Mode, type Mood } from "@/components/theme-provider";

// globals.css의 조합별 토큰과 같은 값. 선택 카드에서 "지금 적용 안 된 조합"의 색을 미리 보여주는
// 용도라 CSS 변수(현재 조합만 반영됨)로는 안 되고 여기 하드코딩한다 — globals.css 수정 시 같이 갱신.
const SWATCHES: Record<Mood, Record<Mode, { paper: string; accent: string }>> = {
  warm: {
    light: { paper: "#fcf3ef", accent: "#c4577c" },
    dark: { paper: "#241a1c", accent: "#e8839f" },
  },
  vibrant: {
    light: { paper: "#fbf7fa", accent: "#e85a3d" },
    dark: { paper: "#1e1626", accent: "#ff6b4a" },
  },
};

const MOODS: { value: Mood; label: string; description: string }[] = [
  { value: "warm", label: "다정함", description: "부드럽고 따뜻한 분위기" },
  { value: "vibrant", label: "캐주얼", description: "선명하고 활기찬 분위기" },
];

const MODES: { value: Mode; label: string; description: string }[] = [
  { value: "light", label: "라이트", description: "밝은 배경" },
  { value: "dark", label: "다크", description: "어두운 배경" },
];

export default function ThemeSettingsPage() {
  const { mood, mode, setMood, setMode } = useTheme();

  return (
    <div className="container page page-form" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div>
        <Link href="/settings" style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          ‹ 설정
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginTop: "var(--sp-2)" }}>테마</h1>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)", marginTop: 4 }}>
          선택하면 바로 적용되고, 이 브라우저에 저장됩니다.
        </p>
      </div>

      <OptionGroup label="무드">
        {MOODS.map((m) => (
          <OptionCard
            key={m.value}
            label={m.label}
            description={m.description}
            swatch={SWATCHES[m.value][mode]}
            selected={mood === m.value}
            onSelect={() => setMood(m.value)}
          />
        ))}
      </OptionGroup>

      <OptionGroup label="화면 모드">
        {MODES.map((m) => (
          <OptionCard
            key={m.value}
            label={m.label}
            description={m.description}
            swatch={SWATCHES[mood][m.value]}
            selected={mode === m.value}
            onSelect={() => setMode(m.value)}
          />
        ))}
      </OptionGroup>
    </div>
  );
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink-soft)" }}>{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>{children}</div>
    </div>
  );
}

function OptionCard({
  label,
  description,
  swatch,
  selected,
  onSelect,
}: {
  label: string;
  description: string;
  swatch: { paper: string; accent: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "var(--sp-2)",
        padding: "var(--sp-4)",
        borderRadius: 12,
        border: selected ? "2px solid var(--accent)" : "1px solid var(--stone-border)",
        background: "var(--paper)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-body)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 44,
          height: 24,
          borderRadius: 8,
          background: swatch.paper,
          border: "1px solid var(--stone-border)",
          display: "inline-flex",
          alignItems: "center",
          paddingLeft: 6,
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: 999, background: swatch.accent }} />
      </span>
      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>
        {label}
        {selected && <span style={{ color: "var(--accent)", marginLeft: 6, fontSize: "0.78rem" }}>사용 중</span>}
      </span>
      <span style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>{description}</span>
    </button>
  );
}
