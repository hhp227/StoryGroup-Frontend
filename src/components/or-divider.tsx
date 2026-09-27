// 로그인·가입 폼과 소셜 버튼(애플·구글) 사이 "또는" 구분선
export function OrDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--sp-3)",
        margin: "var(--sp-5) 0",
        color: "var(--ink-soft)",
        fontSize: "0.85rem",
      }}
    >
      <span style={{ flex: 1, height: 1, background: "var(--stone-border)" }} />
      또는
      <span style={{ flex: 1, height: 1, background: "var(--stone-border)" }} />
    </div>
  );
}
