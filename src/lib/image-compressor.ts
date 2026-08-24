import { JPEG_QUALITY, planImageCompression } from "./image-compression-plan";

// 이미지 투명 압축(§3·§4) — uploadImage/uploadChatFile이 전송 직전에 호출한다.
// 인코딩은 Web Worker(OffscreenCanvas)에서 해 메인 스레드를 잡지 않는다(§5) —
// 판정(플랜)은 여기서 하고 워커는 그리기+인코딩만 한다(플랜 로직 중복 방지).
// 워커·OffscreenCanvas 미지원이면 메인 스레드 캔버스로 폴백.
// 실패는 조용히 원본 폴백(서버 10MB 상한이 여유라 실패보다 원본이 낫다 — 동영상과 반대 정책).

let worker: Worker | null = null;
let nextRequestId = 0;
const pendingRequests = new Map<number, { resolve: (blob: Blob) => void; reject: (err: Error) => void }>();

function workerSupported(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

function getWorker(): Worker {
  if (!worker) {
    // public/ 정적 파일 — 번들러 워커 처리에 기대지 않는다(ffmpeg 코어 셀프호스팅과 같은 이유)
    worker = new Worker("/image-compress-worker.js");
    worker.onmessage = (event: MessageEvent<{ id: number; blob?: Blob; error?: string }>) => {
      const { id, blob, error } = event.data;
      const pending = pendingRequests.get(id);
      if (!pending) return;
      pendingRequests.delete(id);
      if (blob) pending.resolve(blob);
      else pending.reject(new Error(error ?? "encode failed"));
    };
    worker.onerror = () => {
      // 워커 자체가 죽으면 대기 중인 요청을 전부 실패 처리(호출부가 원본 폴백) 후 재생성 여지를 남긴다
      pendingRequests.forEach((pending) => pending.reject(new Error("worker error")));
      pendingRequests.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function encodeInWorker(bitmap: ImageBitmap, width: number, height: number, mime: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const id = ++nextRequestId;
    pendingRequests.set(id, { resolve, reject });
    // ImageBitmap은 transfer로 넘긴다 — 복사 없음, 이후 메인 스레드에서 사용 불가
    getWorker().postMessage({ id, bitmap, width, height, mime, quality: JPEG_QUALITY }, [bitmap]);
  });
}

function encodeOnMain(bitmap: ImageBitmap, width: number, height: number, mime: string): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, JPEG_QUALITY));
}

export async function maybeCompressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const plan = planImageCompression(file.type, file.size, bitmap.width, bitmap.height);
    if (plan.kind === "skip") {
      bitmap.close();
      return file;
    }
    const mime = plan.format === "png" ? "image/png" : "image/jpeg";
    let blob: Blob | null;
    if (workerSupported()) {
      // 워커 인코딩 실패는 원본 폴백 — 여기서 메인 스레드로 재시도하지 않는다(bitmap이 이미 transfer됨)
      blob = await encodeInWorker(bitmap, plan.targetWidth, plan.targetHeight, mime).catch(() => null);
    } else {
      blob = await encodeOnMain(bitmap, plan.targetWidth, plan.targetHeight, mime);
    }
    if (!blob) return file;
    const extension = plan.format === "png" ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^.]*$/, "");
    return new File([blob], `${baseName}.${extension}`, { type: mime });
  } catch {
    return file;
  }
}
