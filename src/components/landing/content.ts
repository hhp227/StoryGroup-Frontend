// 비로그인 랜딩 문구. 마케팅 카피라 화면의 일부 — 기능 설명은 실제로 있는 기능만 적는다.

export const HERO = {
  title: "친한 사람들끼리,\n조용히 오래 가는 이야기.",
  body: "초대받은 사람만 들어오는 그룹에서 글·사진·채팅·통화까지.\n광고도, 모르는 사람의 알고리즘도 없는 우리만의 공간이에요.",
} as const;

/** 히어로 아래 띠 — 숫자 대신 사실만 적는다(가짜 지표를 만들지 않는다) */
export const HIGHLIGHTS = [
  { value: "승인제", label: "그룹장이 받아준 사람만 입장" },
  { value: "4개 플랫폼", label: "웹 · Android · iOS · Desktop" },
  { value: "실시간", label: "그룹 채팅 · 1:1 DM · 알림" },
  { value: "영상통화", label: "그룹·1:1 보이스톡 · 페이스톡" },
] as const;

export const HOW = {
  kicker: "HOW IT WORKS",
  title: "만들고, 부르고, 함께 남기기.",
  subtitle: "딱 세 단계예요. 그룹 이름 하나면 시작할 수 있어요.",
} as const;

export type StepVisualKey = "create" | "invite" | "share";

export const STEPS = [
  {
    no: "01",
    title: "그룹 만들기",
    body: "이름과 커버를 정하고\n자동 가입·승인제 중 하나를 고르면 끝.",
    visual: "create",
  },
  {
    no: "02",
    title: "초대하고 받아주기",
    body: "가입 신청이 오면 그룹장이 확인하고 받아줘요.\n모르는 사람은 들어올 수 없어요.",
    visual: "invite",
  },
  {
    no: "03",
    title: "함께 남기기",
    body: "글과 사진은 피드와 앨범에,\n약속은 일정에, 수다는 채팅방에.",
    visual: "share",
  },
] as const satisfies readonly { no: string; title: string; body: string; visual: StepVisualKey }[];

export type ScreenKey = "group" | "chat" | "events";

export type Feature = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  screen: ScreenKey;
  /** 목업을 왼쪽에 두는 행 */
  reverse?: boolean;
};

export const FEATURES: readonly Feature[] = [
  {
    id: "feed",
    eyebrow: "피드 · 앨범",
    title: "올린 글과 사진이\n그룹의 앨범이 돼요",
    body: "게시글에 사진·동영상을 올리면 앨범에 자동으로 모여요.\n공지는 위에 따로, 좋아요와 댓글로 가볍게 반응하고요.",
    screen: "group",
  },
  {
    id: "chat",
    eyebrow: "채팅 · 통화",
    title: "할 말이 생기면\n바로 채팅, 바로 통화",
    body: "그룹 채팅방과 1:1 DM에서 사진·파일을 주고받고,\n버튼 하나로 보이스톡·페이스톡을 걸 수 있어요.",
    screen: "chat",
    reverse: true,
  },
  {
    id: "events",
    eyebrow: "일정 · 알림",
    title: "약속은 일정으로,\n놓친 건 알림으로",
    body: "모임 날짜를 올리면 참석 여부가 한눈에 모여요.\n새 글·댓글·채팅은 푸시로, 원하는 것만 켜 두세요.",
    screen: "events",
  },
];

export const FAQS = [
  {
    q: "공개 SNS와 뭐가 다른가요?",
    a: "StoryGroup의 그룹은 그룹 멤버에게만 보여요. 검색으로 그룹을 찾을 수는 있지만, 글·사진·채팅은 가입한 사람만 볼 수 있어요.",
  },
  {
    q: "가입은 어떻게 하나요?",
    a: "이메일로 가입하거나 Google · Apple 계정으로 바로 시작할 수 있어요.",
  },
  {
    q: "아무나 우리 그룹에 들어올 수 있나요?",
    a: "그룹을 만들 때 가입 방식을 고를 수 있어요. 승인제로 두면 그룹장이 신청을 확인하고 받아준 사람만 들어올 수 있어요.",
  },
  {
    q: "불편한 사람이 있으면요?",
    a: "상대를 차단하면 그 사람의 글과 DM이 보이지 않아요. 게시글이나 사용자를 신고하면 그룹 운영진과 운영자가 확인해요.",
  },
  {
    q: "탈퇴하면 제 기록은 어떻게 되나요?",
    a: "설정 › 계정에서 언제든 탈퇴할 수 있어요. 탈퇴하면 계정 정보는 익명 처리돼요. 직접 만든 그룹이 남아 있다면 먼저 그룹장을 넘기거나 그룹을 정리해야 해요.",
  },
] as const;

export const DOWNLOAD = {
  kicker: "DOWNLOAD",
  title: "휴대폰에서도\n그룹 소식을 바로 받아보세요",
  body: "Android · iOS 앱으로 채팅과 알림을 놓치지 않고, 통화도 바로 받을 수 있어요.",
} as const;

/**
 * 스토어 배지 링크. TODO: 스토어 출시 후 실제 앱 상세 URL로 교체 — 지금은 임시로 각 스토어 메인으로 보낸다.
 * 배지 이미지는 공식 한국어 배지(540×167, 투명 배경).
 */
export const STORE_BADGES = [
  {
    store: "Google Play",
    href: "https://play.google.com/store",
    src: "/badges/google-play-ko.png",
    alt: "Google Play에서 다운로드하기",
  },
  {
    store: "App Store",
    href: "https://www.apple.com/kr/app-store/",
    src: "/badges/app-store-ko.png",
    alt: "App Store에서 다운로드하기",
  },
] as const;

export const CTA = {
  title: "우리 그룹, 오늘 열어볼까요?",
  body: "가입은 1분이면 충분해요. 그룹 이름 하나면 첫 그룹이 열려요.",
} as const;

export const FOOTER_LINKS = [
  { label: "이용 약관", href: "/terms" },
  { label: "개인정보 처리방침", href: "/privacy" },
] as const;
