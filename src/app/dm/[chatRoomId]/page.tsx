"use client";

import { Suspense, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { DirectMessageThread } from "@/components/dm-thread";
import { DmCall } from "@/components/dm-call";
import type { CallSessionHandle } from "@/components/group-call-session";

function DmThreadPageInner() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ chatRoomId: string }>();
  const searchParams = useSearchParams();
  const chatRoomId = Number(params.chatRoomId);
  // 이 방 화면에 이미 있는 상태에서 통화를 수락하면 경로는 그대로고 쿼리만 바뀐다 —
  // call 파라미터를 key에 걸어 DmCall을 리마운트시켜 joined 모드로 다시 태운다.
  const callParam = searchParams.get("call") ?? "0";
  // 입력창 첨부 패널의 보이스톡/페이스톡이 이 통화를 시작시킨다(훅이라 이른 return보다 위에 있어야 한다).
  const callHandle = useRef<CallSessionHandle | null>(null);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <DmCall key={`call-${chatRoomId}-${callParam}`} token={accessToken} chatRoomId={chatRoomId} handleRef={callHandle} />
      <DirectMessageThread
        key={chatRoomId}
        token={accessToken}
        chatRoomId={chatRoomId}
        onStartCall={(video) => callHandle.current?.start(video)}
      />
    </div>
  );
}

// useSearchParams는 Suspense 경계가 필요하다(로그인 페이지와 같은 관례).
export default function DmThreadPage() {
  return (
    <Suspense>
      <DmThreadPageInner />
    </Suspense>
  );
}
