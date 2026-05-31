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

export const MAX_QUANTITY = 10;
export const PRODUCTS_FETCH_LIMIT = 10000;
