"use client";

import { uploadVideo } from "./api";
import { FIRST_MARGIN, RETRY_MARGIN, TARGET_BYTES, planVideoCompression } from "./video-compression-plan";
import { compressVideo, readVideoMetadata } from "./video-compressor";

// 동영상 압축 준비(§2) — 판정→(생략|압축→5MB 초과 시 1회 재플랜)까지. 업로드는 하지 않는다.
// 게시글(즉시 업로드)과 채팅(전송 시점 업로드)이 이 부분을 공유한다.
// onStatus로 "압축 중 n%" 문구를 올린다. 거부·실패는 Error throw(문구가 그대로 표출됨).
export async function prepareVideoForUpload(file: File, onStatus: (label: string) => void): Promise<File> {
  const meta = await readVideoMetadata(file);
  const plan = planVideoCompression(meta, FIRST_MARGIN);
  if (plan.kind === "reject-too-large") throw new Error("파일이 너무 큽니다. (최대 500MB)");
  if (plan.kind === "reject-too-long") throw new Error("동영상은 최대 3분까지 첨부할 수 있습니다.");
  if (plan.kind !== "compress") return file; // 원본이 이미 5MB 이하 — 재인코딩은 시간 낭비+화질 손실

  onStatus("압축 중 0%");
  let out = await compressVideo(file, plan, (f) => onStatus(`압축 중 ${Math.round(f * 100)}%`));
  if (out.size > TARGET_BYTES) {
    // 단일 패스 ABR 오버슈트 — 더 보수적인 마진으로 딱 한 번 재시도(§2-5)
    const retryPlan = planVideoCompression(meta, RETRY_MARGIN);
    if (retryPlan.kind !== "compress") throw new Error("동영상 압축에 실패했습니다.");
    out = await compressVideo(file, retryPlan, (f) => onStatus(`압축 중 ${Math.round(f * 100)}%`));
    if (out.size > TARGET_BYTES) throw new Error("동영상 압축에 실패했습니다.");
  }
  return out;
}

// 게시글용 파이프라인 — 압축 준비 후 /api/videos에 즉시 업로드해 공개 URL을 돌려준다.
export async function attachVideoWithCompression(
  token: string,
  file: File,
  onStatus: (label: string) => void,
): Promise<string> {
  const toUpload = await prepareVideoForUpload(file, onStatus);
  onStatus("업로드 중...");
  const { url } = await uploadVideo(token, toUpload);
  return url;
}
