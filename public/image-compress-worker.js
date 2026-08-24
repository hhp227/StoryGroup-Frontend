// 이미지 재인코딩 워커 — 판정(플랜)은 메인 스레드가 하고, 여기서는 받은 ImageBitmap을
// 목표 치수로 그려 인코딩만 한다(플랜 로직이 워커에 중복되지 않게 — src/lib/image-compressor.ts 참조).
// ImageBitmap은 transferable이라 복사 없이 넘어온다.
self.onmessage = async (event) => {
  const { id, bitmap, width, height, mime, quality } = event.data;
  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: mime, quality });
    self.postMessage({ id, blob });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
