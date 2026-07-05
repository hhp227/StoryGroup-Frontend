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
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
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

export type GroupJoinType = "PRIVATE" | "INVITE_ONLY";
export type GroupRole = "OWNER" | "MEMBER";

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

export interface Post {
  id: number;
  groupId: number;
  userId: number;
  authorName: string;
  authorProfileImg: string | null;
  text: string;
  images: PostImage[];
  createdAt: string;
}

export function listPosts(token: string, groupId: number, page = 0, size = 20) {
  return request<Post[]>(`/api/groups/${groupId}/posts?page=${page}&size=${size}`, { token });
}

export function createPost(token: string, groupId: number, text: string, images?: string[]) {
  return request<Post>(`/api/groups/${groupId}/posts`, {
    method: "POST",
    token,
    body: JSON.stringify({ text, images }),
  });
}

export function getPost(token: string, groupId: number, postId: number) {
  return request<Post>(`/api/groups/${groupId}/posts/${postId}`, { token });
}

export function deletePost(token: string, groupId: number, postId: number) {
  return request<void>(`/api/groups/${groupId}/posts/${postId}`, { method: "DELETE", token });
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

export interface ChatMessage {
  id: number;
  chatRoomId: number;
  userId: number;
  authorName: string;
  authorProfileImg: string | null;
  text: string;
  createdAt: string;
}

// 백엔드는 최신순(DESC)으로 내려준다 — 채팅창 표시는 오래된 순이 자연스러워 호출부에서 뒤집어 쓴다.
export function listMessages(token: string, groupId: number, chatRoomId: number, page = 0, size = 50) {
  return request<ChatMessage[]>(`/api/groups/${groupId}/chat-rooms/${chatRoomId}/messages?page=${page}&size=${size}`, { token });
}

export function sendMessage(token: string, groupId: number, chatRoomId: number, text: string) {
  return request<ChatMessage>(`/api/groups/${groupId}/chat-rooms/${chatRoomId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ text }),
  });
}

export function deleteMessage(token: string, groupId: number, chatRoomId: number, messageId: number) {
  return request<void>(`/api/groups/${groupId}/chat-rooms/${chatRoomId}/messages/${messageId}`, {
    method: "DELETE",
    token,
  });
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

export function sendDirectMessage(token: string, chatRoomId: number, text: string) {
  return request<ChatMessage>(`/api/dm/${chatRoomId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ text }),
  });
}

export function deleteDirectMessage(token: string, chatRoomId: number, messageId: number) {
  return request<void>(`/api/dm/${chatRoomId}/messages/${messageId}`, {
    method: "DELETE",
    token,
  });
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

// 백엔드는 실제 바이너리 업로드를 받지 않고 이미 어딘가(추후 Supabase Storage)에 올라간
// 파일의 메타데이터(이름/URL)만 등록받는다. 그래서 폼도 URL을 직접 입력하는 형태로 둔다.
export function uploadFile(token: string, groupId: number, name: string, url: string) {
  return request<GroupFile>(`/api/groups/${groupId}/files`, {
    method: "POST",
    token,
    body: JSON.stringify({ name, url }),
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

export interface SearchResults {
  groups: GroupSearchResult[];
  posts: PostSearchResult[];
  files: FileSearchResult[];
  messages: MessageSearchResult[];
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
