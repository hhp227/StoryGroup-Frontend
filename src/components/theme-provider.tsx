"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Mood = "warm" | "vibrant";
export type Mode = "light" | "dark";

interface ThemeContextValue {
  mood: Mood;
  mode: Mode;
  setMood: (mood: Mood) => void;
  setMode: (mode: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var mood = localStorage.getItem('sg-mood') || 'warm';
    var mode = localStorage.getItem('sg-mode');
    if (!mode) {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-mood', mood);
    document.documentElement.setAttribute('data-theme', mode);
  } catch (e) {}
})();
`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mood, setMoodState] = useState<Mood>("warm");
  const [mode, setModeState] = useState<Mode>("light");

  useEffect(() => {
    // 초기값은 THEME_INIT_SCRIPT가 hydration 전에 이미 <html>에 세팅해둔 값을 읽어오는 것뿐이라
    // (localStorage/matchMedia 동기화, 외부 구독 아님) 여기서 한 번 setState하는 게 맞는 패턴이다.
    const root = document.documentElement;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoodState((root.getAttribute("data-mood") as Mood) || "warm");
    setModeState((root.getAttribute("data-theme") as Mode) || "light");
  }, []);

  function setMood(next: Mood) {
    document.documentElement.setAttribute("data-mood", next);
    localStorage.setItem("sg-mood", next);
    setMoodState(next);
  }

  function setMode(next: Mode) {
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sg-mode", next);
    setModeState(next);
  }

  return (
    <ThemeContext.Provider value={{ mood, mode, setMood, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme은 ThemeProvider 안에서만 사용할 수 있습니다");
  return ctx;
}
