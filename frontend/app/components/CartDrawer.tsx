"use client";

import { useState, useCallback } from "react";
import type { CartItem } from "@/domain/entities/cart";
import { MAX_QUANTITY, STORE_COLORS } from "@/lib/constants";
import { SavingsBadge } from "./SavingsBadge";
import { EventBadge } from "./EventBadge";

const HIGHLIGHT_DURATION_MS = 500;

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  totalPrice: number;
  totalSavings: number;
  onClose: () => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
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
  onClearCart,
  onShare,
}: CartDrawerProps) {
  const [changedItemId, setChangedItemId] = useState<number | null>(null);
  const [deletedItemToast, setDeletedItemToast] = useState<string | null>(null);

  const triggerHighlight = useCallback((productId: number) => {
    setChangedItemId(productId);
    setTimeout(() => setChangedItemId(null), HIGHLIGHT_DURATION_MS);
  }, []);

  function handleDecrement(
    productId: number,
    productName: string,
    quantity: number,
  ) {
    if (quantity > 1) {
      onUpdateQuantity(productId, quantity - 1);
      triggerHighlight(productId);
    } else {
      onRemoveItem(productId);
      setDeletedItemToast(`${productName}이(가) 삭제되었습니다.`);
      setTimeout(() => setDeletedItemToast(null), 2000);
    }
  }

  function handleIncrement(productId: number, quantity: number) {
    onUpdateQuantity(productId, Math.min(quantity + 1, MAX_QUANTITY));
    triggerHighlight(productId);
  }

  if (!isOpen) return null;

  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {deletedItemToast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {deletedItemToast}
        </div>
      )}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">장바구니</h2>
            {totalItemCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white">
                {totalItemCount}
              </span>
            )}
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors duration-150 ml-1"
              >
                비우기
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-150"
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
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="mb-4 text-5xl">🛒</div>
              <p className="font-medium text-gray-900">
                장바구니가 비었어요
              </p>
              <p className="mt-1 text-sm text-gray-400">
                행사 상품을 담아 얼마나 절약되는지 확인해보세요
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 min-h-[44px]"
              >
                상품 보러가기
              </button>
            </div>
          )}
          {items.map(({ product, quantity }) => {
            const storeColors = STORE_COLORS[product.store];
            const isHighlighted = changedItemId === product.id;
            return (
              <div
                key={product.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors duration-300 ${
                  isHighlighted ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: storeColors.secondary,
                        color: storeColors.primary,
                      }}
                    >
                      {product.store}
                    </span>
                    <EventBadge eventType={product.eventType} />
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
                    className="text-[11px] text-gray-400 hover:text-red-500 transition-colors duration-150"
                  >
                    삭제
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleDecrement(product.id, product.name, quantity)
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 active:scale-[0.95] transition-all duration-150"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-gray-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleIncrement(product.id, quantity)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 active:scale-[0.95] transition-all duration-150"
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
        <div className="border-t border-gray-100 bg-white px-5 py-4 space-y-3">
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
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            공유하기
          </button>
        </div>
      </aside>
    </>
  );
}
