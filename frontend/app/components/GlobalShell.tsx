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
    clearCart,
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
        onClearCart={clearCart}
        onShare={copyShareUrl}
      />

      {isSubscribeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-pulse-slow">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden transform transition-all scale-100 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100/60 px-6 py-4.5">
              <h2 className="text-base font-extrabold text-gray-900">알림 구독</h2>
              <button
                type="button"
                onClick={() => setIsSubscribeOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-50 rounded-xl"
                aria-label="닫기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <SubscribeForm />
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-gray-950/95 backdrop-blur-md border border-white/10 px-5.5 py-3.5 text-xs font-bold text-white shadow-2xl transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </>
  );
}
