// 이미지 압축 판정 — shared ImageCompressionPlanner.kt의 TS 미러(수정 시 양쪽 함께).
// GIF는 재인코딩하면 애니메이션이 깨져 무조건 생략(앨범 GIF 뱃지 유지).
// PNG는 투명도 보존을 위해 PNG 출력, 그 외(JPEG/WebP/HEIC)는 JPEG q0.85.

export const MAX_DIMENSION = 1920;
export const SKIP_BYTES = 1 * 1024 * 1024;
// 캔버스 toBlob 품질 인자(0..1) — Kotlin JPEG_QUALITY=85의 미러
export const JPEG_QUALITY = 0.85;

export type ImagePlan =
  | { kind: "skip" }
  | { kind: "recompress"; targetWidth: number; targetHeight: number; format: "jpeg" | "png" };

export function planImageCompression(contentType: string, sizeBytes: number, width: number, height: number): ImagePlan {
  if (contentType.toLowerCase() === "image/gif") return { kind: "skip" };
  const longSide = Math.max(width, height);
  if (sizeBytes <= SKIP_BYTES && longSide <= MAX_DIMENSION) return { kind: "skip" };

  const scale = longSide > MAX_DIMENSION ? MAX_DIMENSION / longSide : 1;
  const format = contentType.toLowerCase() === "image/png" ? "png" : "jpeg";
  return {
    kind: "recompress",
    targetWidth: Math.max(Math.trunc(width * scale), 1),
    targetHeight: Math.max(Math.trunc(height * scale), 1),
    format,
  };
}
