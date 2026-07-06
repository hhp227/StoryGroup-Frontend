"use client";

import { useCallback, useState } from "react";
import {
  ApiError,
  endMeeting,
  getMeeting,
  getUserIdFromToken,
  joinMeeting,
  leaveMeeting,
  listParticipants,
} from "@/lib/api";
import { usePolling } from "@/hooks/use-polling";
import { useRtcSession } from "@/hooks/use-rtc-session";
import { VideoCallPanel } from "@/components/video-call-panel";

function mergeById<T extends { userId: number; leftAt: string | null }>(prev: T[] | null, next: T[]): T[] {
  // 참가자는 입장/퇴장마다 새 행이 쌓이는 세션 로그라 userId+leftAt 조합을 키로 잡아야
  // "같은 사람이 나갔다 다시 들어온" 두 행을 다른 항목으로 유지하면서도 참조는 안정적으로 재사용한다.
  if (!prev) return next;
  const key = (p: T) => `${p.userId}-${p.leftAt ?? "active"}`;
  const prevByKey = new Map(prev.map((p) => [key(p), p]));
  return next.map((p) => prevByKey.get(key(p)) ?? p);
}

export function MeetingDetail({ token, groupId, meetingId }: { token: string; groupId: number; meetingId: number }) {
  const myUserId = getUserIdFromToken(token);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  // REST 참가 기록(meeting_participants)과 별개인 "이 탭에서 통화 중" 상태 — 느슨 결합(설계 문서 D8).
  const [inCall, setInCall] = useState(false);

  const fetchMeeting = useCallback(() => getMeeting(token, groupId, meetingId), [token, groupId, meetingId]);
  const { data: meeting, error: meetingError, setData: setMeeting } = usePolling(fetchMeeting, 6000, [token, groupId, meetingId]);

  const fetchParticipants = useCallback(() => listParticipants(token, groupId, meetingId), [token, groupId, meetingId]);
  const { data: participants, error: participantsError } = usePolling(
    fetchParticipants,
    6000,
    [token, groupId, meetingId],
    mergeById
  );

  const iAmActive = participants?.some((p) => p.userId === myUserId && p.leftAt === null) ?? false;
  const isHost = meeting?.hostId === myUserId;
  const isEnded = meeting?.endedAt !== null && meeting?.endedAt !== undefined;

  // 회의가 끝나면(호스트 종료를 폴링으로 감지한 경우 포함) 통화도 함께 내려간다 — effect 없이 파생값으로.
  const callActive = inCall && !isEnded;
  const session = useRtcSession(token, "meetings", meetingId, callActive);

  async function handleJoin() {
    setIsActing(true);
    setActionError(null);
    try {
      // REST 참가는 멱등(이미 참가 중이면 no-op) — 참가 기록을 남긴 뒤 이 탭에서 통화를 시작한다.
      await joinMeeting(token, groupId, meetingId);
      setInCall(true);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "참가에 실패했습니다");
    } finally {
      setIsActing(false);
    }
  }

  async function handleLeave() {
    setInCall(false);
    setIsActing(true);
    setActionError(null);
    try {
      await leaveMeeting(token, groupId, meetingId);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "퇴장에 실패했습니다");
    } finally {
      setIsActing(false);
    }
  }

  async function handleEnd() {
    setInCall(false);
    setIsActing(true);
    setActionError(null);
    try {
      await endMeeting(token, groupId, meetingId);
      setMeeting((prev) => (prev ? { ...prev, endedAt: new Date().toISOString() } : prev));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "종료에 실패했습니다");
    } finally {
      setIsActing(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        {meetingError && <p className="field-error">{meetingError}</p>}
        {meeting && (
          <span className={`chip ${isEnded ? "chip-member" : "chip-owner"}`} style={{ alignSelf: "flex-start" }}>
            {isEnded ? "종료됨" : "진행중"}
          </span>
        )}
        {actionError && <p className="field-error">{actionError}</p>}

        {callActive ? (
          <VideoCallPanel session={session} onHangUp={handleLeave} />
        ) : (
          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            {!isEnded && (
              <button className="btn btn-primary" type="button" onClick={handleJoin} disabled={isActing}>
                통화 참가
              </button>
            )}
            {/* 이전 세션의 참가 기록만 남아 있는 경우(새로고침 등) 기록 정리를 위해 남겨둔다. */}
            {!isEnded && iAmActive && (
              <button className="btn btn-secondary" type="button" onClick={handleLeave} disabled={isActing}>
                나가기
              </button>
            )}
            {!isEnded && isHost && (
              <button className="btn btn-danger" type="button" onClick={handleEnd} disabled={isActing}>
                회의 종료
              </button>
            )}
          </div>
        )}

        {callActive && !isEnded && isHost && (
          <button className="btn btn-danger" type="button" onClick={handleEnd} disabled={isActing} style={{ alignSelf: "flex-start" }}>
            회의 종료
          </button>
        )}
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <span style={{ fontWeight: 700 }}>참가자</span>
        {participantsError && <p className="field-error">{participantsError}</p>}
        {participants?.filter((p) => p.leftAt === null).length === 0 && (
          <p style={{ color: "var(--ink-faint)", fontSize: "0.9rem" }}>지금 참가 중인 사람이 없습니다.</p>
        )}
        {participants
          ?.filter((p) => p.leftAt === null)
          .map((p) => (
            <div key={`${p.userId}-${p.joinedAt}`} style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
              <div className="avatar sm">{p.authorName.slice(0, 1)}</div>
              <span style={{ fontSize: "0.9rem" }}>{p.authorName}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
