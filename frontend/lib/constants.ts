import type { Store, EventType, Category, ProductSort } from "@/domain/entities/product";

/** 서비스가 다루는 전체 편의점. API 입력 검증·색상 매핑 등 과거 데이터까지 포함하는 곳에서 쓴다. */
export const STORES: Store[] = ["CU", "GS25", "세븐일레븐", "이마트24", "씨스페이스"];

/**
 * 현재 데이터 수집이 중단된 편의점.
 * GS25: 2026-08-26 확인 — 공식 행사상품 페이지(gs25.gsretail.com)가 폐쇄되고
 * 가맹점주용 페이지로 리다이렉트되어 수집할 출처가 없다.
 */
export const SUSPENDED_STORES: Store[] = ["GS25"];

export const SUSPENDED_STORE_NOTICE =
  "GS25는 공식 행사상품 페이지가 닫혀 현재 정보를 받아오지 못하고 있어요.";

/** 실제로 데이터가 갱신되는 편의점. 필터·구독·추천 등 사용자 선택지에는 이쪽을 쓴다. */
export const ACTIVE_STORES: Store[] = STORES.filter(
  (store) => !SUSPENDED_STORES.includes(store)
);
export const EVENT_TYPES: EventType[] = ["1+1", "2+1", "3+1", "할인", "증정"];
export const CATEGORIES: Category[] = ["음료", "과자", "식품", "아이스크림", "생활용품"];

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "price_asc", label: "저가순" },
  { value: "discount", label: "할인율순" },
];

export const EVENT_TYPE_COLORS: Record<string, string> = {
  "1+1": "bg-red-500",
  "2+1": "bg-orange-500",
  "3+1": "bg-yellow-500",
  "할인": "bg-blue-500",
  "증정": "bg-green-500",
};

export interface StoreColorConfig {
  primary: string;
  secondary: string;
  text: string;
}

export const STORE_COLORS: Record<Store, StoreColorConfig> = {
  CU: {
    primary: "#7C3AED", // Signature Violet
    secondary: "#F5F3FF",
    text: "#7C3AED",
  },
  GS25: {
    primary: "#0EA5E9", // Sleek Cyan Blue
    secondary: "#F0F9FF",
    text: "#0369A1",
  },
  세븐일레븐: {
    primary: "#10B981", // Modern Green
    secondary: "#ECFDF5",
    text: "#047857",
  },
  이마트24: {
    primary: "#F59E0B", // High-fidelity Golden Yellow
    secondary: "#FEF3C7",
    text: "#B45309", // High contrast brown-orange for legibility
  },
  씨스페이스: {
    primary: "#0D9488", // Emerald Teal
    secondary: "#F0FDFA",
    text: "#0F766E",
  },
};

export interface EventTypeBadgeConfig {
  bg: string;
  color: string;
  label: string;
}

export const EVENT_TYPE_BADGES: Record<EventType, EventTypeBadgeConfig> = {
  "1+1": { bg: "#FEE2E2", color: "#B91C1C", label: "1+1" },
  "2+1": { bg: "#FFEDD5", color: "#C2410C", label: "2+1" },
  "3+1": { bg: "#FEF9C3", color: "#A16207", label: "3+1" },
  "할인": { bg: "#DBEAFE", color: "#1D4ED8", label: "할인" },
  "증정": { bg: "#DCFCE7", color: "#15803D", label: "증정" },
};

export const EVENT_BENEFIT_TEXT: Record<string, string | null> = {
  "1+1": "1개 가격에 2개",
  "2+1": "3개 구매 시 1개 무료",
  "3+1": "4개 구매 시 1개 무료",
  "할인": null,
  "증정": "증정품 제공",
};

export const MAX_QUANTITY = 10;
export const PRODUCTS_PAGE_LIMIT = 24;
export const RELATED_PRODUCTS_LIMIT = 6;
