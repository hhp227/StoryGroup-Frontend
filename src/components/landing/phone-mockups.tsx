import type { ReactNode } from "react";
import type { ScreenKey, StepVisualKey } from "./content";

// 랜딩용 앱 화면 목업 — KMP 앱(홈 피드·그룹 앨범·채팅방·일정) 모양을 정적으로 그린다.
// 실제 데이터·컴포넌트와 무관한 그림이라 전부 aria-hidden이고, 색은 테마 토큰을 따라 무드/다크에 맞춰 바뀐다.

const ICON_PATHS = {
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  groups:
    "M4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm16 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-8-7c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 8c2.33 0 7 1.17 7 3.5V20H5v-2.5C5 15.17 9.67 14 12 14z",
  people:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  chat: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z",
  person:
    "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  share:
    "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z",
  phone:
    "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  video: "M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z",
  lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  send: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  event:
    "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
} as const;

type IconName = keyof typeof ICON_PATHS;

function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/** 이니셜 아바타 — tone은 토큰 색 4종(lp-av-1~4) 중 하나 */
function Avatar({ name, tone, size }: { name: string; tone: 1 | 2 | 3 | 4; size?: "sm" | "xs" }) {
  return <span className={`lp-av lp-av-${tone}${size ? ` lp-av-${size}` : ""}`}>{name.slice(0, 1)}</span>;
}

/** 사진 자리 — 실제 이미지 없이 토큰 색 그라데이션 타일로 그린다(ph-1~6) */
function Photo({ tone, tall, className }: { tone: 1 | 2 | 3 | 4 | 5 | 6; tall?: boolean; className?: string }) {
  return <span className={`lp-photo lp-ph-${tone}${tall ? " lp-photo-tall" : ""}${className ? ` ${className}` : ""}`} />;
}

/* ===== 폰 프레임 + 앱 공통 크롬 ===== */

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`lp-phone${className ? ` ${className}` : ""}`} aria-hidden>
      <div className="lp-phone-screen">
        <div className="lp-status">
          <span>9:41</span>
          <span className="lp-notch" />
          <span className="lp-status-right">
            <span className="lp-signal" />
            <span className="lp-battery" />
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

const TABS: { icon: IconName; label: string }[] = [
  { icon: "home", label: "홈" },
  { icon: "groups", label: "그룹" },
  { icon: "people", label: "친구" },
  { icon: "chat", label: "채팅" },
  { icon: "person", label: "프로필" },
];

/** 앱 하단 탭바(KMP MainDestination 순서) */
function TabBar({ active }: { active: number }) {
  return (
    <div className="lp-tabbar">
      {TABS.map((tab, i) => (
        <span key={tab.label} className={`lp-tab${i === active ? " lp-tab-active" : ""}`}>
          <Icon name={tab.icon} size={18} />
          {tab.label}
          {tab.label === "채팅" && <span className="lp-tab-badge">3</span>}
        </span>
      ))}
    </div>
  );
}

/* ===== 화면 1: 홈 피드(히어로) ===== */

export function HomeFeedScreen() {
  return (
    <>
      <div className="lp-appbar">
        <span className="lp-appbar-title lp-brand">StoryGroup</span>
        <span className="lp-appbar-actions">
          <span className="lp-bell">
            <Icon name="bell" size={18} />
            <span className="lp-dot" />
          </span>
        </span>
      </div>
      <div className="lp-scroll">
        <div className="lp-post">
          <div className="lp-post-head">
            <Avatar name="지수" tone={1} />
            <span className="lp-post-meta">
              <b>지수</b>
              <span>10분 전 · 대학 동기 모임</span>
            </span>
          </div>
          <p className="lp-post-text">지난 주말 캠핑 사진 올려요 🏕️ 다음엔 다 같이 가자!</p>
          <div className="lp-media-grid">
            <span className="lp-media-col">
              <Photo tone={1} tall />
              <Photo tone={3} />
            </span>
            <span className="lp-media-col">
              <Photo tone={2} />
              <Photo tone={4} tall />
            </span>
          </div>
          <div className="lp-post-actions">
            <span className="lp-liked">
              <Icon name="heart" size={13} /> 좋아요 12
            </span>
            <span>댓글 4</span>
            <span>
              <Icon name="share" size={12} /> 공유
            </span>
          </div>
        </div>
        <div className="lp-post">
          <div className="lp-post-head">
            <Avatar name="민호" tone={3} />
            <span className="lp-post-meta">
              <b>민호</b>
              <span>1시간 전 · 주말 등산 모임</span>
            </span>
            <span className="lp-notice">공지</span>
          </div>
          <p className="lp-post-text">이번 달 정기 산행은 토요일 아침 8시, 도봉산역 1번 출구예요.</p>
        </div>
      </div>
      <TabBar active={0} />
    </>
  );
}

/* ===== 화면 2: 그룹 — 앨범 탭 ===== */

function GroupAlbumScreen() {
  const tones = [1, 2, 3, 4, 5, 6, 2, 1, 5, 3, 6, 4] as const;
  return (
    <>
      <div className="lp-cover">
        <span className="lp-cover-back">
          <Icon name="back" size={16} />
        </span>
        <span className="lp-cover-title">
          <b>대학 동기 모임</b>
          <span>
            <Icon name="lock" size={10} /> 승인제 · 멤버 8명
          </span>
        </span>
      </div>
      <div className="lp-subtabs">
        <span>피드</span>
        <span className="lp-subtab-active">앨범</span>
        <span>일정</span>
        <span>멤버</span>
      </div>
      <div className="lp-scroll">
        <p className="lp-section-label">9월 · 사진 12장</p>
        <div className="lp-album">
          {tones.map((tone, i) => (
            <Photo key={i} tone={tone} className={i === 4 ? "lp-photo-video" : undefined} />
          ))}
        </div>
      </div>
      <TabBar active={1} />
    </>
  );
}

/* ===== 화면 3: 그룹 채팅방 ===== */

function ChatRoomScreen() {
  return (
    <>
      <div className="lp-appbar">
        <span className="lp-appbar-back">
          <Icon name="back" size={16} />
        </span>
        <span className="lp-appbar-title">
          대학 동기 모임 <span className="lp-muted">6</span>
        </span>
        <span className="lp-appbar-actions">
          <Icon name="phone" size={16} />
          <Icon name="video" size={17} />
          <Icon name="menu" size={17} />
        </span>
      </div>
      <div className="lp-chat">
        <span className="lp-chat-day">9월 27일 토요일</span>
        <div className="lp-msg">
          <Avatar name="수아" tone={2} size="sm" />
          <span className="lp-msg-body">
            <span className="lp-msg-name">수아</span>
            <span className="lp-bubble">다음 모임 장소 정했어?</span>
          </span>
        </div>
        <div className="lp-msg">
          <Avatar name="민호" tone={3} size="sm" />
          <span className="lp-msg-body">
            <span className="lp-msg-name">민호</span>
            <span className="lp-bubble">성수 쪽 어때? 여기 괜찮아 보여</span>
            <Photo tone={5} className="lp-bubble-photo" />
          </span>
        </div>
        <div className="lp-msg lp-msg-mine">
          <span className="lp-msg-time">
            <span className="lp-read">2</span>오후 3:12
          </span>
          <span className="lp-bubble lp-bubble-mine">좋다! 일정에 올려둘게 📅</span>
        </div>
        <div className="lp-msg">
          <Avatar name="지수" tone={1} size="sm" />
          <span className="lp-bubble lp-typing">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
      <div className="lp-composer">
        <span className="lp-composer-add">
          <Icon name="add" size={16} />
        </span>
        <span className="lp-composer-input">메시지 입력</span>
        <span className="lp-composer-send">
          <Icon name="send" size={14} />
        </span>
      </div>
    </>
  );
}

/* ===== 화면 4: 일정 ===== */

const MONTH_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const EVENT_DAYS = new Set([6, 13, 27]);

function EventsScreen() {
  return (
    <>
      <div className="lp-appbar">
        <span className="lp-appbar-back">
          <Icon name="back" size={16} />
        </span>
        <span className="lp-appbar-title">일정</span>
        <span className="lp-appbar-actions">
          <Icon name="add" size={18} />
        </span>
      </div>
      <div className="lp-scroll">
        <div className="lp-cal">
          <span className="lp-cal-month">2026년 9월</span>
          <div className="lp-cal-grid">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <span key={d} className="lp-cal-dow">
                {d}
              </span>
            ))}
            {/* 2026년 9월 1일은 화요일 — 앞 2칸 비움 */}
            <span />
            <span />
            {MONTH_DAYS.map((day) => (
              <span
                key={day}
                className={`lp-cal-day${day === 27 ? " lp-cal-today" : ""}${EVENT_DAYS.has(day) ? " lp-cal-has" : ""}`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
        <div className="lp-event">
          <span className="lp-event-date">
            <b>27</b>
            <span>토</span>
          </span>
          <span className="lp-event-body">
            <b>가을 정기 모임</b>
            <span>오후 7:00 · 성수동</span>
            <span className="lp-event-people">
              <Avatar name="지수" tone={1} size="xs" />
              <Avatar name="민호" tone={3} size="xs" />
              <Avatar name="수아" tone={2} size="xs" />
              <span>참석 5 · 미정 2</span>
            </span>
          </span>
        </div>
        <div className="lp-rsvp">
          <span className="lp-rsvp-on">
            <Icon name="check" size={12} /> 참석
          </span>
          <span>미정</span>
          <span>불참</span>
        </div>
      </div>
      <TabBar active={1} />
    </>
  );
}

const SCREENS: Record<ScreenKey, () => ReactNode> = {
  group: GroupAlbumScreen,
  chat: ChatRoomScreen,
  events: EventsScreen,
};

export function FeatureScreen({ screen }: { screen: ScreenKey }) {
  const Screen = SCREENS[screen];
  return (
    <PhoneFrame>
      <Screen />
    </PhoneFrame>
  );
}

/* ===== 히어로 stage — 원 배경 + 홈 피드 폰 + 플로팅 칩 ===== */

export function HeroStage() {
  return (
    <div className="lp-stage" aria-hidden>
      <span className="lp-stage-circle" />
      <PhoneFrame className="lp-stage-phone">
        <HomeFeedScreen />
      </PhoneFrame>

      <div className="lp-chip lp-chip-lock">
        <span className="lp-chip-icon">
          <Icon name="lock" size={14} />
        </span>
        <span>
          <b>초대받은 사람만</b>
          <small>승인제 그룹</small>
        </span>
      </div>
      <div className="lp-chip lp-chip-comment">
        <Avatar name="수아" tone={2} size="sm" />
        <span>
          <b>수아님의 새 댓글</b>
          <small>사진 너무 좋다 😆</small>
        </span>
      </div>
      <div className="lp-chip lp-chip-event">
        <span className="lp-chip-icon lp-chip-icon-2">
          <Icon name="event" size={14} />
        </span>
        <span>
          <b>토 오후 7:00</b>
          <small>참석 5명</small>
        </span>
      </div>
      <div className="lp-chip lp-chip-call">
        <span className="lp-chip-icon lp-chip-icon-solid">
          <Icon name="video" size={14} />
        </span>
        <span>
          <b>페이스톡 진행 중</b>
          <small>대학 동기 모임 · 3명</small>
        </span>
      </div>
    </div>
  );
}

/* ===== HOW 단계 그림 ===== */

function CreateVisual() {
  return (
    <div className="lp-step-card">
      <span className="lp-step-label">그룹 이름</span>
      <span className="lp-step-input">대학 동기 모임</span>
      <span className="lp-step-label">가입 방식</span>
      <span className="lp-step-seg">
        <span>자동 가입</span>
        <span className="lp-step-seg-on">승인제</span>
      </span>
      <span className="lp-step-btn">그룹 만들기</span>
    </div>
  );
}

function InviteVisual() {
  const rows = [
    { name: "민호", tone: 3, done: true },
    { name: "수아", tone: 2, done: false },
    { name: "하준", tone: 4, done: false },
  ] as const;
  return (
    <div className="lp-step-card">
      <span className="lp-step-label">가입 신청 3건</span>
      {rows.map((r) => (
        <span key={r.name} className="lp-step-row">
          <Avatar name={r.name} tone={r.tone} size="sm" />
          <b>{r.name}</b>
          {r.done ? (
            <span className="lp-step-done">
              <Icon name="check" size={12} /> 수락됨
            </span>
          ) : (
            <span className="lp-step-accept">수락</span>
          )}
        </span>
      ))}
    </div>
  );
}

function ShareVisual() {
  const items: { icon: IconName; label: string }[] = [
    { icon: "home", label: "피드" },
    { icon: "groups", label: "앨범" },
    { icon: "event", label: "일정" },
    { icon: "chat", label: "채팅" },
  ];
  return (
    <div className="lp-step-card lp-step-tiles">
      {items.map((item) => (
        <span key={item.label} className="lp-step-tile">
          <Icon name={item.icon} size={22} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export const STEP_VISUALS: Record<StepVisualKey, ReactNode> = {
  create: <CreateVisual />,
  invite: <InviteVisual />,
  share: <ShareVisual />,
};
