"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { VideoPlan } from "./video-compression-plan";

type CompressPlan = Extract<VideoPlan, { kind: "compress" }>;

// 코어(~31MB)는 public/ffmpeg 셀프 호스팅 — 첫 동영상 첨부 때 lazy load(§6).
// 싱글스레드 코어라 COOP/COEP 불필요. 인스턴스는 싱글턴, 압축은 직렬 큐(동시 1건 — wasm 메모리 보호).
let ffmpegPromise: Promise<FFmpeg> | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function loadFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      // blob URL 로드 — 번들러가 내부 워커/코어 경로를 못 찾는 문제를 우회한다
      const loaded = await ffmpeg.load({
        coreURL: await toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
      });
      if (!loaded) throw new Error("압축 모듈을 불러오지 못했습니다.");
      return ffmpeg;
    })().catch((err) => {
      ffmpegPromise = null; // 다음 첨부에서 재시도할 수 있게 실패를 남기지 않는다
      throw err;
    });
  }
  return ffmpegPromise;
}

// <video> 메타데이터로 duration/해상도 추출 — ffprobe 불필요(§6)
export function readVideoMetadata(file: File) {
  return new Promise<{ durationMs: number; sizeBytes: number; width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        durationMs: Math.round(video.duration * 1000),
        sizeBytes: file.size,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("동영상 정보를 읽지 못했습니다."));
    };
    video.src = url;
  });
}

// 단일 시도 인코딩 — 1-pass ABR+maxrate(§2), 5MB 초과 재시도는 호출부가 RETRY_MARGIN으로 재플랜.
// ffmpeg.wasm은 자체 Web Worker에서 돌므로 인코딩 중에도 UI(글 작성)는 막히지 않는다.
export function compressVideo(file: File, plan: CompressPlan, onProgress: (fraction: number) => void): Promise<File> {
  const run = queue.then(async () => {
    const ffmpeg = await loadFFmpeg();
    const inputName = `in-${crypto.randomUUID()}`;
    const outputName = `out-${crypto.randomUUID()}.mp4`;
    const handleProgress = ({ progress }: { progress: number }) => onProgress(Math.min(Math.max(progress, 0), 1));
    ffmpeg.on("progress", handleProgress);
    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const code = await ffmpeg.exec([
        "-i", inputName,
        "-vf", `scale=${plan.targetWidth}:${plan.targetHeight}`,
        "-r", String(plan.fps),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-b:v", String(plan.videoBitrate),
        "-maxrate", String(Math.round(plan.videoBitrate * 1.2)),
        "-bufsize", String(plan.videoBitrate * 2),
        "-c:a", "aac",
        "-b:a", String(plan.audioBitrate),
        "-movflags", "+faststart",
        outputName,
      ]);
      if (code !== 0) throw new Error("동영상 압축에 실패했습니다.");
      const data = await ffmpeg.readFile(outputName);
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
      return new File([new Uint8Array(bytes)], "upload.mp4", { type: "video/mp4" });
    } finally {
      ffmpeg.off("progress", handleProgress);
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  });
  queue = run.catch(() => {});
  return run;
}
