// 상대 시각 표기 — KMP TimeFormats.formatRelativeTime과 1:1 미러(채팅 허브 목록용).
// 7일 이후는 타임존 변환 없이 서버(KST) 오프셋 기준 날짜부를 그대로 쓴다 — 날짜 단위 표기라 오차 허용.
export function formatRelativeTime(isoDateTime: string): string {
  const parsed = Date.parse(isoDateTime);
  if (Number.isNaN(parsed)) return isoDateTime.split("T")[0] ?? isoDateTime;
  const minutes = Math.floor((Date.now() - parsed) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return isoDateTime.split("T")[0] ?? isoDateTime;
}
