"use client";

import type { CartItem } from "@/domain/entities/cart";
import { MAX_QUANTITY } from "@/lib/constants";
import { SavingsBadge } from "./SavingsBadge";

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  totalPrice: number;
  totalSavings: number;
  onClose: () => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onShare: () => void;
}

export function CartDrawer({
  isOpen,
  items,
  totalPrice,
  totalSavings,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onShare,
}: CartDrawerProps) {

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">장바구니 ({items.length})</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">
              장바구니가 비어있습니다.
            </p>
          )}
          {items.map(({ product, quantity }) => (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">
                  {product.store} · {product.eventType}
                </p>
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="text-sm font-bold">
                  {product.price.toLocaleString("ko-KR")}원
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    quantity > 1
                      ? onUpdateQuantity(product.id, quantity - 1)
                      : onRemoveItem(product.id)
                  }
                  className="h-6 w-6 rounded border text-sm hover:bg-gray-100"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateQuantity(product.id, Math.min(quantity + 1, MAX_QUANTITY))
                  }
                  className="h-6 w-6 rounded border text-sm hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t px-4 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">합계</span>
            <span className="font-bold">
              {totalPrice.toLocaleString("ko-KR")}원
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">절약액</span>
            <SavingsBadge savings={totalSavings} />
          </div>
          <button
            type="button"
            onClick={onShare}
            disabled={items.length === 0}
            className="w-full rounded-lg border border-indigo-600 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
          >
            공유 링크 복사
          </button>
        </div>
      </aside>
    </>
  );
}
