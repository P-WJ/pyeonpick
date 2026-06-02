"use client";

import { type ReactNode } from "react";
import { Header } from "./Header";
import { CartDrawer } from "./CartDrawer";
import { useCart } from "@/app/contexts/cart-context";

export function GlobalShell({ children }: { children: ReactNode }) {
  const {
    cartItems,
    totalPrice,
    totalSavings,
    isCartOpen,
    toastMessage,
    setIsCartOpen,
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

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-gray-950/95 backdrop-blur-md border border-white/10 px-5.5 py-3.5 text-xs font-bold text-white shadow-2xl transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </>
  );
}
