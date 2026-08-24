"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  ApiError,
  cancelRsvp,
  createEvent,
  deleteEvent,
  getEvent,
  getGroup,
  getUserIdFromToken,
  listEvents,
  rsvpEvent,
  type EventAttendee,
  type Group,
  type GroupEvent,
  type RsvpStatus,
} from "@/lib/api";
import { canModerate } from "@/lib/roles";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 로컬 타임존 기준 YYYY-MM-DD. 캘린더 셀 귀속/선택 키로 쓴다(표시도 저장도 아닌 UI 전용 키).
function ymd(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

const RSVP_OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: "GOING", label: "참석" },
  { status: "MAYBE", label: "미정" },
  { status: "NOT_GOING", label: "불참" },
];

export default function GroupEventsPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  // monthAnchor는 항상 해당 월 1일 00:00(로컬). 범위 조회는 [월초, 다음달 초).
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<GroupEvent[] | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => ymd(new Date()));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const myUserId = accessToken ? getUserIdFromToken(accessToken) : null;
  const isModerator = canModerate(group?.myRole);

  const loadMonth = useCallback(
    (token: string, anchor: Date) => {
      const from = anchor.toISOString();
      const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1).toISOString();
      return listEvents(token, groupId, from, to)
        .then(setEvents)
        .catch((err) => setLoadError(err instanceof ApiError ? err.message : "일정을 불러오지 못했습니다"));
    },
    [groupId]
  );

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    getGroup(accessToken, groupId)
      .then(setGroup)
      .catch(() => {}); // 권한 뱃지용 부가 정보라 실패해도 캘린더는 그대로 보여준다
    loadMonth(accessToken, monthAnchor);
  }, [isReady, accessToken, groupId, router, monthAnchor, loadMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, GroupEvent[]>();
    (events ?? []).forEach((event) => {
      const key = ymd(new Date(event.startsAt));
      map.set(key, [...(map.get(key) ?? []), event]);
    });
    return map;
  }, [events]);

  if (!isReady || !accessToken) return null;

  function moveMonth(delta: number) {
    const next = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + delta, 1);
    setEvents(null);
    setMonthAnchor(next);
    // 이동한 달의 1일을 선택해 아래 목록이 빈 날짜(이전 달 선택 잔상)를 가리키지 않게 한다.
    setSelectedDay(ymd(next));
  }

  function goToday() {
    const now = new Date();
    if (now.getFullYear() !== monthAnchor.getFullYear() || now.getMonth() !== monthAnchor.getMonth()) {
      setEvents(null);
      setMonthAnchor(new Date(now.getFullYear(), now.getMonth(), 1));
    }
    setSelectedDay(ymd(now));
  }

  // 앞쪽 빈 칸(월 시작 요일) + 해당 월 날짜들.
  const leadingBlanks = monthAnchor.getDay();
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  const todayKey = ymd(new Date());
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-3)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>일정</h1>
        {group && <span style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>{group.name}</span>}
        <Link href={`/groups/${groupId}`} style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.85rem", fontWeight: 600 }}>
          그룹으로 →
        </Link>
      </div>

      {loadError && <p className="field-error">{loadError}</p>}

      <div className="card" style={{ padding: "var(--sp-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-3)" }}>
          <button type="button" className="btn btn-ghost" onClick={() => moveMonth(-1)} aria-label="이전 달">
            ←
          </button>
          <span style={{ fontWeight: 700, fontSize: "1.05rem", minWidth: 110, textAlign: "center" }}>
            {monthAnchor.getFullYear()}년 {monthAnchor.getMonth() + 1}월
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => moveMonth(1)} aria-label="다음 달">
            →
          </button>
          <button type="button" className="btn btn-ghost" onClick={goToday} style={{ fontSize: "0.82rem" }}>
            오늘
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateForm((v) => !v)}
            style={{ marginLeft: "auto" }}
          >
            {showCreateForm ? "닫기" : "일정 만들기"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {DAY_LABELS.map((label, i) => (
            <span
              key={label}
              style={{
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "4px 0",
                color: i === 0 ? "var(--rust)" : i === 6 ? "var(--accent)" : "var(--ink-faint)",
              }}
            >
              {label}
            </span>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = ymd(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), day));
            const dayEvents = eventsByDay.get(key) ?? [];
            const isSelected = key === selectedDay;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "6px 0 8px",
                  minHeight: 52,
                  borderRadius: 8,
                  border: isToday ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                  background: isSelected ? "var(--accent)" : "none",
                  color: isSelected ? "var(--on-accent)" : "var(--ink)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.9rem",
                }}
              >
                <span style={{ fontWeight: isToday || isSelected ? 700 : 400 }}>{day}</span>
                {dayEvents.length > 0 && (
                  <span style={{ display: "flex", gap: 2 }}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: isSelected ? "var(--on-accent)" : "var(--accent)",
                        }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showCreateForm && (
        <CreateEventForm
          token={accessToken}
          groupId={groupId}
          defaultDate={selectedDay}
          onCreated={(event) => {
            setShowCreateForm(false);
            const key = ymd(new Date(event.startsAt));
            setSelectedDay(key);
            // 만든 일정이 보고 있는 달이면 목록에 반영, 다른 달이면 그 달로 이동(이동이 재조회를 트리거).
            const anchor = new Date(new Date(event.startsAt).getFullYear(), new Date(event.startsAt).getMonth(), 1);
            if (anchor.getTime() === monthAnchor.getTime()) {
              setEvents((prev) => [...(prev ?? []), event].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
            } else {
              setEvents(null);
              setMonthAnchor(anchor);
            }
          }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
          {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
        </span>
        {events === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
        {events !== null && selectedEvents.length === 0 && (
          <p style={{ color: "var(--ink-faint)", fontSize: "0.9rem" }}>이 날짜에는 일정이 없습니다.</p>
        )}
        {selectedEvents.map((event) => (
          <EventCard
            key={event.id}
            token={accessToken}
            event={event}
            myUserId={myUserId}
            isModerator={isModerator}
            onChange={(updated) => setEvents((prev) => prev?.map((e) => (e.id === updated.id ? updated : e)) ?? null)}
            onDeleted={(id) => setEvents((prev) => prev?.filter((e) => e.id !== id) ?? null)}
            onError={setLoadError}
          />
        ))}
      </div>
    </div>
  );
}

function CreateEventForm({
  token,
  groupId,
  defaultDate,
  onCreated,
}: {
  token: string;
  groupId: number;
  defaultDate: string;
  onCreated: (event: GroupEvent) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const startsAt = new Date(`${date}T${startTime}`);
    const endsAt = endTime ? new Date(`${date}T${endTime}`) : null;
    if (endsAt && endsAt < startsAt) {
      setError("종료 시각은 시작 시각보다 빠를 수 없습니다");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createEvent(token, groupId, {
        title,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt ? endsAt.toISOString() : undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "일정을 만들지 못했습니다");
      setIsSubmitting(false);
    }
  }

  const inputStyle = {
    fontFamily: "var(--font-body)",
    fontSize: "0.95rem",
    padding: "var(--sp-2) var(--sp-3)",
    borderRadius: 10,
    border: "1px solid var(--stone-border)",
    background: "var(--linen)",
    color: "var(--ink)",
  } as const;

  return (
    <form className="card" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", padding: "var(--sp-4)" }}>
      <span style={{ fontWeight: 700 }}>새 일정</span>
      <input
        type="text"
        required
        maxLength={100}
        placeholder="일정 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
      />
      <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
        <span style={{ alignSelf: "center", color: "var(--ink-faint)", fontSize: "0.85rem" }}>~</span>
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
      </div>
      <input
        type="text"
        maxLength={200}
        placeholder="장소 (선택)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={inputStyle}
      />
      <textarea
        rows={3}
        maxLength={2000}
        placeholder="설명 (선택)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      {error && <p className="field-error">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ alignSelf: "flex-end" }}>
        등록
      </button>
    </form>
  );
}

function EventCard({
  token,
  event,
  myUserId,
  isModerator,
  onChange,
  onDeleted,
  onError,
}: {
  token: string;
  event: GroupEvent;
  myUserId: number | null;
  isModerator: boolean;
  onChange: (event: GroupEvent) => void;
  onDeleted: (id: number) => void;
  onError: (message: string) => void;
}) {
  const [attendees, setAttendees] = useState<EventAttendee[] | null>(null);
  const [showAttendees, setShowAttendees] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function handleRsvp(status: RsvpStatus) {
    setIsBusy(true);
    try {
      // 이미 선택한 상태를 다시 누르면 응답 취소.
      const updated = event.myRsvp === status
        ? await cancelRsvp(token, event.groupId, event.id)
        : await rsvpEvent(token, event.groupId, event.id, status);
      onChange(updated);
      setAttendees(null); // 명단이 바뀌었으니 펼쳐볼 때 다시 불러온다
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "참석 응답에 실패했습니다");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 일정을 삭제할까요?")) return;
    setIsBusy(true);
    try {
      await deleteEvent(token, event.groupId, event.id);
      onDeleted(event.id);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "일정 삭제에 실패했습니다");
      setIsBusy(false);
    }
  }

  async function toggleAttendees() {
    if (showAttendees) {
      setShowAttendees(false);
      return;
    }
    setShowAttendees(true);
    if (attendees === null) {
      try {
        const detail = await getEvent(token, event.groupId, event.id);
        setAttendees(detail.attendees);
      } catch {
        setAttendees([]); // 부가 정보라 실패 시 조용히 빈 목록
      }
    }
  }

  const rsvpLabel = (status: RsvpStatus) => RSVP_OPTIONS.find((o) => o.status === status)?.label;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", padding: "var(--sp-4)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-3)" }}>
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>{event.title}</span>
        <span style={{ color: "var(--ink-faint)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
          {formatTime(event.startsAt)}
          {event.endsAt && ` ~ ${formatTime(event.endsAt)}`}
        </span>
        {(event.userId === myUserId || isModerator) && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isBusy}
            style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--rust)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            삭제
          </button>
        )}
      </div>
      {event.location && (
        <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>📍 {event.location}</span>
      )}
      {event.description && (
        <p style={{ fontSize: "0.9rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{event.description}</p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", flexWrap: "wrap" }}>
        {RSVP_OPTIONS.map(({ status, label }) => (
          <button
            key={status}
            type="button"
            disabled={isBusy}
            onClick={() => handleRsvp(status)}
            className={event.myRsvp === status ? "btn btn-primary" : "btn btn-secondary"}
            style={{ padding: "4px 12px", fontSize: "0.82rem" }}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleAttendees}
          style={{ marginLeft: "auto", fontSize: "0.82rem", color: "var(--ink-soft)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          참석 {event.goingCount} · 미정 {event.maybeCount} · 불참 {event.notGoingCount} {showAttendees ? "▲" : "▼"}
        </button>
      </div>
      {showAttendees && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", borderTop: "1px solid var(--stone-border)", paddingTop: "var(--sp-3)" }}>
          {attendees === null && <span style={{ fontSize: "0.82rem", color: "var(--ink-faint)" }}>불러오는 중...</span>}
          {attendees?.length === 0 && <span style={{ fontSize: "0.82rem", color: "var(--ink-faint)" }}>아직 응답한 멤버가 없습니다.</span>}
          {attendees?.map((attendee) => (
            <div key={attendee.userId} style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <div className="avatar sm">{attendee.name.slice(0, 1)}</div>
              <span style={{ fontSize: "0.85rem" }}>{attendee.name}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>{rsvpLabel(attendee.status)}</span>
            </div>
          ))}
        </div>
      )}
      <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>{event.authorName}님이 만든 일정</span>
    </div>
  );
}
