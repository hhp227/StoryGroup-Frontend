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
    try {
      const body = await res.json();
      code = body.code ?? code;
      message = body.message ?? message;
    } catch {
      // 응답 본문이 JSON이 아닌 경우(예: 토큰 만료 시 Spring 기본 403) 기본 메시지 사용
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

export function createGroup(token: string, name: string, description: string | null) {
  return request<Group>("/api/groups", {
    method: "POST",
    token,
    body: JSON.stringify({ name, description }),
  });
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
