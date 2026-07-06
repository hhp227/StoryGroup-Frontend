"use client";

import { useEffect, useRef } from "react";
import type { RtcSession } from "@/hooks/use-rtc-session";

// srcObject는 attribute가 아니라서 ref로 넣어야 한다. 스트림 교체(재연결) 시에도 동작.
function VideoTile({
  stream,
  label,
  isLocal = false,
}: {
  stream: MediaStream | null;
  label: string;
  isLocal?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#1a1a1a", aspectRatio: "4 / 3" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        // 내 소리를 스피커로 되듣지 않도록 로컬 타일만 음소거.
        muted={isLocal}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // 거울 모드는 내 화면만 — 상대에게는 원본이 간다.
          transform: isLocal ? "scaleX(-1)" : undefined,
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 8,
          bottom: 8,
          padding: "2px 8px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: "0.72rem",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// 그룹 회의와 DM 통화가 공유하는 통화 UI — 세션 상태(useRtcSession)를 받아 그리기만 한다.
export function VideoCallPanel({ session, onHangUp }: { session: RtcSession; onHangUp: () => void }) {
  const { status, error, localStream, remotePeers, micOn, camOn, hasVideo, toggleMic, toggleCam } = session;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {error && <p className="field-error">{error}</p>}
      {status === "connecting" && (
        <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)", margin: 0 }}>통화 연결 중...</p>
      )}
      {status === "in-call" && remotePeers.length === 0 && (
        <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)", margin: 0 }}>
          다른 참가자를 기다리는 중입니다...
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "var(--sp-3)",
        }}
      >
        <VideoTile stream={localStream} label={`나${micOn ? "" : " (음소거)"}`} isLocal />
        {remotePeers.map((peer) => (
          <VideoTile key={peer.userId} stream={peer.stream} label={peer.userName} />
        ))}
      </div>

      <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
        <button className="btn btn-secondary" type="button" onClick={toggleMic} disabled={status !== "in-call"}>
          {micOn ? "🎙️ 마이크 끄기" : "🔇 마이크 켜기"}
        </button>
        {hasVideo && (
          <button className="btn btn-secondary" type="button" onClick={toggleCam} disabled={status !== "in-call"}>
            {camOn ? "📷 카메라 끄기" : "🚫 카메라 켜기"}
          </button>
        )}
        <button className="btn btn-danger" type="button" onClick={onHangUp}>
          통화 끊기
        </button>
      </div>
    </div>
  );
}
