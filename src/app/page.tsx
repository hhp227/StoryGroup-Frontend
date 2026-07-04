import Link from "next/link";

export default function Home() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-8) var(--sp-5)" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--display-weight)" as never,
          letterSpacing: "var(--display-tracking)",
          fontSize: "2.3rem",
          marginBottom: "var(--sp-4)",
        }}
      >
        조용히, 우리끼리
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: "1.05rem", lineHeight: 1.65, marginBottom: "var(--sp-6)", maxWidth: "56ch" }}>
        친한 사람들끼리만 모이는 폐쇄형 그룹 SNS, StoryGroup입니다. 그룹을 만들고 게시글, 댓글, 채팅, 화상회의까지 한곳에서.
      </p>
      <div style={{ display: "flex", gap: "var(--sp-3)" }}>
        <Link className="btn btn-primary" href="/register">
          시작하기
        </Link>
        <Link className="btn btn-secondary" href="/login">
          로그인
        </Link>
      </div>
    </div>
  );
}
