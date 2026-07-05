"use client";

import { useCallback, useState } from "react";
import { ApiError, createMeeting, listMeetings, type Meeting } from "@/lib/api";
import { usePolling } from "@/hooks/use-polling";
import { MeetingDetail } from "./meeting-detail";

// 채팅방마다 화상회의 목록을 따로 안 두고, 그룹의 가장 최근 회의가 진행중이면 그게 곧
// 이 채팅방의 화상회의 세션이다(그룹당 기본 채팅방이 하나뿐이라 채팅=회의 세션으로 취급 가능).
export function GroupMeetingSession({ token, groupId }: { token: string; groupId: number }) {
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const fetchLatest = useCallback(() => listMeetings(token, groupId, 0, 1), [token, groupId]);
  const { data: meetings, error, setData } = usePolling<Meeting[]>(fetchLatest, 6000, [token, groupId]);

  const activeMeeting = meetings && meetings.length > 0 && meetings[0].endedAt == null ? meetings[0] : null;

  async function handleStart() {
    setIsStarting(true);
    setStartError(null);
    try {
      const created = await createMeeting(token, groupId);
      setData([created]);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : "화상회의 시작에 실패했습니다");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <span style={{ fontWeight: 700 }}>화상회의</span>
      {error && <p className="field-error">{error}</p>}
      {startError && <p className="field-error">{startError}</p>}
      {meetings === null && !error && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {meetings && !activeMeeting && (
        <button className="btn btn-primary" type="button" onClick={handleStart} disabled={isStarting} style={{ alignSelf: "flex-start" }}>
          {isStarting ? "시작하는 중..." : "화상회의 시작"}
        </button>
      )}
      {activeMeeting && <MeetingDetail token={token} groupId={groupId} meetingId={activeMeeting.id} />}
    </div>
  );
}
