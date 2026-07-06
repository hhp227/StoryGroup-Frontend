"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { loginUser, logoutUser, refreshTokens, registerUser, type UserSummary } from "@/lib/api";

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
// 만료 이만큼 전에 미리 갱신한다 — 갱신 도중에도 기존 액세스 토큰이 살아 있어 요청이 안 끊긴다.
const REFRESH_MARGIN_MS = 2 * 60 * 1000;
const CHECK_INTERVAL_MS = 30_000;
// 리프레시 토큰은 1회용(rotation)이라 탭 두 개가 동시에 갱신하면 서로를 무효화한다 —
// 이 키에 갱신 시작 시각을 적어두고, 최근 것이 보이면 다른 탭에 맡긴다(새 토큰은 storage 이벤트로 옴).
const REFRESH_LOCK_KEY = "sg-auth-refresh-lock";
const REFRESH_LOCK_TTL_MS = 10_000;

function tokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const expiry = tokenExpiryMs(token);
  return expiry === null || expiry <= Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ accessToken: null, refreshToken: null });
  const [isReady, setIsReady] = useState(false);
  // 마운트 시점과 주기 검사가 겹쳐도 실제 갱신 요청은 한 번만 나가게 하는 in-flight 캐시.
  const refreshingRef = useRef<Promise<boolean> | null>(null);

  const persist = useCallback((next: AuthState) => {
    setState(next);
    if (next.accessToken) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  // 리프레시 토큰으로 세션 연장. true = 연장됐거나 다른 탭이 처리 중(곧 storage 이벤트로 반영됨).
  const tryRefresh = useCallback(
    (refreshToken: string): Promise<boolean> => {
      if (!refreshingRef.current) {
        refreshingRef.current = (async () => {
          const lockedAt = Number(localStorage.getItem(REFRESH_LOCK_KEY) ?? 0);
          if (Date.now() - lockedAt < REFRESH_LOCK_TTL_MS) return true;
          localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now()));
          try {
            const tokens = await refreshTokens(refreshToken);
            persist({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
            return true;
          } catch {
            return false; // 리프레시 토큰 만료(14일)/폐기/네트워크 — 판단은 호출부가
          } finally {
            localStorage.removeItem(REFRESH_LOCK_KEY);
          }
        })().finally(() => {
          refreshingRef.current = null;
        });
      }
      return refreshingRef.current;
    },
    [persist]
  );

  useEffect(() => {
    // localStorage는 서버 렌더링 시 접근 불가능해 initializer로 못 옮기고 mount 후 1회 동기화한다.
    (async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const stored = JSON.parse(raw) as AuthState;
          if (stored.accessToken && !isTokenExpired(stored.accessToken)) {
            setState(stored);
          } else if (stored.refreshToken) {
            // 액세스 토큰(30분)은 만료됐어도 리프레시 토큰(14일)이 살아 있으면 조용히 세션을 잇는다.
            const extended = await tryRefresh(stored.refreshToken);
            if (!extended) localStorage.removeItem(STORAGE_KEY);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch {
          // 저장된 값이 손상된 경우 로그인 안 된 상태로 시작
        }
      }
      setIsReady(true);
    })();
  }, [tryRefresh]);

  // 세션 사용 중: 만료 2분 전부터 미리 갱신하고, 연장 실패한 채 만료되면 로그아웃 상태로 전환.
  useEffect(() => {
    const { accessToken, refreshToken } = state;
    if (!accessToken) return;
    const check = async () => {
      const expiry = tokenExpiryMs(accessToken);
      if (expiry === null) {
        persist({ accessToken: null, refreshToken: null });
        return;
      }
      if (expiry - Date.now() > REFRESH_MARGIN_MS) return;
      const extended = refreshToken ? await tryRefresh(refreshToken) : false;
      // 아직 만료 전이면 다음 주기에 재시도(일시적 네트워크 오류 허용).
      if (!extended && expiry <= Date.now()) {
        persist({ accessToken: null, refreshToken: null });
      }
    };
    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [state, persist, tryRefresh]);

  // 다른 탭이 갱신(rotation)하거나 로그아웃하면 이 탭도 따라간다.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      if (!e.newValue) {
        setState({ accessToken: null, refreshToken: null });
        return;
      }
      try {
        setState(JSON.parse(e.newValue) as AuthState);
      } catch {
        // 손상된 값은 무시(다음 갱신/마운트에서 정리됨)
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function login(email: string, password: string) {
    const tokens = await loginUser(email, password);
    persist({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  }

  async function register(name: string, email: string, password: string) {
    return registerUser(name, email, password);
  }

  function logout() {
    // 서버 측 리프레시 토큰도 폐기한다(실패해도 로컬 로그아웃은 그대로 진행).
    const { refreshToken } = state;
    if (refreshToken) logoutUser(refreshToken).catch(() => {});
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
