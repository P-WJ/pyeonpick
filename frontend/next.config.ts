import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "tqklhszfkvzk6518638.edge.naverncp.com" }, // CU
      { hostname: "image.woodongs.com" },                      // GS25
      { hostname: "www.7-eleven.co.kr" },                      // 세븐일레븐
      { hostname: "msave.emart24.co.kr" },                     // 이마트24
      { hostname: "www.cspace.co.kr" },                        // 씨스페이스
      { hostname: "img1.kakaocdn.net" },                        // 카카오 프로필
      { hostname: "k.kakaocdn.net" },                           // 카카오 프로필
    ],
  },
};

export default nextConfig;
