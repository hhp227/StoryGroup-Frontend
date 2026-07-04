"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, createMeeting, listMeetings, type Meeting } from "@/lib/api";

export function MeetingList({ token, groupId }: { token: string; groupId: number }) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    listMeetings(token, groupId)
      .then(setMeetings)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "회의 목록을 불러오지 못했습니다"));
  }, [token, groupId]);

  async function handleStart() {
    setIsStarting(true);
    setLoadError(null);
    try {
      const created = await createMeeting(token, groupId);
      router.push(`/groups/${groupId}/meetings/${created.id}`);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "회의 시작에 실패했습니다");
      setIsStarting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <button className="btn btn-primary" type="button" onClick={handleStart} disabled={isStarting} style={{ alignSelf: "flex-start" }}>
        {isStarting ? "시작하는 중..." : "새 회의 시작"}
      </button>

      {loadError && <p className="field-error">{loadError}</p>}
      {meetings === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {meetings?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>진행된 회의가 없습니다.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        {meetings?.map((meeting) => (
          <Link key={meeting.id} href={`/groups/${groupId}/meetings/${meeting.id}`}>
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontWeight: 700 }}>{new Date(meeting.startedAt).toLocaleString("ko-KR")} 시작</span>
              <span className={`chip ${meeting.endedAt ? "chip-member" : "chip-owner"}`}>
                {meeting.endedAt ? "종료됨" : "진행중"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
