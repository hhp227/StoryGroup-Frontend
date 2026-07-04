"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { MeetingDetail } from "@/components/meeting-detail";

export default function MeetingDetailPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string; meetingId: string }>();
  const groupId = Number(params.groupId);
  const meetingId = Number(params.meetingId);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "var(--sp-6) var(--sp-5)" }}>
      <MeetingDetail key={meetingId} token={accessToken} groupId={groupId} meetingId={meetingId} />
    </div>
  );
}
