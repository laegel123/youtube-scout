import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TubeScout",
  description:
    "시드 영상으로 비슷한 영상을 찾아 정량 지표로 비교·순위화하고 다음 콘텐츠를 추천합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
