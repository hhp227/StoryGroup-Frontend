import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { AppHeader } from "@/components/app-header";
import { PushRegister } from "@/components/push-register";

export const metadata: Metadata = {
  title: "StoryGroup",
  description: "친한 사람들끼리만 모이는 폐쇄형 그룹 SNS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        {/* 라이트/다크·무드 플래시 방지: hydration 전에 동기 실행되어 <html>에 속성을 먼저 세팅한다 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          <AuthProvider>
            <PushRegister />
            <AppHeader />
            <main>{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
