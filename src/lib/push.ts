// FCM 웹 푸시 — 토큰 취득·해제만 담당(등록 API 호출은 push-register/auth-provider 몫).
// config·VAPID는 Firebase 콘솔 웹 앱 등록 값(공개값이라 인라인 — SW와 문자 그대로 동일해야 한다).
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, deleteToken, isSupported } from "firebase/messaging";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBY23Gz8PIDoiEosYjLxY4PUFj-_sYQNhg", // 공개 식별자 — 시크릿 아님 (SW와 동일해야 함)
  authDomain: "application-bb416.firebaseapp.com",
  projectId: "application-bb416",
  messagingSenderId: "476947981226",
  appId: "1:476947981226:web:5434c0a0eaaa35580081d3",
};
// Firebase 콘솔 > 클라우드 메시징 > 웹 푸시 인증서 공개 키(공개값)
const VAPID_KEY = "BFYlg1M5rbsE3i2z4f_Gvf0gqXiZkhH3_SVFn4IDGpWYoFBS9nlVaqB8Ejb9vIIhBmWS0QSYch9dFR9_SoPaaTg";

function configured(): boolean {
  return Boolean(FIREBASE_CONFIG.projectId && VAPID_KEY);
}

async function messagingOrNull() {
  if (typeof window === "undefined" || !configured() || !(await isSupported())) return null;
  const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
  return getMessaging(app);
}

/** 권한 요청 → SW 등록 → FCM 토큰. 거부·미지원·미설정이면 null */
export async function obtainPushToken(): Promise<string | null> {
  const messaging = await messagingOrNull();
  if (!messaging) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
}

/** 로그아웃용 — 현재 토큰을 지우고 그 값을 돌려준다(서버 해제 호출에 필요) */
export async function removePushToken(): Promise<string | null> {
  const messaging = await messagingOrNull();
  if (!messaging) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
    if (!registration) return null;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    await deleteToken(messaging);
    return token;
  } catch {
    return null;
  }
}
