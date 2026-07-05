"use client";

import { useState, type FormEvent } from "react";
import { ApiError, createChatRoom, type ChatRoom } from "@/lib/api";

// 그룹당 보통 채팅방이 하나뿐이라 탭은 한 개만 보이는 게 정상이다. 여러 채팅방이
// 필요한 그룹(예: 회사)만 "+"로 서브 채팅방을 늘려 쓰도록 하는 보조 기능.
export function ChatRoomTabs({
  token,
  groupId,
  rooms,
  selectedRoomId,
  onSelect,
  onCreated,
}: {
  token: string;
  groupId: number;
  rooms: ChatRoom[];
  selectedRoomId: number;
  onSelect: (roomId: number) => void;
  onCreated: (room: ChatRoom) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createChatRoom(token, groupId, name);
      onCreated(created);
      setName("");
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "채팅방 생성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <div style={{ display: "flex", gap: "var(--sp-2)", overflowX: "auto" }}>
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelect(room.id)}
            className={`chip ${room.id === selectedRoomId ? "chip-owner" : "chip-member"}`}
            style={{ border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {room.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsCreating((v) => !v)}
          className="chip chip-member"
          style={{ border: "none", cursor: "pointer" }}
        >
          +
        </button>
      </div>
      {isCreating && (
        <form onSubmit={handleCreate} style={{ display: "flex", gap: "var(--sp-2)" }}>
          <input
            type="text"
            required
            maxLength={100}
            placeholder="새 채팅방 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              flex: 1,
              padding: "var(--sp-2)",
              borderRadius: 8,
              border: "1px solid var(--stone-border)",
              background: "var(--linen)",
              color: "var(--ink)",
            }}
          />
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            만들기
          </button>
        </form>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
