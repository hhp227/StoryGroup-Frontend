import type { GroupRole } from "./api";

export function roleLabel(role: GroupRole): string {
  switch (role) {
    case "OWNER":
      return "방장";
    case "ADMIN":
      return "부방장";
    case "MEMBER":
      return "멤버";
  }
}

export function roleChipClass(role: GroupRole): string {
  switch (role) {
    case "OWNER":
      return "chip chip-owner";
    case "ADMIN":
      return "chip chip-admin";
    case "MEMBER":
      return "chip chip-member";
  }
}

// 방장/부방장 공통 조정 권한(남의 글·댓글 삭제, 공지, 내보내기) - 백엔드 GroupRole.isModerator와 동일 기준.
export function canModerate(role: GroupRole | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}
