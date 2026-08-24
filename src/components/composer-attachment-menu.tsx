"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 이모지 팔레트 — 모바일(Compose CHAT_EMOJIS / iOS chatEmojis)과 1:1 동일한 목록·순서.
// 세 플랫폼이 같은 자리에 같은 이모지를 두어야 위치를 기억으로 찾을 수 있다.
const CHAT_EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "😘", "😎", "🤔",
  "😅", "😭", "😢", "😡", "😱", "🥳", "😴", "🤗",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "👌",
  "❤️", "💕", "💖", "💔", "🔥", "⭐", "✨", "🎉",
  "🎂", "🎁", "🌸", "🌈", "☀️", "🌙", "☕", "🍺",
  "🍕", "🍗", "🍜", "🍰", "⚽", "🏀", "🎮", "🎵",
  "🚗", "✈️", "🏠", "💻", "📱", "💤", "💯", "🆗",
];

// 모바일 이모지 패널과 같은 열 수. 화살표 이동 계산도 이 값을 쓴다.
const EMOJI_COLUMNS = 8;

type Page = "menu" | "emoji";

export interface ComposerAttachmentMenuProps {
  disabled?: boolean;
  onPickImage: () => void;
  onPickFile: () => void;
  onPickEmoji: (emoji: string) => void;
  // 통화를 걸 수 있는 화면(그룹 채팅·DM)에서만 넘어온다 — 없으면 보이스톡/페이스톡 항목을 숨긴다.
  onStartCall?: (video: boolean) => void;
}

/**
 * 입력창 왼쪽 + 버튼이 여는 첨부 패널 — 모바일 첨부 패널(카톡 미러)의 웹 대응.
 * 사진/파일은 고르면 패널이 닫히고, 이모지는 패널 안에서 페이지가 바뀌며 연속 선택할 수 있다.
 */
export function ComposerAttachmentMenu({
  disabled = false,
  onPickImage,
  onPickFile,
  onPickEmoji,
  onStartCall,
}: ComposerAttachmentMenuProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page>("menu");
  // 이모지 격자의 로빙 탭인덱스 — 팔레트가 56칸이라 전부 탭 정거장으로 두면 입력창까지 가는 길이 너무 멀다.
  const [emojiIndex, setEmojiIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocusTrigger = true) => {
    setOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  }, []);

  // 전송 중에는 첨부를 고를 수 없으니 열려 있던 패널도 접힌 것으로 친다.
  // 상태를 되돌리지 않고 렌더에서 파생해야 전송이 끝났을 때 원래 자리로 돌아온다.
  const isOpen = open && !disabled;

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  // 열릴 때와 페이지가 바뀔 때 패널 안 첫 버튼으로 포커스를 옮긴다(키보드로도 바로 고를 수 있게).
  useEffect(() => {
    if (isOpen) panelRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [isOpen, page]);

  function toggle() {
    if (isOpen) {
      close();
      return;
    }
    // 새로 열 때는 항상 첨부 목록부터(모바일 미러) — 이모지 페이지가 기억되면
    // 다음에 파일을 보내려는 사람이 매번 되돌아와야 한다.
    setPage("menu");
    setEmojiIndex(0);
    setOpen(true);
  }

  function pickAndClose(run: () => void) {
    run();
    close(false); // 파일 선택 대화상자로 포커스가 넘어가므로 + 버튼을 다시 잡지 않는다
  }

  function handleEmojiKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: EMOJI_COLUMNS,
      ArrowUp: -EMOJI_COLUMNS,
    };
    let next: number | null = null;
    if (e.key in moves) next = emojiIndex + moves[e.key];
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = CHAT_EMOJIS.length - 1;
    if (next == null || next < 0 || next >= CHAT_EMOJIS.length) return;
    e.preventDefault();
    setEmojiIndex(next);
    panelRef.current?.querySelectorAll<HTMLElement>("[data-emoji]")[next]?.focus();
  }

  return (
    <div className="composer-attach" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`composer-attach-trigger ${isOpen ? "is-open" : ""}`}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={isOpen ? "첨부 메뉴 닫기" : "첨부 메뉴 열기"}
      >
        {/* 열리면 그대로 회전해 닫기(×)가 된다 — 같은 버튼이 같은 자리에서 상태만 바꾼다 */}
        <span aria-hidden>+</span>
      </button>

      {isOpen && (
        <div className="composer-attach-panel" ref={panelRef} role="dialog" aria-label="첨부">
          {page === "menu" ? (
            /* 항목 순서는 모바일 첨부 패널과 같다 — 같은 자리에서 같은 것을 찾게 한다 */
            <div className="composer-attach-grid">
              <button type="button" className="composer-attach-item" onClick={() => setPage("emoji")}>
                <span className="composer-attach-icon" aria-hidden>😊</span>
                이모지
              </button>
              <button type="button" className="composer-attach-item" onClick={() => pickAndClose(onPickImage)}>
                <span className="composer-attach-icon" aria-hidden>🖼️</span>
                사진
              </button>
              <button type="button" className="composer-attach-item" onClick={() => pickAndClose(onPickFile)}>
                <span className="composer-attach-icon" aria-hidden>📎</span>
                파일
              </button>
              {onStartCall && (
                <>
                  {/* 통화는 파일 대화상자가 뜨지 않으니 포커스를 + 버튼으로 되돌린다 */}
                  <button
                    type="button"
                    className="composer-attach-item"
                    onClick={() => {
                      onStartCall(false);
                      close();
                    }}
                  >
                    <span className="composer-attach-icon" aria-hidden>📞</span>
                    보이스톡
                  </button>
                  <button
                    type="button"
                    className="composer-attach-item"
                    onClick={() => {
                      onStartCall(true);
                      close();
                    }}
                  >
                    <span className="composer-attach-icon" aria-hidden>🎥</span>
                    페이스톡
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <button type="button" className="composer-attach-back" onClick={() => setPage("menu")}>
                ← 첨부
              </button>
              {/* 고른 이모지는 입력창 끝에 붙고 패널은 열린 채로 둔다 — 연달아 고르는 게 기본 사용법이다. */}
              <div className="composer-emoji-grid" role="group" aria-label="이모지" onKeyDown={handleEmojiKeyDown}>
                {CHAT_EMOJIS.map((emoji, i) => (
                  <button
                    key={emoji}
                    type="button"
                    data-emoji
                    tabIndex={i === emojiIndex ? 0 : -1}
                    className="composer-emoji"
                    onClick={() => {
                      setEmojiIndex(i);
                      onPickEmoji(emoji);
                    }}
                    aria-label={`이모지 ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
