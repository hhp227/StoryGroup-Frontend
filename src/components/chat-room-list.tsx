"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError, createChatRoom, listChatRooms, type ChatRoom } from "@/lib/api";

export function ChatRoomList({ token, groupId }: { token: string; groupId: number }) {
  const [rooms, setRooms] = useState<ChatRoom[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listChatRooms(token, groupId)
      .then(setRooms)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "채팅방 목록을 불러오지 못했습니다"));
  }, [token, groupId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await createChatRoom(token, groupId, name);
      setRooms((prev) => [...(prev ?? []), created]);
      setName("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "채팅방 생성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <form onSubmit={handleCreate} className="card" style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="room-name">새 채팅방</label>
          <input id="room-name" type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {formError && <p className="field-error">{formError}</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          만들기
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        {loadError && <p className="field-error">{loadError}</p>}
        {rooms === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
        {rooms?.length === 0 && <p style={{ color: "var(--ink-faint)" }}>아직 채팅방이 없습니다.</p>}
        {rooms?.map((room) => (
          <Link key={room.id} href={`/groups/${groupId}/chat/${room.id}`}>
            <div className="card" style={{ fontWeight: 700, cursor: "pointer" }}>{room.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
