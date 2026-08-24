import { maybeCompressImage } from "./image-compressor";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  // FormData는 브라우저가 multipart boundary를 포함한 Content-Type을 직접 지정해야 하므로 건드리지 않는다.
  const isFormData = rest.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let code = "UNKNOWN";
    let message = "요청을 처리하지 못했습니다";
    // 토큰 만료 시 우리 GlobalExceptionHandler 형식이 아니라 Spring 기본 에러
    // ({"status":403,"error":"Forbidden","message":""})가 내려온다. message가 빈 문자열이면
    // `??`로는 안 걸러져서 화면에 빈 에러가 뜨고, 위쪽 로딩 상태가 안 풀린 것처럼 보이는 버그가 있었다.
    if (res.status === 401 || res.status === 403) {
      code = "UNAUTHORIZED";
      message = "로그인이 만료됐습니다. 다시 로그인해주세요.";
    } else {
      try {
        const body = await res.json();
        code = body.code || code;
        message = body.message || message;
      } catch {
        // 응답 본문이 JSON이 아닌 경우 기본 메시지 사용
      }
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  profileImg: string | null;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export function registerUser(name: string, email: string, password: string) {
  return request<UserSummary>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function loginUser(email: string, password: string) {
  return request<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// 리프레시 토큰은 1회용(rotation) — 성공하면 응답의 새 refreshToken으로 반드시 교체 저장해야 한다.
export function refreshTokens(refreshToken: string) {
  return request<TokenResponse>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

// 서버 측 리프레시 토큰 폐기. 로컬 로그아웃과 별개로 호출(실패해도 로컬 로그아웃은 진행).
export function logoutUser(refreshToken: string) {
  return request<void>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

// 레거시 의미 복원: AUTO_APPROVE=자동 승인(탐색에서 바로 가입), APPROVAL_REQUIRED=승인제(가입 신청 후 승인).
export type GroupJoinType = "AUTO_APPROVE" | "APPROVAL_REQUIRED";
export type GroupRole = "OWNER" | "ADMIN" | "MEMBER";

export interface Group {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  joinType: GroupJoinType;
  myRole: GroupRole;
  createdAt: string;
  isLounge: boolean;
}

export function listMyGroups(token: string) {
  return request<Group[]>("/api/groups", { token });
}

export function getGroup(token: string, groupId: number) {
  return request<Group>(`/api/groups/${groupId}`, { token });
}

export function createGroup(
  token: string,
  name: string,
  description: string | null,
  image: string | null,
  joinType: GroupJoinType = "AUTO_APPROVE",
) {
  return request<Group>("/api/groups", {
    method: "POST",
    token,
    body: JSON.stringify({ name, description, image, joinType }),
  });
}

export function updateGroup(
  token: string,
  groupId: number,
  name: string,
  description: string | null,
  image: string | null,
  joinType?: GroupJoinType,
) {
  return request<Group>(`/api/groups/${groupId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ name, description, image, ...(joinType ? { joinType } : {}) }),
  });
}

// ---- 그룹 탐색/가입 ----

export type MembershipStatus = "NONE" | "PENDING" | "MEMBER";

export interface DiscoverGroup {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  joinType: GroupJoinType;
  memberCount: number;
  membership: MembershipStatus;
  createdAt: string;
}

export function discoverGroups(
  token: string,
  query = "",
  page = 0,
  size = 20,
  sort: "recent" | "popular" = "recent",
) {
  return request<DiscoverGroup[]>(
    `/api/groups/discover?query=${encodeURIComponent(query)}&sort=${sort}&page=${page}&size=${size}`,
    { token },
  );
}

// 자동 승인 그룹이면 JOINED + 가입된 그룹, 승인제면 REQUESTED + group=null.
export interface JoinGroupResult {
  status: "JOINED" | "REQUESTED";
  group: Group | null;
}

export function joinGroup(token: string, groupId: number) {
  return request<JoinGroupResult>(`/api/groups/${groupId}/join`, { method: "POST", token });
}

export function cancelJoinRequest(token: string, groupId: number) {
  return request<void>(`/api/groups/${groupId}/join`, { method: "DELETE", token });
}

export function joinGroupByCode(token: string, code: string) {
  return request<Group>(`/api/groups/join/${encodeURIComponent(code)}`, { method: "POST", token });
}

export interface JoinRequest {
  userId: number;
  name: string;
  profileImg: string | null;
  requestedAt: string;
}

export function listJoinRequests(token: string, groupId: number) {
  return request<JoinRequest[]>(`/api/groups/${groupId}/join-requests`, { token });
}

export function approveJoinRequest(token: string, groupId: number, userId: number) {
  return request<void>(`/api/groups/${groupId}/join-requests/${userId}/approve`, { method: "POST", token });
}

// ---- 사용자 차단 ----
// 차단하면 그 사용자의 게시글/댓글/채팅/파일이 내 화면에서 숨겨지고, DM은 양방향으로 막힌다.

export interface BlockedUser {
  userId: number;
  name: string;
  profileImg: string | null;
  blockedAt: string;
}

export function listBlockedUsers(token: string) {
  return request<BlockedUser[]>("/api/users/me/blocks", { token });
}

export function blockUser(token: string, userId: number) {
  return request<void>(`/api/users/${userId}/block`, { method: "POST", token });
}

export function unblockUser(token: string, userId: number) {
  return request<void>(`/api/users/${userId}/block`, { method: "DELETE", token });
}

// ---- 친구 ----
// 단방향 등록(즐겨찾기 성격, 승인 절차 없음). 검색 페이지 친구 섹션과 사용자 검색 결과가 진입점.

export interface Friend {
  userId: number;
  name: string;
  profileImg: string | null;
  statusMessage: string | null;
  friendedAt: string;
  // 전역 프레즌스 스냅샷 — 구서버(필드 없음) 방어로 옵셔널. 실시간 전환은 PRESENCE_CHANGED 이벤트
  online?: boolean;
}

export function listFriends(token: string) {
  return request<Friend[]>("/api/users/me/friends", { token });
}

export function addFriend(token: string, userId: number) {
  return request<void>(`/api/users/${userId}/friend`, { method: "POST", token });
}

export function removeFriend(token: string, userId: number) {
  return request<void>(`/api/users/${userId}/friend`, { method: "DELETE", token });
}

// ---- 신고 / 공개 프로필 ----

// 사용자/게시글 신고 공통 처리 상태. 같은 대상에 대한 "대기중" 신고는 1건만(중복 409
// ALREADY_REPORTED), 처리(확인/기각)된 뒤에는 재신고할 수 있다.
export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";

export function reportUser(token: string, userId: number, reason?: string) {
  return request<void>(`/api/users/${userId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
    token,
  });
}

export function reportPost(token: string, groupId: number, postId: number, reason?: string) {
  return request<void>(`/api/groups/${groupId}/posts/${postId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
    token,
  });
}

// 그룹 신고함(방장/부방장 전용) 한 행 - 신고된 게시글 요약을 함께 내려준다.
export interface PostReport {
  id: number;
  postId: number;
  postTextPreview: string;
  postAuthorId: number;
  postAuthorName: string;
  reporterId: number;
  reporterName: string;
  reason: string | null;
  status: ReportStatus;
  createdAt: string;
  processedAt: string | null;
}

export function listGroupReports(token: string, groupId: number, status?: ReportStatus) {
  const query = status ? `?status=${status}` : "";
  return request<PostReport[]>(`/api/groups/${groupId}/reports${query}`, { token });
}

// 처리는 상태 기록만 - 게시글 삭제 등 실제 조치는 기존 기능으로 한다. 재처리(확인<->기각) 가능.
export function processGroupReport(token: string, groupId: number, reportId: number, status: "RESOLVED" | "DISMISSED") {
  return request<PostReport>(`/api/groups/${groupId}/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    token,
  });
}

// 운영자(Profile.isAdmin) 전용 사용자 신고 관리 한 행.
export interface UserReport {
  id: number;
  reporterId: number;
  reporterName: string;
  reportedId: number;
  reportedName: string;
  reportedProfileImg: string | null;
  reason: string | null;
  status: ReportStatus;
  createdAt: string;
  processedAt: string | null;
  // 피신고자의 누적 신고 수(상태 무관) - 상습 피신고자 식별용.
  reportedTotalCount: number;
}

export function listUserReports(token: string, status?: ReportStatus) {
  const query = status ? `?status=${status}` : "";
  return request<UserReport[]>(`/api/admin/user-reports${query}`, { token });
}

export function processUserReport(token: string, reportId: number, status: "RESOLVED" | "DISMISSED") {
  return request<UserReport>(`/api/admin/user-reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    token,
  });
}

// 다른 사용자가 보는 공개 프로필 — 이메일은 안 내려온다(본인용 getMyProfile과 다름).
export interface PublicProfile {
  id: number;
  name: string;
  profileImg: string | null;
  bio: string | null;
  statusMessage: string | null;
  createdAt: string;
}

export function getPublicProfile(token: string, userId: number) {
  return request<PublicProfile>(`/api/users/${userId}`, { token });
}

export function rejectJoinRequest(token: string, groupId: number, userId: number) {
  return request<void>(`/api/groups/${groupId}/join-requests/${userId}`, { method: "DELETE", token });
}

export function deleteGroup(token: string, groupId: number) {
  return request<void>(`/api/groups/${groupId}`, { method: "DELETE", token });
}

export interface PostImage {
  id: number;
  image: string;
}

export interface PostVideo {
  id: number;
  video: string;
}

export interface Post {
  id: number;
  groupId: number;
  userId: number;
  authorName: string;
  authorProfileImg: string | null;
  text: string;
  images: PostImage[];
  // videos 미배포 백엔드는 이 필드를 아예 안 내려주므로 옵셔널로 받는다.
  videos?: PostVideo[];
  isNotice: boolean;
  createdAt: string;
}

export function listPosts(token: string, groupId: number, page = 0, size = 20) {
  return request<Post[]>(`/api/groups/${groupId}/posts?page=${page}&size=${size}`, { token });
}

export function createPost(token: string, groupId: number, text: string, images?: string[], videos?: string[]) {
  return request<Post>(`/api/groups/${groupId}/posts`, {
    method: "POST",
    token,
    body: JSON.stringify({ text, images, videos }),
  });
}

export function getPost(token: string, groupId: number, postId: number) {
  return request<Post>(`/api/groups/${groupId}/posts/${postId}`, { token });
}

// images/videos는 서버가 3상태로 받는다(생략=유지, 빈 배열=전부 삭제, 값=전체 교체) — 폼이 들고 있는
// 목록을 항상 통째로 보내 "안 건드림"과 "다 지움"을 구분할 일이 없게 한다. videos를 안 넘기는 호출부는
// 동영상을 유지한다(기존 계약 그대로 — 안 보내야 다른 데서 올린 동영상이 살아남는다).
export function updatePost(token: string, groupId: number, postId: number, text: string, images: string[], videos?: string[]) {
  return request<Post>(`/api/groups/${groupId}/posts/${postId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(videos === undefined ? { text, images } : { text, images, videos }),
  });
}

export function deletePost(token: string, groupId: number, postId: number) {
  return request<void>(`/api/groups/${groupId}/posts/${postId}`, { method: "DELETE", token });
}

export function setPostNotice(token: string, groupId: number, postId: number) {
  return request<Post>(`/api/groups/${groupId}/posts/${postId}/notice`, { method: "POST", token });
}

export function unsetPostNotice(token: string, groupId: number, postId: number) {
  return request<Post>(`/api/groups/${groupId}/posts/${postId}/notice`, { method: "DELETE", token });
}

export interface Like {
  userId: number;
  authorName: string;
  authorProfileImg: string | null;
  createdAt: string;
}

export function listLikes(token: string, groupId: number, postId: number) {
  return request<Like[]>(`/api/groups/${groupId}/posts/${postId}/likes`, { token });
}

export function likePost(token: string, groupId: number, postId: number) {
  return request<void>(`/api/groups/${groupId}/posts/${postId}/likes`, { method: "POST", token });
}

export function unlikePost(token: string, groupId: number, postId: number) {
  return request<void>(`/api/groups/${groupId}/posts/${postId}/likes`, { method: "DELETE", token });
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  authorName: string;
  authorProfileImg: string | null;
  parentReplyId: number | null;
  text: string;
  createdAt: string;
}

export function listComments(token: string, groupId: number, postId: number) {
  return request<Comment[]>(`/api/groups/${groupId}/posts/${postId}/comments`, { token });
}

export function createComment(token: string, groupId: number, postId: number, text: string, parentReplyId?: number) {
  return request<Comment>(`/api/groups/${groupId}/posts/${postId}/comments`, {
    method: "POST",
    token,
    body: JSON.stringify({ text, parentReplyId }),
  });
}

export function deleteComment(token: string, groupId: number, postId: number, commentId: number) {
  return request<void>(`/api/groups/${groupId}/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
    token,
  });
}

export interface ChatRoom {
  id: number;
  groupId: number;
  name: string;
  createdAt: string;
}

export function listChatRooms(token: string, groupId: number) {
  return request<ChatRoom[]>(`/api/groups/${groupId}/chat-rooms`, { token });
}

export function createChatRoom(token: string, groupId: number, name: string) {
  return request<ChatRoom>(`/api/groups/${groupId}/chat-rooms`, {
    method: "POST",
    token,
    body: JSON.stringify({ name }),
  });
}

// 채팅 허브(/dm) 그룹 채팅 섹션 한 줄: 내가 속한 그룹의 채팅방(그룹명 포함).
// 라운지는 전원 자동 포함 그룹이라 백엔드가 제외하고, 그룹명 → 방 생성 순으로 정렬해서 내려준다.
export interface GroupChatRoom {
  id: number;
  groupId: number;
  groupName: string;
  name: string;
  createdAt: string;
  // 허브 미리보기·뱃지(2026-08 서버) — 구서버 방어로 옵셔널(KMP 기본값 관례).
  // lastMessageAt이 null이면 메시지 없음, 첨부 전용이면 lastMessageText가 빈 문자열(종류는 lastMessageType).
  unreadCount?: number;
  lastMessageText?: string | null;
  lastMessageType?: string | null;
  lastMessageAt?: string | null;
}

export function listMyGroupChatRooms(token: string) {
  return request<GroupChatRoom[]>("/api/chat-rooms", { token });
}

// 메시지 첨부(이미지/파일) — 메시지당 1개. url은 업로드 API가 돌려준 공개 URL.
export interface MessageAttachment {
  url: string;
  name: string | null;
  contentType: string | null;
  size: number | null;
}

export interface ChatMessage {
  id: number;
  chatRoomId: number;
  userId: number;
  authorName: string;
  authorProfileImg: string | null;
  text: string;
  attachment: MessageAttachment | null;
  createdAt: string;
}

// 백엔드는 최신순(DESC)으로 내려준다 — 채팅창 표시는 오래된 순이 자연스러워 호출부에서 뒤집어 쓴다.
export function listMessages(token: string, groupId: number, chatRoomId: number, page = 0, size = 50) {
  return request<ChatMessage[]>(`/api/groups/${groupId}/chat-rooms/${chatRoomId}/messages?page=${page}&size=${size}`, { token });
}

export function sendMessage(token: string, groupId: number, chatRoomId: number, text: string, attachment?: MessageAttachment) {
  return request<ChatMessage>(`/api/groups/${groupId}/chat-rooms/${chatRoomId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ text, attachment }),
  });
}

export function deleteMessage(token: string, groupId: number, chatRoomId: number, messageId: number) {
  return request<void>(`/api/groups/${groupId}/chat-rooms/${chatRoomId}/messages/${messageId}`, {
    method: "DELETE",
    token,
  });
}

// 방×사용자당 마지막으로 읽은 메시지 위치 — 그 이하 메시지는 전부 읽은 것으로 본다.
export interface ReadPosition {
  userId: number;
  lastReadMessageId: number;
}

export function markChatRead(token: string, groupId: number, chatRoomId: number, lastReadMessageId: number) {
  return request<void>(`/api/groups/${groupId}/chat-rooms/${chatRoomId}/read`, {
    method: "PUT",
    token,
    body: JSON.stringify({ lastReadMessageId }),
  });
}

export function listChatReads(token: string, groupId: number, chatRoomId: number) {
  return request<ReadPosition[]>(`/api/groups/${groupId}/chat-rooms/${chatRoomId}/reads`, { token });
}

// 통화 로스터 스냅숏(GET /api/rtc/chat-rooms/{id}/roster) 항목 — "통화 중 N명" 미리보기용(페이스톡 전환).
export interface RtcRosterPeer {
  userId: number;
  userName: string;
}

export interface Member {
  userId: number;
  name: string;
  profileImg: string | null;
  role: GroupRole;
  joinedAt: string;
}

export function listMembers(token: string, groupId: number) {
  return request<Member[]>(`/api/groups/${groupId}/members`, { token });
}

export function kickMember(token: string, groupId: number, userId: number) {
  return request<void>(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE", token });
}

export function updateMemberRole(token: string, groupId: number, userId: number, role: GroupRole) {
  return request<void>(`/api/groups/${groupId}/members/${userId}/role`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ role }),
  });
}

export interface DirectRoom {
  id: number;
  otherUserId: number;
  otherUserName: string;
  otherUserProfileImg: string | null;
  createdAt: string;
  // 허브 미리보기·뱃지 — GroupChatRoom과 같은 계약(구서버 방어 옵셔널).
  unreadCount?: number;
  lastMessageText?: string | null;
  lastMessageType?: string | null;
  lastMessageAt?: string | null;
}

export function listDirectRooms(token: string) {
  return request<DirectRoom[]>("/api/dm", { token });
}

export function getOrCreateDirectRoom(token: string, otherUserId: number) {
  return request<ChatRoom>(`/api/dm/${otherUserId}`, { method: "POST", token });
}

// 백엔드는 최신순(DESC)으로 내려준다 — 채팅창 표시는 오래된 순이 자연스러워 호출부에서 뒤집어 쓴다.
export function listDirectMessages(token: string, chatRoomId: number, page = 0, size = 50) {
  return request<ChatMessage[]>(`/api/dm/${chatRoomId}/messages?page=${page}&size=${size}`, { token });
}

export function sendDirectMessage(token: string, chatRoomId: number, text: string, attachment?: MessageAttachment) {
  return request<ChatMessage>(`/api/dm/${chatRoomId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ text, attachment }),
  });
}

export function deleteDirectMessage(token: string, chatRoomId: number, messageId: number) {
  return request<void>(`/api/dm/${chatRoomId}/messages/${messageId}`, {
    method: "DELETE",
    token,
  });
}

export function markDirectRead(token: string, chatRoomId: number, lastReadMessageId: number) {
  return request<void>(`/api/dm/${chatRoomId}/read`, {
    method: "PUT",
    token,
    body: JSON.stringify({ lastReadMessageId }),
  });
}

export function listDirectReads(token: string, chatRoomId: number) {
  return request<ReadPosition[]>(`/api/dm/${chatRoomId}/reads`, { token });
}

// 통화 로스터 스냅숏 — rtc 토픽 구독은 곧 입장이라, 입장 없이 진행 여부만 보는 읽기 경로(페이스톡 전환).
export function listRtcRoster(token: string, chatRoomId: number) {
  return request<RtcRosterPeer[]>(`/api/rtc/chat-rooms/${chatRoomId}/roster`, { token });
}

// 필드명이 브라우저 RTCIceServer와 같다 — 서버가 STUN(+설정 시 TURN 단기 자격증명)을 내려준다(Phase 7 D10).
export interface IceServer {
  urls: string[];
  username: string | null;
  credential: string | null;
}

export function getIceServers(token: string) {
  return request<{ iceServers: IceServer[] }>("/api/rtc/ice-servers", { token });
}

// 사이드바 공지 패널 한 줄 — 본문 요약만 필요해서 Post보다 얇다.
export interface NoticeSummary {
  id: number;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface GroupNoticesPage {
  totalCount: number;
  notices: NoticeSummary[];
}

export function listGroupNotices(token: string, groupId: number, page = 0, size = 3) {
  return request<GroupNoticesPage>(`/api/groups/${groupId}/notices?page=${page}&size=${size}`, { token });
}

// 그룹 앨범(파생 뷰): 그룹 게시글 첨부 이미지 모음. postId로 원본 게시글로 이동한다.
export interface GroupPhoto {
  id: number;
  postId: number;
  image: string;
  mediaType: "image" | "video";
  userId: number;
  authorName: string;
  createdAt: string;
}

// 다른 목록 응답과 달리 총 개수를 함께 준다 — 앨범 패널의 "+N"/"N장" 표기용.
export interface GroupPhotosPage {
  totalCount: number;
  photos: GroupPhoto[];
}

export function listGroupPhotos(token: string, groupId: number, page = 0, size = 30) {
  return request<GroupPhotosPage>(`/api/groups/${groupId}/photos?page=${page}&size=${size}`, { token });
}

export interface GroupFile {
  id: number;
  groupId: number;
  userId: number;
  authorName: string;
  authorProfileImg: string | null;
  name: string;
  url: string;
  size: number | null;
  contentType: string | null;
  createdAt: string;
}

export function listFiles(token: string, groupId: number, page = 0, size = 20) {
  return request<GroupFile[]>(`/api/groups/${groupId}/files?page=${page}&size=${size}`, { token });
}

// URL 메타데이터만 등록하는 구버전 경로(다른 클라이언트 호환용으로 백엔드에 남아 있음).
export function uploadFile(token: string, groupId: number, name: string, url: string) {
  return request<GroupFile>(`/api/groups/${groupId}/files`, {
    method: "POST",
    token,
    body: JSON.stringify({ name, url }),
  });
}

// 이미지 전용 범용 업로드 - 공개 URL만 돌려받아 게시글(images)/프로필(profileImg)/그룹(image)의
// 기존 URL 문자열 필드에 그대로 넣는다(API 계약 무변경).
export async function uploadImage(token: string, file: File) {
  const form = new FormData();
  form.append("file", await maybeCompressImage(file)); // 이미지 투명 압축(§4) — GIF/실패는 원본
  return request<{ url: string }>("/api/images", { method: "POST", token, body: form });
}

// 동영상 전용 범용 업로드(/api/images의 동영상판) — 게시글 videos에 넣을 공개 URL을 돌려받는다.
// 서버 multipart 상한(20MB)을 넘는 파일은 실패한다.
export function uploadVideo(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{ url: string }>("/api/videos", { method: "POST", token, body: form });
}

// 일반 파일 범용 업로드(/api/images의 파일판, MIME 제한 없음) — 채팅 첨부용.
// 응답 필드가 MessageAttachment와 같은 모양이라 그대로 메시지 전송에 넣으면 된다.
export async function uploadChatFile(token: string, file: File) {
  const form = new FormData();
  form.append("file", await maybeCompressImage(file)); // 비이미지는 함수가 원본을 그대로 돌려준다
  return request<MessageAttachment>("/api/files", { method: "POST", token, body: form });
}

// 실제 바이너리 업로드 - 서버가 Supabase Storage에 저장하고 공개 URL 메타데이터를 만들어 돌려준다.
export function uploadGroupFile(token: string, groupId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<GroupFile>(`/api/groups/${groupId}/files/upload`, {
    method: "POST",
    token,
    body: form,
  });
}

export function deleteFile(token: string, groupId: number, fileId: number) {
  return request<void>(`/api/groups/${groupId}/files/${fileId}`, { method: "DELETE", token });
}

export type NotificationType =
  | "NEW_POST"
  | "COMMENT"
  | "LIKE"
  | "MENTION"
  | "CHAT"
  | "MEETING_STARTED"
  | "NOTICE"
  | "INVITE"
  | "JOIN_REQUEST"
  | "JOIN_APPROVED"
  | "JOIN_REJECTED";
export type NotificationTargetType = "POST" | "REPLY" | "MESSAGE" | "MEETING" | "GROUP";

export interface AppNotification {
  id: number;
  type: NotificationType;
  targetType: NotificationTargetType | null;
  targetId: number | null;
  isRead: boolean;
  createdAt: string;
  // 서버가 target에서 역추적한 컨텍스트(2026-08 서버) — 대상 삭제/접근 불가·구서버는 null(KMP DTO와 동일 계약).
  postId?: number | null;
  postPreview?: string | null;
  groupId?: number | null;
  groupName?: string | null;
}

export function listNotifications(token: string, page = 0, size = 20) {
  return request<AppNotification[]>(`/api/notifications?page=${page}&size=${size}`, { token });
}

export function countUnreadNotifications(token: string) {
  return request<{ count: number }>("/api/notifications/unread-count", { token });
}

export function markNotificationAsRead(token: string, notificationId: number) {
  return request<void>(`/api/notifications/${notificationId}/read`, { method: "PATCH", token });
}

export function markAllNotificationsAsRead(token: string) {
  return request<void>("/api/notifications/read-all", { method: "POST", token });
}

export interface Profile {
  id: number;
  name: string;
  email: string;
  profileImg: string | null;
  bio: string | null;
  statusMessage: string | null;
  // 앱 운영자 여부 - 설정의 운영자 메뉴(사용자 신고 관리) 노출용. 실제 인가는 서버가 다시 검사한다.
  isAdmin: boolean;
}

export function getMyProfile(token: string) {
  return request<Profile>("/api/users/me", { token });
}

export function updateMyProfile(token: string, name: string, profileImg: string | null, bio: string | null, statusMessage: string | null) {
  return request<Profile>("/api/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify({ name, profileImg, bio, statusMessage }),
  });
}

export function changeMyPassword(token: string, currentPassword: string, newPassword: string) {
  return request<void>("/api/users/me/password", {
    method: "PATCH",
    token,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export interface GroupSearchResult {
  id: number;
  name: string;
  image: string | null;
  description: string | null;
}

export interface PostSearchResult {
  id: number;
  groupId: number;
  groupName: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface FileSearchResult {
  id: number;
  groupId: number;
  groupName: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface MessageSearchResult {
  id: number;
  chatRoomId: number;
  groupId: number | null;
  groupName: string | null;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface UserSearchResult {
  id: number;
  name: string;
  profileImg: string | null;
  statusMessage: string | null;
}

export interface SearchResults {
  groups: GroupSearchResult[];
  posts: PostSearchResult[];
  files: FileSearchResult[];
  messages: MessageSearchResult[];
  users: UserSearchResult[];
}

export function search(token: string, query: string, limit = 10) {
  return request<SearchResults>(`/api/search?query=${encodeURIComponent(query)}&limit=${limit}`, { token });
}

// 그룹 일정. RSVP 집계와 내 응답 상태(myRsvp)까지 한 번에 내려온다.
export type RsvpStatus = "GOING" | "MAYBE" | "NOT_GOING";

export interface GroupEvent {
  id: number;
  groupId: number;
  userId: number;
  authorName: string;
  authorProfileImg: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  goingCount: number;
  maybeCount: number;
  notGoingCount: number;
  myRsvp: RsvpStatus | null;
}

export interface EventAttendee {
  userId: number;
  name: string;
  profileImg: string | null;
  status: RsvpStatus;
}

export interface GroupEventDetail {
  event: GroupEvent;
  attendees: EventAttendee[];
}

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string | null;
}

export function createEvent(token: string, groupId: number, input: CreateEventInput) {
  return request<GroupEvent>(`/api/groups/${groupId}/events`, {
    method: "POST",
    body: JSON.stringify(input),
    token,
  });
}

// 캘린더 범위 조회: starts_at 기준 [from, to). 월 뷰가 월초~다음달 초를 넘긴다.
export function listEvents(token: string, groupId: number, from: string, to: string) {
  return request<GroupEvent[]>(
    `/api/groups/${groupId}/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { token }
  );
}

export function listUpcomingEvents(token: string, groupId: number, size = 3) {
  return request<GroupEvent[]>(`/api/groups/${groupId}/events/upcoming?size=${size}`, { token });
}

export function getEvent(token: string, groupId: number, eventId: number) {
  return request<GroupEventDetail>(`/api/groups/${groupId}/events/${eventId}`, { token });
}

export function updateEvent(token: string, groupId: number, eventId: number, input: CreateEventInput) {
  return request<GroupEvent>(`/api/groups/${groupId}/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    token,
  });
}

export function deleteEvent(token: string, groupId: number, eventId: number) {
  return request<void>(`/api/groups/${groupId}/events/${eventId}`, { method: "DELETE", token });
}

export function rsvpEvent(token: string, groupId: number, eventId: number, status: RsvpStatus) {
  return request<GroupEvent>(`/api/groups/${groupId}/events/${eventId}/rsvp`, {
    method: "PUT",
    body: JSON.stringify({ status }),
    token,
  });
}

export function cancelRsvp(token: string, groupId: number, eventId: number) {
  return request<GroupEvent>(`/api/groups/${groupId}/events/${eventId}/rsvp`, { method: "DELETE", token });
}

// JWT payload는 서버가 서명한 것을 그대로 들고 있는 클라이언트가 읽는 것뿐이라 디코딩만(검증 아님) 해도 안전하다.
// "좋아요 눌렀는지", "내 댓글인지" 같은 UI 상태 판단에만 쓴다 — 실제 권한 검증은 항상 서버가 한다.
export function getUserIdFromToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
}
