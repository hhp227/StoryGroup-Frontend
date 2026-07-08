import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev 서버를 localhost 밖에서 열 때(폰 테스트용 cloudflared 터널/LAN IP) 필요.
  // 프로덕션 빌드에는 영향 없음.
  allowedDevOrigins: ["*.trycloudflare.com", "192.168.1.104"],
};

export default nextConfig;
