import type { GroupPhoto } from "@/lib/api";

// 앨범 그리드 정사각 칸 하나 — 사진/동영상/움직이는 사진(GIF)을 종류에 맞게 그린다.
// 동영상: 서버 썸네일이 아직 없어 preload="metadata"로 첫 프레임만 받아 썸네일처럼 쓰고 ▶로 구분.
// GIF: <img>가 알아서 움직이므로 그대로 두고, 그리드에서 구분되게 뱃지만 단다.
// 사이드바 앨범 패널과 앨범 전체 페이지가 공유한다(칸의 크기/링크는 부모가 결정).

// URL 저장 규칙상 확장자가 보존되므로(UUID.확장자) GIF는 경로 끝으로 판별한다.
function isGif(url: string): boolean {
  return url.split(/[?#]/)[0].toLowerCase().endsWith(".gif");
}

const badgeStyle = {
  position: "absolute" as const,
  right: 6,
  bottom: 6,
  padding: "1px 5px",
  borderRadius: 6,
  background: "rgba(0, 0, 0, 0.55)",
  color: "#fff",
  fontSize: "0.62rem",
  fontWeight: 700,
  letterSpacing: "0.05em",
};

export function MediaThumb({ photo }: { photo: GroupPhoto }) {
  if (photo.mediaType === "video") {
    return (
      <span style={{ position: "relative", display: "block", width: "100%", height: "100%" }}>
        <video
          src={photo.image}
          muted
          playsInline
          preload="metadata"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "rgba(0, 0, 0, 0.55)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8rem",
              paddingLeft: 3,
            }}
          >
            ▶
          </span>
        </span>
      </span>
    );
  }
  return (
    <span style={{ position: "relative", display: "block", width: "100%", height: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.image}
        alt={`${photo.authorName}의 사진`}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {isGif(photo.image) && <span style={badgeStyle}>GIF</span>}
    </span>
  );
}
