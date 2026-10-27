/**
 * 카카오톡 공유 (Kakao JavaScript SDK 래퍼, 브라우저 전용).
 * SDK 스크립트는 app/layout.tsx에서 NEXT_PUBLIC_KAKAO_JS_KEY가 있을 때만 로드한다.
 * Kakao Developers 앱의 [플랫폼 > Web]에 사이트 도메인이 등록돼 있어야 공유가 동작한다.
 */

export const KAKAO_SDK_VERSION = "2.8.3";
export const KAKAO_SDK_URL = `https://t1.kakaocdn.net/kakao_js_sdk/${KAKAO_SDK_VERSION}/kakao.min.js`;
export const KAKAO_SDK_INTEGRITY =
  "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy";

interface KakaoShareLink {
  mobileWebUrl: string;
  webUrl: string;
}

interface KakaoSdk {
  init: (appKey: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (template: {
      objectType: "feed";
      content: { title: string; description: string; imageUrl: string; link: KakaoShareLink };
      buttons: { title: string; link: KakaoShareLink }[];
    }) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export interface KakaoShareContent {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  buttonTitle: string;
}

/** SDK가 로드돼 있고 키가 설정돼 있으면 초기화된 SDK를, 아니면 null을 반환한다. */
function getInitializedKakao(): KakaoSdk | null {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const kakao = typeof window !== "undefined" ? window.Kakao : undefined;
  if (!appKey || !kakao) return null;
  if (!kakao.isInitialized()) kakao.init(appKey);
  return kakao;
}

export function isKakaoShareAvailable(): boolean {
  return getInitializedKakao() !== null;
}

/** 카카오톡 공유 창을 연다. SDK를 쓸 수 없으면 false. */
export function shareToKakao(content: KakaoShareContent): boolean {
  const kakao = getInitializedKakao();
  if (!kakao) return false;

  const link = { mobileWebUrl: content.url, webUrl: content.url };
  kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: content.title,
      description: content.description,
      imageUrl: content.imageUrl,
      link,
    },
    buttons: [{ title: content.buttonTitle, link }],
  });
  return true;
}
