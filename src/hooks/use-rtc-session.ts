"use client";

import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { getUserIdFromToken } from "@/lib/api";
import {
  RTC_QUEUE_DESTINATION,
  rtcInviteDestination,
  rtcRoomTopic,
  rtcSignalDestination,
  wsUrl,
  type RtcPeersEvent,
  type RtcRoomKind,
  type RtcSignalEvent,
} from "@/lib/ws";

export type RtcStatus = "idle" | "connecting" | "in-call" | "error";

export interface RemotePeer {
  userId: number;
  userName: string;
  stream: MediaStream | null;
}

export interface RtcSession {
  status: RtcStatus;
  error: string | null;
  localStream: MediaStream | null;
  remotePeers: RemotePeer[];
  micOn: boolean;
  camOn: boolean;
  // 카메라가 아예 없어 오디오 전용으로 연결된 경우 — 토글 UI를 숨기는 데 쓴다.
  hasVideo: boolean;
  // 화면 공유(D9): 오디오 전용이거나 getDisplayMedia가 없는 브라우저면 버튼을 숨긴다.
  sharing: boolean;
  canShareScreen: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => void;
}

// TURN 없이 STUN만 — 대칭 NAT 간 연결 실패 가능성은 알려진 제약(설계 문서 비목표).
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

interface PeerRecord {
  pc: RTCPeerConnection;
  userName: string;
  stream: MediaStream | null;
  // remoteDescription 설정 전에 도착한 ICE candidate는 여기 쌓았다가 설정 후 적용한다.
  pendingIce: RTCIceCandidateInit[];
}

// 통화 세션 하나(그룹 회의 또는 DM)의 수명주기 훅 — 풀 메시 P2P(Phase 7 설계 문서).
// enabled=true가 되면: getUserMedia → 전용 STOMP 연결 → 개인 큐+통화방 토픽 구독(= 통화 입장).
// 로스터는 PEERS 전체 목록으로 자가 복구되고, 연결이 없는 상대에 대해서는
// "userId 작은 쪽이 offer를 만든다"는 결정적 규칙으로 글레어(동시 offer)를 원천 차단한다(D5).
// STOMP가 끊기면(Cloud Run 1시간 상한 포함) 재연결 때 메시를 전부 버리고 다시 만든다(D7).
export function useRtcSession(
  token: string,
  kind: RtcRoomKind,
  roomId: number,
  enabled: boolean,
  // DM 통화 걸기: 첫 연결 성공 시 상대에게 CALL_INVITE를 한 번 보낸다(D6).
  ringOnJoin = false
): RtcSession {
  const [status, setStatus] = useState<RtcStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasVideo, setHasVideo] = useState(true);
  const [sharing, setSharing] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const clientRef = useRef<Client | null>(null);
  const peersRef = useRef(new Map<number, PeerRecord>());
  // 화면 공유 중 보관되는 트랙들(D9) — 카메라는 stop하지 않고 들고 있다가 공유 중지 시 복귀.
  const camTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const myUserId = getUserIdFromToken(token);

  useEffect(() => {
    if (!enabled || myUserId == null) return;
    let cancelled = false;
    let ringSent = false;
    const peers = peersRef.current;

    function syncRemotePeers() {
      setRemotePeers(
        Array.from(peers.entries()).map(([userId, rec]) => ({ userId, userName: rec.userName, stream: rec.stream }))
      );
    }

    function publishSignal(type: RtcSignalEvent["type"], toUserId: number, payload: string) {
      clientRef.current?.publish({
        destination: rtcSignalDestination(kind, roomId),
        body: JSON.stringify({ type, toUserId, payload }),
      });
    }

    function closePeer(userId: number) {
      const rec = peers.get(userId);
      if (!rec) return;
      rec.pc.onicecandidate = null;
      rec.pc.ontrack = null;
      rec.pc.onconnectionstatechange = null;
      rec.pc.close();
      peers.delete(userId);
    }

    function closeAllPeers() {
      Array.from(peers.keys()).forEach(closePeer);
    }

    function createPeer(userId: number, userName: string, initiator: boolean): PeerRecord {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const rec: PeerRecord = { pc, userName, stream: null, pendingIce: [] };
      peers.set(userId, rec);
      const stream = localStreamRef.current;
      stream?.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate) publishSignal("ICE", userId, JSON.stringify(e.candidate));
      };
      pc.ontrack = (e) => {
        rec.stream = e.streams[0] ?? null;
        syncRemotePeers();
      };
      pc.onconnectionstatechange = () => {
        // 실패한 연결은 정리한다 — 상대가 아직 통화에 있으면 다음 PEERS 방송(자가 복구) 때 다시 만든다.
        if (pc.connectionState === "failed") {
          closePeer(userId);
          syncRemotePeers();
        }
      };
      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => publishSignal("OFFER", userId, JSON.stringify(pc.localDescription)))
          .catch(() => closePeer(userId));
      }
      return rec;
    }

    async function flushPendingIce(rec: PeerRecord) {
      const queued = rec.pendingIce.splice(0);
      for (const candidate of queued) {
        try {
          await rec.pc.addIceCandidate(candidate);
        } catch {
          // 이미 닫힌 연결 등 — 개별 candidate 실패는 무시(ICE는 나머지로도 성립한다).
        }
      }
    }

    function handlePeers(event: RtcPeersEvent) {
      const others = event.peers.filter((p) => p.userId !== myUserId);
      // 목록에서 사라진 상대 = 통화에서 나감.
      let changed = false;
      Array.from(peers.keys()).forEach((userId) => {
        if (!others.some((p) => p.userId === userId)) {
          closePeer(userId);
          changed = true;
        }
      });
      // 연결이 없는 상대: 내 userId가 작으면 내가 offer(초대자), 크면 상대의 offer를 기다린다(D5).
      others.forEach((p) => {
        if (!peers.has(p.userId) && myUserId != null && myUserId < p.userId) {
          createPeer(p.userId, p.userName, true);
          changed = true;
        }
      });
      if (changed) syncRemotePeers();
    }

    async function handleSignal(event: RtcSignalEvent) {
      if (event.type === "OFFER") {
        // 응답자 쪽 연결은 offer 도착 시점에 만든다(반쪽 연결 없이).
        closePeer(event.fromUserId); // 재협상 offer(재연결 등)면 기존 것을 버리고 새로 받는다
        const rec = createPeer(event.fromUserId, event.fromUserName, false);
        await rec.pc.setRemoteDescription(JSON.parse(event.payload));
        await flushPendingIce(rec);
        const answer = await rec.pc.createAnswer();
        await rec.pc.setLocalDescription(answer);
        publishSignal("ANSWER", event.fromUserId, JSON.stringify(rec.pc.localDescription));
        syncRemotePeers();
        return;
      }
      const rec = peers.get(event.fromUserId);
      if (!rec) return;
      if (event.type === "ANSWER") {
        await rec.pc.setRemoteDescription(JSON.parse(event.payload));
        await flushPendingIce(rec);
        return;
      }
      // ICE
      const candidate = JSON.parse(event.payload) as RTCIceCandidateInit;
      if (rec.pc.remoteDescription) {
        await rec.pc.addIceCandidate(candidate).catch(() => {});
      } else {
        rec.pendingIce.push(candidate);
      }
    }

    // 카메라 없는 기기는 오디오 전용으로라도 통화에 참여시킨다.
    async function acquireMedia(): Promise<MediaStream> {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    }

    acquireMedia()
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        const videoAvailable = stream.getVideoTracks().length > 0;
        setHasVideo(videoAvailable);
        setMicOn(true);
        setCamOn(videoAvailable);

        const client = new Client({
          brokerURL: wsUrl(),
          connectHeaders: { Authorization: `Bearer ${token}` },
          reconnectDelay: 5000,
          onConnect: () => {
            // 재연결이면 죽은 시그널링 위에 있던 메시를 전부 버리고 PEERS 재수신으로 다시 만든다(D7).
            closeAllPeers();
            syncRemotePeers();
            // 개인 큐를 먼저 구독해야, 내가 PEERS에 등장한 걸 본 상대의 offer를 놓치지 않는다.
            client.subscribe(RTC_QUEUE_DESTINATION, (frame) => {
              const event = JSON.parse(frame.body) as RtcSignalEvent;
              if (event.roomKey === `${kind}/${roomId}`) void handleSignal(event);
            });
            client.subscribe(rtcRoomTopic(kind, roomId), (frame) => {
              const event = JSON.parse(frame.body) as RtcPeersEvent;
              if (event.type === "PEERS") handlePeers(event);
            });
            setStatus("in-call");
            if (ringOnJoin && !ringSent) {
              ringSent = true;
              client.publish({ destination: rtcInviteDestination(roomId), body: "" });
            }
          },
          onWebSocketClose: () => {
            setStatus((prev) => (prev === "error" ? prev : "connecting"));
          },
          onStompError: () => {
            setStatus("error");
            setError("실시간 연결이 거부되었습니다. 새로고침하거나 다시 로그인해주세요.");
            client.deactivate();
          },
        });
        clientRef.current = client;
        client.activate();
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setError("카메라/마이크를 사용할 수 없습니다. 브라우저 권한을 확인해주세요.");
        }
      });

    return () => {
      cancelled = true;
      closeAllPeers();
      clientRef.current?.deactivate();
      clientRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      // 공유 중에 끊으면 스트림 밖에 있는 트랙(보관 중인 카메라)도 꺼야 카메라 표시등이 남지 않는다.
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      camTrackRef.current?.stop();
      camTrackRef.current = null;
      setSharing(false);
      setLocalStream(null);
      setRemotePeers([]);
      setStatus("idle");
      setError(null);
    };
  }, [enabled, token, kind, roomId, myUserId, ringOnJoin]);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    // 공유 중엔 잠금(D9) — 스트림의 비디오 트랙이 카메라가 아니라 화면이다.
    if (!stream || sharing) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  };

  // 화면 공유 중지: 화면 트랙을 버리고 보관해둔 카메라 트랙을 각 sender와 로컬 스트림에 복귀(D9).
  const stopScreenShare = () => {
    const stream = localStreamRef.current;
    const screenTrack = screenTrackRef.current;
    if (!stream || !screenTrack) return;
    const camTrack = camTrackRef.current;
    peersRef.current.forEach((rec) => {
      const sender = rec.pc.getSenders().find((s) => s.track?.kind === "video");
      void sender?.replaceTrack(camTrack).catch(() => {});
    });
    stream.removeTrack(screenTrack);
    screenTrack.stop();
    if (camTrack) stream.addTrack(camTrack);
    screenTrackRef.current = null;
    camTrackRef.current = null;
    setSharing(false);
  };

  const startScreenShare = async () => {
    const stream = localStreamRef.current;
    if (!stream || screenTrackRef.current) return;
    const camTrack = stream.getVideoTracks()[0];
    if (!camTrack) return; // 오디오 전용 — video sender가 없어 replaceTrack 불가(D9)
    let display: MediaStream;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch {
      return; // 공유 선택창에서 취소 — 에러 아님
    }
    const screenTrack = display.getVideoTracks()[0];
    if (!screenTrack) return;
    screenTrackRef.current = screenTrack;
    camTrackRef.current = camTrack;
    peersRef.current.forEach((rec) => {
      const sender = rec.pc.getSenders().find((s) => s.track?.kind === "video");
      void sender?.replaceTrack(screenTrack).catch(() => {});
    });
    // 로컬 스트림의 트랙 자체를 바꿔두면 공유 중 새로 들어온 피어(createPeer의 addTrack)도 화면을 받는다(D9).
    stream.removeTrack(camTrack);
    stream.addTrack(screenTrack);
    // 브라우저 자체 UI의 "공유 중지"도 같은 정리 경로를 타게 한다.
    screenTrack.onended = () => stopScreenShare();
    setSharing(true);
  };

  const toggleScreenShare = () => {
    if (screenTrackRef.current) stopScreenShare();
    else void startScreenShare();
  };

  const canShareScreen =
    hasVideo && typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";

  // 미디어 획득~STOMP 연결 사이 구간은 setState 없이 파생값으로 "connecting"을 표시한다
  // (effect 안 동기 setState를 피하는 이 프로젝트 관례 — react-hooks/set-state-in-effect).
  const displayStatus: RtcStatus = enabled && status === "idle" ? "connecting" : status;

  return {
    status: displayStatus,
    error,
    localStream,
    remotePeers,
    micOn,
    camOn,
    hasVideo,
    sharing,
    canShareScreen,
    toggleMic,
    toggleCam,
    toggleScreenShare,
  };
}
