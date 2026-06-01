"use client";

import { type ReactNode } from "react";
import { Header } from "./Header";
import { CartDrawer } from "./CartDrawer";
import { SubscribeForm } from "./SubscribeForm";
import { useCart } from "@/app/contexts/cart-context";

export function GlobalShell({ children }: { children: ReactNode }) {
  const {
    cartItems,
    totalPrice,
    totalSavings,
    isCartOpen,
    isSubscribeOpen,
    toastMessage,
    setIsCartOpen,
    setIsSubscribeOpen,
    handleUpdateQuantity,
    handleRemoveItem,
    copyShareUrl,
  } = useCart();

  return (
    <>
      <Header />
      {children}

      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        totalPrice={totalPrice}
        totalSavings={totalSavings}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onShare={copyShareUrl}
      />

      {isSubscribeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-bold text-gray-900">알림 구독</h2>
              <button
                type="button"
                onClick={() => setIsSubscribeOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4">
              <SubscribeForm />
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </>
  );
}
