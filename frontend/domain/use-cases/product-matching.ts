import type { Product, Store } from "@/domain/entities/product";
import { calculatePriceBenefit, type PriceBenefit } from "./price";

// 제조사 접두사(예: "진주햄)", "CJ]") — 비괄호 1~6자 + 닫는 괄호
const MANUFACTURER_PREFIX = /^[^\])]{1,6}[\])]/;
const NON_NAME_CHARS = /[^0-9a-z가-힣]/g;

/**
 * 매장 간 동일 상품 판별용 정규화 키를 만든다 (순수 함수).
 * - 소문자화
 * - 괄호/대괄호 내용 제거 (용량 표기 "(대)" 등 매장별 변형 흡수)
 * - 제조사 접두사 제거 ("진주햄)", "CJ]" 등 매장마다 다른 표기 흡수)
 * - 한글·영숫자 외 문자 제거 (공백·기호·ml/ML 대소문자 차이 흡수)
 *
 * 예) "진주햄)천하장사28g", "진주)천하장사28G", "진주햄]천하장사28g" → "천하장사28g"
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(MANUFACTURER_PREFIX, "")
    .replace(NON_NAME_CHARS, "");
}

/**
 * DB ilike 후보 조회에 쓸 핵심 토큰을 추출한다 (용량/수량 앞의 상품 코어).
 * 정규화 키는 SQL에서 만들 수 없으므로, 이 코어로 후보군을 좁힌 뒤
 * 애플리케이션에서 normalizeProductName 동치 비교로 정밀 매칭한다.
 *
 * 예) "진주햄)천하장사28g" → "천하장사", "코카)코카콜라제로500ml" → "코카콜라제로"
 */
export function extractSearchCore(name: string): string {
  const stripped = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(MANUFACTURER_PREFIX, "");
  const firstDigitIndex = stripped.search(/[0-9]/);
  const core = firstDigitIndex > 1 ? stripped.slice(0, firstDigitIndex) : stripped;
  return core.replace(NON_NAME_CHARS, "");
}

export interface StoreComparisonRow {
  store: Store;
  product: Product;
  benefit: PriceBenefit;
  isLowest: boolean; // 개당가가 가장 낮은(최저가) 매장인지
}

/**
 * 매장 간 동일 상품 후보들을 매장별 1행(개당가가 가장 낮은 상품)으로 정리하고
 * 개당가 오름차순으로 정렬한다. 최저 개당가 매장에 isLowest 표시.
 */
export function buildStoreComparison(products: Product[]): StoreComparisonRow[] {
  const bestByStore = new Map<Store, StoreComparisonRow>();

  for (const product of products) {
    const benefit = calculatePriceBenefit(product.price, product.eventType);
    const existing = bestByStore.get(product.store);
    if (!existing || benefit.unitPrice < existing.benefit.unitPrice) {
      bestByStore.set(product.store, {
        store: product.store,
        product,
        benefit,
        isLowest: false,
      });
    }
  }

  const rows = [...bestByStore.values()].sort(
    (a, b) => a.benefit.unitPrice - b.benefit.unitPrice
  );

  const lowestUnitPrice = rows[0]?.benefit.unitPrice;
  for (const row of rows) {
    row.isLowest = row.benefit.unitPrice === lowestUnitPrice;
  }

  return rows;
}
