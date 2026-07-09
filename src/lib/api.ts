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

export type GroupJoinType = "PRIVATE" | "INVITE_ONLY";
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

export function createGroup(token: string, name: string, description: string | null, image: string | null) {
  return request<Group>("/api/groups", {
    method: "POST",
    token,
    body: JSON.stringify({ name, description, image }),
  });
}

export function updateGroup(token: string, groupId: number, name: string, description: string | null, image: string | null) {
  return request<Group>(`/api/groups/${groupId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ name, description, image }),
  });
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
  videos: PostVideo[];
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

export interface Meeting {
  id: number;
  groupId: number;
  hostId: number;
  startedAt: string;
  endedAt: string | null;
}

export interface Participant {
  userId: number;
  authorName: string;
  authorProfileImg: string | null;
  joinedAt: string;
  leftAt: string | null;
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

export function listMeetings(token: string, groupId: number, page = 0, size = 20) {
  return request<Meeting[]>(`/api/groups/${groupId}/meetings?page=${page}&size=${size}`, { token });
}

export function createMeeting(token: string, groupId: number) {
  return request<Meeting>(`/api/groups/${groupId}/meetings`, { method: "POST", token });
}

export function getMeeting(token: string, groupId: number, meetingId: number) {
  return request<Meeting>(`/api/groups/${groupId}/meetings/${meetingId}`, { token });
}

export function joinMeeting(token: string, groupId: number, meetingId: number) {
  return request<void>(`/api/groups/${groupId}/meetings/${meetingId}/join`, { method: "POST", token });
}

export function leaveMeeting(token: string, groupId: number, meetingId: number) {
  return request<void>(`/api/groups/${groupId}/meetings/${meetingId}/leave`, { method: "POST", token });
}

export function endMeeting(token: string, groupId: number, meetingId: number) {
  return request<void>(`/api/groups/${groupId}/meetings/${meetingId}/end`, { method: "POST", token });
}

export function listParticipants(token: string, groupId: number, meetingId: number) {
  return request<Participant[]>(`/api/groups/${groupId}/meetings/${meetingId}/participants`, { token });
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
export function uploadImage(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);
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
export function uploadChatFile(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);
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

export type NotificationType = "NEW_POST" | "COMMENT" | "LIKE" | "MENTION" | "CHAT" | "MEETING_STARTED" | "NOTICE" | "INVITE";
export type NotificationTargetType = "POST" | "REPLY" | "MESSAGE" | "MEETING" | "GROUP";

export interface AppNotification {
  id: number;
  type: NotificationType;
  targetType: NotificationTargetType | null;
  targetId: number | null;
  isRead: boolean;
  createdAt: string;
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
