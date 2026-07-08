import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "설교 준비 도우미",
  description:
    "성경 본문 원어 분석 · 영적 통찰 · 번역본 비교 · 유대 문헌 · 주석 강해 · 설교 개요를 한 곳에서. 설교자를 위한 본문 연구 도구.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "설교 도우미",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#9a7322",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="font-sans text-ink-900 antialiased">{children}</body>
    </html>
  );
}
