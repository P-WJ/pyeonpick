export type Store = "CU" | "GS25" | "세븐일레븐" | "이마트24" | "씨스페이스";
export type EventType = "1+1" | "2+1" | "3+1" | "할인" | "증정";
export type Category = "음료" | "과자" | "식품" | "아이스크림" | "생활용품";
export type ProductSort = "recommended" | "price_asc" | "discount";

export interface Product {
  id: number;
  store: Store;
  name: string;
  price: number;
  eventType: EventType;
  category: Category;
  imageUrl: string;
  validFrom: string;
  validTo: string;
}
