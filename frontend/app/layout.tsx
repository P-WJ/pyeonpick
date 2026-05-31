import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "편픽 — 편의점 행사 비교",
  description: "CU, GS25, 세븐일레븐, 이마트24 1+1·2+1 행사상품 한눈에 비교",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
