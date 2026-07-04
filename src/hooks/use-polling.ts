"use client";

import { useEffect, useRef, useState } from "react";

// 백엔드에 WebSocket/STOMP가 없는 리소스(메시지, 회의 참가자 등)를 REST 폴링으로 준-실시간
// 갱신하는 공용 훅. 성능 고려 두 가지: (1) 응답이 끝난 뒤에야 다음 폴링을 예약하는 재귀
// setTimeout이라 느린 요청이 겹쳐 쌓이지 않음, (2) 탭이 백그라운드면(Page Visibility API)
// 네트워크 요청 자체를 건너뜀.
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number,
  deps: unknown[],
  merge?: (prev: T | null, next: T) => T
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  // fetchFn/merge는 매 렌더 새 클로저지만 폴링 루프 자체를 재시작할 필요는 없어 ref로만 최신화.
  // ref를 렌더 중에 직접 대입하면 안 되므로(react-hooks/refs) effect에서 매 렌더 후 갱신한다.
  const fetchRef = useRef(fetchFn);
  const mergeRef = useRef(merge);
  useEffect(() => {
    fetchRef.current = fetchFn;
    mergeRef.current = merge;
  });

  useEffect(() => {
    stoppedRef.current = false;

    async function poll() {
      if (stoppedRef.current) return;
      if (document.visibilityState === "visible") {
        try {
          const result = await fetchRef.current();
          if (!stoppedRef.current) {
            setData((prev) => (mergeRef.current ? mergeRef.current(prev, result) : result));
            setError(null);
          }
        } catch (err) {
          if (!stoppedRef.current) {
            setError(err instanceof Error ? err.message : "불러오지 못했습니다");
          }
        }
      }
      if (!stoppedRef.current) {
        timeoutRef.current = setTimeout(poll, intervalMs);
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        poll();
      }
    }

    poll();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stoppedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { data, error, setData };
}
