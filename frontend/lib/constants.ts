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
    primary: "#4F46E5",
    secondary: "#EEEFFE",
    text: "#4F46E5",
  },
  GS25: {
    primary: "#1D4ED8",
    secondary: "#EFF6FF",
    text: "#1D4ED8",
  },
  세븐일레븐: {
    primary: "#16A34A",
    secondary: "#F0FDF4",
    text: "#16A34A",
  },
  이마트24: {
    primary: "#DC2626",
    secondary: "#FEF2F2",
    text: "#DC2626",
  },
  씨스페이스: {
    primary: "#7C3AED",
    secondary: "#F5F3FF",
    text: "#7C3AED",
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
