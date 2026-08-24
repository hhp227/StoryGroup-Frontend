"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 프로필/비밀번호가 설정 하위 페이지로 옮겨가면서 기존 링크 호환용 리다이렉트만 남긴다.
export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/profile");
  }, [router]);

  return null;
}
