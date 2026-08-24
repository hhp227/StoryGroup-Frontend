"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  ApiError,
  getGroup,
  listGroupReports,
  processGroupReport,
  type Group,
  type PostReport,
  type ReportStatus,
} from "@/lib/api";
import { canModerate } from "@/lib/roles";

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: "대기중",
  RESOLVED: "확인됨",
  DISMISSED: "기각됨",
};

const STATUS_COLOR: Record<ReportStatus, string> = {
  PENDING: "var(--accent)",
  RESOLVED: "var(--moss)",
  DISMISSED: "var(--ink-faint)",
};

// 그룹 신고함(방장/부방장 전용) - 멤버가 신고한 게시글을 확인/기각 처리한다.
// 처리는 기록일 뿐이고 실제 조치(게시글 삭제 등)는 게시글 화면의 기존 기능으로 한다.
export default function GroupReportsPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  const [group, setGroup] = useState<Group | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    getGroup(accessToken, groupId)
      .then(setGroup)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "그룹을 불러오지 못했습니다"));
  }, [isReady, accessToken, groupId, router]);

  if (!isReady || !accessToken) return null;

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div>
        <Link href={`/groups/${groupId}`} style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          ‹ {group?.name ?? "그룹"}
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginTop: "var(--sp-2)" }}>신고함</h1>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)", marginTop: 4 }}>
          멤버가 신고한 게시글입니다. 확인/기각은 처리 기록이며, 게시글 삭제 등 조치는 게시글에서 직접 합니다.
        </p>
      </div>
      {loadError && <p className="field-error">{loadError}</p>}
      {group && !canModerate(group.myRole) && (
        <p style={{ color: "var(--ink-faint)" }}>신고함은 방장/부방장만 볼 수 있습니다.</p>
      )}
      {group && canModerate(group.myRole) && <ReportList token={accessToken} groupId={groupId} />}
    </div>
  );
}

function ReportList({ token, groupId }: { token: string; groupId: number }) {
  const [filter, setFilter] = useState<ReportStatus | undefined>("PENDING");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <div style={{ display: "flex", gap: "var(--sp-2)" }}>
        <FilterChip label="대기중" active={filter === "PENDING"} onClick={() => setFilter("PENDING")} />
        <FilterChip label="전체" active={filter === undefined} onClick={() => setFilter(undefined)} />
      </div>
      {/* 필터가 바뀌면 리마운트로 목록 상태를 리셋한다(effect 내 동기 setState 금지 lint 대응). */}
      <FilteredReportList key={filter ?? "ALL"} token={token} groupId={groupId} filter={filter} />
    </div>
  );
}

function FilteredReportList({ token, groupId, filter }: { token: string; groupId: number; filter: ReportStatus | undefined }) {
  const [reports, setReports] = useState<PostReport[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<number | null>(null);

  useEffect(() => {
    listGroupReports(token, groupId, filter)
      .then(setReports)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "신고 목록을 불러오지 못했습니다"));
  }, [token, groupId, filter]);

  async function handleProcess(report: PostReport, status: "RESOLVED" | "DISMISSED") {
    setActionError(null);
    setBusyFor(report.id);
    try {
      const updated = await processGroupReport(token, groupId, report.id, status);
      // 대기중 필터에서는 처리된 행이 목록에서 빠지고, 다른 필터에서는 상태만 갱신된다.
      setReports((prev) =>
        prev?.flatMap((r) => (r.id !== report.id ? [r] : filter === "PENDING" ? [] : [updated])) ?? null
      );
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "신고 처리에 실패했습니다");
    } finally {
      setBusyFor(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {loadError && <p className="field-error">{loadError}</p>}
      {actionError && <p className="field-error">{actionError}</p>}
      {reports === null && !loadError && <p style={{ color: "var(--ink-faint)" }}>불러오는 중...</p>}
      {reports?.length === 0 && (
        <p style={{ color: "var(--ink-faint)" }}>{filter === "PENDING" ? "대기중인 신고가 없습니다." : "신고 내역이 없습니다."}</p>
      )}

      {reports?.map((report) => (
        <div key={report.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: STATUS_COLOR[report.status],
                border: `1px solid ${STATUS_COLOR[report.status]}`,
                borderRadius: 999,
                padding: "1px 8px",
              }}
            >
              {STATUS_LABEL[report.status]}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>
              {new Date(report.createdAt).toLocaleString("ko-KR")} · {report.reporterName}님 신고
            </span>
          </div>

          <Link
            href={`/groups/${groupId}/posts/${report.postId}`}
            style={{ color: "inherit", display: "flex", flexDirection: "column", gap: 2 }}
          >
            <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>{report.postAuthorName}님의 게시글</span>
            <span style={{ fontSize: "0.92rem", lineHeight: 1.5 }}>
              {report.postTextPreview.length > 0 ? report.postTextPreview : "(본문 없이 첨부만 있는 게시글)"}
            </span>
          </Link>

          {report.reason && (
            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>신고 사유: {report.reason}</span>
          )}

          {report.status === "PENDING" && (
            <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-1)" }}>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={busyFor === report.id}
                onClick={() => handleProcess(report, "RESOLVED")}
              >
                확인 처리
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={busyFor === report.id}
                onClick={() => handleProcess(report, "DISMISSED")}
              >
                기각
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip"
      style={{
        cursor: "pointer",
        border: `1px solid ${active ? "var(--accent)" : "var(--stone-border)"}`,
        color: active ? "var(--accent)" : "var(--ink-soft)",
        background: "var(--linen)",
      }}
    >
      {label}
    </button>
  );
}
