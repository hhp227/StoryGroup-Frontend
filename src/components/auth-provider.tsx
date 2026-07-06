"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loginUser, registerUser, type UserSummary } from "@/lib/api";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextValue extends AuthState {
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<UserSummary>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "sg-auth";

// exp(초 단위) 기준 만료 여부. 파싱이 안 되는 토큰은 만료로 취급해 로그아웃시킨다.
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ accessToken: null, refreshToken: null });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // localStorage는 서버 렌더링 시 접근 불가능해 initializer로 못 옮기고 mount 후 1회 동기화한다.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as AuthState;
        // 만료된 토큰을 복원하면 UI만 로그인 상태(프로필 버튼 등)가 되고 API는 전부 실패한다 —
        // 복원 시점에 만료 검사해서 그런 어긋남을 만들지 않는다.
        if (stored.accessToken && isTokenExpired(stored.accessToken)) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setState(stored);
        }
      } catch {
        // 저장된 값이 손상된 경우 로그인 안 된 상태로 시작
      }
    }
    setIsReady(true);
  }, []);

  // 세션 사용 중 만료되면(액세스 토큰 30분) 로그아웃 상태로 전환한다.
  useEffect(() => {
    if (!state.accessToken) return;
    const timer = setInterval(() => {
      if (state.accessToken && isTokenExpired(state.accessToken)) {
        setState({ accessToken: null, refreshToken: null });
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 30_000);
    return () => clearInterval(timer);
  }, [state.accessToken]);

  function persist(next: AuthState) {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function login(email: string, password: string) {
    const tokens = await loginUser(email, password);
    persist({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  }

  async function register(name: string, email: string, password: string) {
    return registerUser(name, email, password);
  }

  function logout() {
    persist({ accessToken: null, refreshToken: null });
  }

  return (
    <AuthContext.Provider value={{ ...state, isReady, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있습니다");
  return ctx;
}
