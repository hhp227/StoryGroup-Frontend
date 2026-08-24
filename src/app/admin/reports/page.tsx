"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  ApiError,
  getMyProfile,
  listUserReports,
  processUserReport,
  type ReportStatus,
  type UserReport,
} from "@/lib/api";

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

// 앱 운영자 전용 - 사용자 신고 관리. isAdmin은 메뉴 노출용일 뿐 실제 인가는 서버(403)가 한다.
// 확인/기각은 처리 기록이며, 실제 조치(차단 등)는 피신고자 프로필의 기존 기능으로 한다.
export default function AdminReportsPage() {
  const { accessToken, isReady } = useAuth();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    getMyProfile(accessToken)
      .then((profile) => setIsAdmin(profile.isAdmin))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "프로필을 불러오지 못했습니다"));
  }, [isReady, accessToken, router]);

  if (!isReady || !accessToken) return null;

  return (
    <div className="container page page-narrow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
      <div>
        <Link href="/settings" style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          ‹ 설정
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginTop: "var(--sp-2)" }}>
          사용자 신고 관리
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-faint)", marginTop: 4 }}>
          접수된 사용자 신고입니다. 확인/기각은 처리 기록이며, 조치는 피신고자 프로필에서 직접 합니다.
        </p>
      </div>
      {loadError && <p className="field-error">{loadError}</p>}
      {isAdmin === false && <p style={{ color: "var(--ink-faint)" }}>운영자만 볼 수 있는 페이지입니다.</p>}
      {isAdmin === true && <UserReportList token={accessToken} />}
    </div>
  );
}

function UserReportList({ token }: { token: string }) {
  const [filter, setFilter] = useState<ReportStatus | undefined>("PENDING");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <div style={{ display: "flex", gap: "var(--sp-2)" }}>
        <FilterChip label="대기중" active={filter === "PENDING"} onClick={() => setFilter("PENDING")} />
        <FilterChip label="전체" active={filter === undefined} onClick={() => setFilter(undefined)} />
      </div>
      {/* 필터가 바뀌면 리마운트로 목록 상태를 리셋한다(effect 내 동기 setState 금지 lint 대응). */}
      <FilteredUserReportList key={filter ?? "ALL"} token={token} filter={filter} />
    </div>
  );
}

function FilteredUserReportList({ token, filter }: { token: string; filter: ReportStatus | undefined }) {
  const [reports, setReports] = useState<UserReport[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<number | null>(null);

  useEffect(() => {
    listUserReports(token, filter)
      .then(setReports)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "신고 목록을 불러오지 못했습니다"));
  }, [token, filter]);

  async function handleProcess(report: UserReport, status: "RESOLVED" | "DISMISSED") {
    setActionError(null);
    setBusyFor(report.id);
    try {
      const updated = await processUserReport(token, report.id, status);
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

          <Link href={`/users/${report.reportedId}`} style={{ color: "inherit", display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            <div className="avatar">{report.reportedName.slice(0, 1)}</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700 }}>{report.reportedName}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>누적 신고 {report.reportedTotalCount}회</span>
            </div>
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
