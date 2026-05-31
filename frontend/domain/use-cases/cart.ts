import type { CartItem } from "@/domain/entities/cart";

const ONE_PLUS_ONE_BONUS_RATIO = 1;
const TWO_PLUS_ONE_BONUS_RATIO = 0.5;

export function calculateSavings(items: CartItem[]): number {
  return items.reduce((total, item) => {
    let bonusRatio = 0;
    if (item.product.eventType === "1+1") bonusRatio = ONE_PLUS_ONE_BONUS_RATIO;
    else if (item.product.eventType === "2+1") bonusRatio = TWO_PLUS_ONE_BONUS_RATIO;
    return total + item.product.price * bonusRatio * item.quantity;
  }, 0);
}

export function buildShareUrl(items: CartItem[]): string {
  const ids = items.map((item) => item.product.id).join(",");
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/?cart=${encodeURIComponent(ids)}`;
}
