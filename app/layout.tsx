import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "설교 준비 어시스트",
  description:
    "정확한 본문 해석부터 신학적 통찰, 설교 유산, 삶의 적용, 설교 설계와 최종 검토까지 연결하는 설교 준비 도구.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "설교 어시스트",
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
