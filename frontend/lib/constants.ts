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
    primary: "#0051D4",
    secondary: "#E8F0FD",
    text: "#0051D4",
  },
  GS25: {
    primary: "#003DA5",
    secondary: "#FFA500",
    text: "#003DA5",
  },
  세븐일레븐: {
    primary: "#007A3D",
    secondary: "#E8000D",
    text: "#007A3D",
  },
  이마트24: {
    primary: "#E60012",
    secondary: "#FFE8EA",
    text: "#E60012",
  },
  씨스페이스: {
    primary: "#6B21A8",
    secondary: "#F3E8FF",
    text: "#6B21A8",
  },
};

export interface EventTypeBadgeConfig {
  gradient: string;
  label: string;
  prefix?: string;
  extraClassName?: string;
}

export const EVENT_TYPE_BADGES: Record<EventType, EventTypeBadgeConfig> = {
  "1+1": {
    gradient: "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
    label: "1+1",
  },
  "2+1": {
    gradient: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
    label: "2+1",
  },
  "3+1": {
    gradient: "linear-gradient(135deg, #EAB308 0%, #F97316 100%)",
    label: "3+1",
    extraClassName: "ring-2 ring-yellow-300",
  },
  "할인": {
    gradient: "linear-gradient(135deg, #3B82F6 0%, #1E3A8A 100%)",
    label: "할인",
    prefix: "%",
  },
  "증정": {
    gradient: "linear-gradient(135deg, #22C55E 0%, #059669 100%)",
    label: "증정",
    prefix: "🎁",
  },
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
