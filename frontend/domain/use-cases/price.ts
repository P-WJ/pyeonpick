import type { EventType } from "@/domain/entities/product";

export interface PriceBenefit {
  listedPrice: number;       // DB에 저장된 표시 가격
  requiredQuantity: number;  // 행사 혜택을 받기 위한 최소 구매 수량
  totalQuantity: number;     // 실제로 받는 수량
  totalCost: number;         // 총 지불 금액
  unitPrice: number;         // 개당 실질 단가
  savings: number;           // 절약 금액
  savingsRate: number;       // 절약률 (0~100)
  benefitDescription: string;
}

export function calculatePriceBenefit(
  price: number,
  eventType: EventType
): PriceBenefit {
  switch (eventType) {
    case "1+1":
      return {
        listedPrice: price,
        requiredQuantity: 1,
        totalQuantity: 2,
        totalCost: price,
        unitPrice: Math.floor(price / 2),
        savings: price,
        savingsRate: 50,
        benefitDescription: "1개 구매 시 1개 무료",
      };
    case "2+1":
      return {
        listedPrice: price,
        requiredQuantity: 2,
        totalQuantity: 3,
        totalCost: price * 2,
        unitPrice: Math.floor((price * 2) / 3),
        savings: price,
        savingsRate: 33,
        benefitDescription: "2개 구매 시 1개 무료",
      };
    case "3+1":
      return {
        listedPrice: price,
        requiredQuantity: 3,
        totalQuantity: 4,
        totalCost: price * 3,
        unitPrice: Math.floor((price * 3) / 4),
        savings: price,
        savingsRate: 25,
        benefitDescription: "3개 구매 시 1개 무료",
      };
    case "할인":
      return {
        listedPrice: price,
        requiredQuantity: 1,
        totalQuantity: 1,
        totalCost: price,
        unitPrice: price,
        savings: 0,
        savingsRate: 0,
        benefitDescription: "할인 행사 중",
      };
    case "증정":
      return {
        listedPrice: price,
        requiredQuantity: 1,
        totalQuantity: 1,
        totalCost: price,
        unitPrice: price,
        savings: 0,
        savingsRate: 0,
        benefitDescription: "구매 시 사은품 증정",
      };
  }
}
