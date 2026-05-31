import type { CartItem } from "@/domain/entities/cart";
import type { Product } from "@/domain/entities/product";
import { MAX_QUANTITY } from "@/lib/constants";

export function addToCart(items: CartItem[], product: Product): CartItem[] {
  const existing = items.find((item) => item.product.id === product.id);
  if (existing) {
    return items.map((item) =>
      item.product.id === product.id
        ? { ...item, quantity: Math.min(item.quantity + 1, MAX_QUANTITY) }
        : item
    );
  }
  return [...items, { product, quantity: 1 }];
}

export function updateQuantity(
  items: CartItem[],
  productId: number,
  quantity: number
): CartItem[] {
  return items.map((item) =>
    item.product.id === productId ? { ...item, quantity } : item
  );
}

export function removeItem(items: CartItem[], productId: number): CartItem[] {
  return items.filter((item) => item.product.id !== productId);
}

export function calculateTotalPrice(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}
