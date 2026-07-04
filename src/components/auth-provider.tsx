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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ accessToken: null, refreshToken: null });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // localStorage는 서버 렌더링 시 접근 불가능해 initializer로 못 옮기고 mount 후 1회 동기화한다.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(JSON.parse(raw));
      } catch {
        // 저장된 값이 손상된 경우 로그인 안 된 상태로 시작
      }
    }
    setIsReady(true);
  }, []);

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
