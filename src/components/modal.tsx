"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";

// 공용 모달 - 배경 클릭/ESC로 닫힌다. 패널 스타일은 카드 토큰(linen/radius-card)을 따른다.
export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--sp-4)",
        background: "rgba(0, 0, 0, 0.45)",
      }}
    >
      <div
        style={{
          background: "var(--linen)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--stone-border)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
          padding: "var(--sp-5)",
          width: "100%",
          maxWidth: 420,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
