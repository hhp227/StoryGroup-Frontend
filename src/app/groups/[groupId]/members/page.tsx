"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { GroupMemberList } from "@/components/group-member-list";

export default function GroupMembersPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  if (!isReady) return null;
  if (!accessToken) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>멤버</h1>
      <GroupMemberList token={accessToken} groupId={groupId} />
    </div>
  );
}
