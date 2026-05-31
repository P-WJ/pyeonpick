"use client";

import type { CartItem } from "@/domain/entities/cart";
import { MAX_QUANTITY, STORE_COLORS, EVENT_TYPE_BADGES } from "@/lib/constants";
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

  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">장바구니</h2>
            {totalItemCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                {totalItemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="장바구니 닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 아이템 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-3 text-5xl">🛒</div>
              <p className="text-sm font-medium text-gray-500">장바구니가 비어있어요</p>
              <p className="mt-1 text-xs text-gray-400">행사 상품을 담아보세요!</p>
            </div>
          )}
          {items.map(({ product, quantity }) => {
            const storeColors = STORE_COLORS[product.store];
            const eventBadge = EVENT_TYPE_BADGES[product.eventType];
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        backgroundColor: storeColors.secondary,
                        color: storeColors.primary,
                      }}
                    >
                      {product.store}
                    </span>
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        backgroundColor: eventBadge.backgroundColor,
                        color: eventBadge.textColor,
                      }}
                    >
                      {eventBadge.label}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-gray-900">
                    {product.name}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {product.price.toLocaleString("ko-KR")}원
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(product.id)}
                    className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    삭제
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        quantity > 1
                          ? onUpdateQuantity(product.id, quantity - 1)
                          : onRemoveItem(product.id)
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(product.id, Math.min(quantity + 1, MAX_QUANTITY))
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 고정 영역 */}
        <div className="border-t bg-white px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">총 금액</span>
            <span className="text-lg font-bold text-gray-900">
              {totalPrice.toLocaleString("ko-KR")}원
            </span>
          </div>
          {totalSavings > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">행사 절약액</span>
              <SavingsBadge savings={totalSavings} />
            </div>
          )}
          <button
            type="button"
            onClick={onShare}
            disabled={items.length === 0}
            className="w-full rounded-xl border-2 border-blue-600 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            공유 링크 복사
          </button>
        </div>
      </aside>
    </>
  );
}
