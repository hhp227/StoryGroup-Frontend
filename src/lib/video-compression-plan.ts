// 동영상 압축 판정 — shared VideoCompressionPlanner.kt의 TS 미러(수정 시 양쪽 함께).
// 판정 순서: 500MB 초과 거부 → 5MB 이하 생략(길이 무관) → 3분 초과 거부 → 플랜 계산.
// 실행기는 이 결과대로만 인코딩한다(재시도는 호출부가 RETRY_MARGIN으로 재플랜).

export const TARGET_BYTES = 5 * 1024 * 1024;
export const MAX_SOURCE_BYTES = 500 * 1024 * 1024;
export const MAX_DURATION_MS = 180_000;
export const AUDIO_BITRATE = 64_000;
export const FIRST_MARGIN = 0.93;
export const RETRY_MARGIN = 0.85;
export const MIN_VIDEO_BITRATE = 100_000;
export const FPS = 30;

export type VideoPlan =
  | { kind: "reject-too-large" }
  | { kind: "reject-too-long" }
  | { kind: "skip" }
  | {
      kind: "compress";
      videoBitrate: number;
      audioBitrate: number;
      targetWidth: number;
      targetHeight: number;
      fps: number;
    };

export interface VideoMeta {
  durationMs: number;
  sizeBytes: number;
  width: number;
  height: number;
}

export function planVideoCompression(meta: VideoMeta, margin = FIRST_MARGIN): VideoPlan {
  if (meta.sizeBytes > MAX_SOURCE_BYTES) return { kind: "reject-too-large" };
  if (meta.sizeBytes <= TARGET_BYTES) return { kind: "skip" };
  if (meta.durationMs > MAX_DURATION_MS) return { kind: "reject-too-long" };

  const durationSec = meta.durationMs / 1000;
  // Kotlin toInt()과 동일한 절삭(trunc) — 수치가 플랫폼 간 1bps라도 어긋나지 않게
  const totalBitrate = Math.trunc((TARGET_BYTES * 8 * margin) / durationSec);
  const videoBitrate = Math.max(totalBitrate - AUDIO_BITRATE, MIN_VIDEO_BITRATE);
  const targetShort = videoBitrate >= 1_500_000 ? 720 : videoBitrate >= 800_000 ? 540 : videoBitrate >= 400_000 ? 480 : 360;
  const [targetWidth, targetHeight] = scaleToShortSide(meta.width, meta.height, targetShort);
  return { kind: "compress", videoBitrate, audioBitrate: AUDIO_BITRATE, targetWidth, targetHeight, fps: FPS };
}

// 짧은 변을 목표로 비율 유지 축소 — 업스케일 없음, H.264 제약으로 짝수 내림
function scaleToShortSide(width: number, height: number, targetShort: number): [number, number] {
  const shortSide = Math.min(width, height);
  if (shortSide <= targetShort || shortSide <= 0) return [even(width), even(height)];
  const scale = targetShort / shortSide;
  return [even(Math.trunc(width * scale)), even(Math.trunc(height * scale))];
}

function even(v: number): number {
  return Math.max(v - (v % 2), 2);
}
