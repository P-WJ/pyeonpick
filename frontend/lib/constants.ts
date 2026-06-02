import type { Store, EventType, Category } from "@/domain/entities/product";

export const STORES: Store[] = ["CU", "GS25", "세븐일레븐", "이마트24", "씨스페이스"];
export const EVENT_TYPES: EventType[] = ["1+1", "2+1", "3+1", "할인", "증정"];
export const CATEGORIES: Category[] = ["음료", "과자", "식품", "아이스크림", "생활용품"];

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
