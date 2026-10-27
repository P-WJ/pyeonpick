import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { KAKAO_SDK_URL, KAKAO_SDK_INTEGRITY } from "@/infrastructure/kakao-share";
import { SessionProvider } from "./components/SessionProvider";
import { CartProvider } from "./contexts/cart-context";
import { GlobalShell } from "./components/GlobalShell";

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
      <body suppressHydrationWarning>
        <SessionProvider>
          <CartProvider>
            <GlobalShell>{children}</GlobalShell>
          </CartProvider>
        </SessionProvider>
        {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
          <Script
            src={KAKAO_SDK_URL}
            integrity={KAKAO_SDK_INTEGRITY}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}
      </body>
    </html>
  );
}
