import type { Store, EventType, Category } from "@/domain/entities/product";

export const STORES: Store[] = ["CU", "GS25", "세븐일레븐", "이마트24", "씨스페이스"];
export const EVENT_TYPES: EventType[] = ["1+1", "2+1", "3+1", "할인", "증정"];
export const CATEGORIES: Category[] = ["음료", "과자", "간편식사", "아이스크림", "생활용품", "기타"];

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
  backgroundColor: string;
  textColor: string;
  label: string;
}

export const EVENT_TYPE_BADGES: Record<EventType, EventTypeBadgeConfig> = {
  "1+1": {
    backgroundColor: "#EF4444",
    textColor: "#FFFFFF",
    label: "1+1",
  },
  "2+1": {
    backgroundColor: "#F97316",
    textColor: "#FFFFFF",
    label: "2+1",
  },
  "3+1": {
    backgroundColor: "#EAB308",
    textColor: "#FFFFFF",
    label: "3+1",
  },
  "할인": {
    backgroundColor: "#3B82F6",
    textColor: "#FFFFFF",
    label: "할인",
  },
  "증정": {
    backgroundColor: "#22C55E",
    textColor: "#FFFFFF",
    label: "증정",
  },
};

export const MAX_QUANTITY = 10;
export const PRODUCTS_FETCH_LIMIT = 10000;
