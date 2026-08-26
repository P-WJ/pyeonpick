"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Product } from "@/domain/entities/product";
import type { CartItem } from "@/domain/entities/cart";
import {
  addToCart,
  updateQuantity,
  removeItem,
  calculateTotalPrice,
} from "@/app/use-cases/cart-manager";
import { calculateSavings, buildShareUrl } from "@/domain/use-cases/cart";

const CART_STORAGE_KEY = "cvs-cart-v1";
const WISHLIST_STORAGE_KEY = "cvs-wishlist-v1";
const TOAST_DURATION_MS = 2500;

interface CartContextValue {
  cartItems: CartItem[];
  wishlistIds: number[];
  isCartOpen: boolean;
  toastMessage: string | null;
  cartCount: number;
  totalPrice: number;
  totalSavings: number;
  cartBounceTrigger: boolean;
  setIsCartOpen: (open: boolean) => void;
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  handleAddToCart: (product: Product) => void;
  handleAddMultipleToCart: (products: Product[]) => void;
  handleUpdateQuantity: (productId: number, quantity: number) => void;
  handleRemoveItem: (productId: number) => void;
  handleToggleWishlist: (product: Product) => void;
  clearCart: () => void;
  copyShareUrl: () => void;
  showToast: (message: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cartBounceTrigger, setCartBounceTrigger] = useState(false);

  // 첫 번째 save 실행을 건너뛰기 위한 플래그 (복원 전 초기 [] 로 덮어쓰기 방지)
  const isFirstCartSave = useRef(true);
  const isFirstWishlistSave = useRef(true);

  // 복원
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setCartItems(JSON.parse(stored) as CartItem[]);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) setWishlistIds(JSON.parse(stored) as number[]);
    } catch {}
  }, []);

  // 저장 (첫 렌더의 빈 초기값은 저장 건너뜀)
  useEffect(() => {
    if (isFirstCartSave.current) { isFirstCartSave.current = false; return; }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (isFirstWishlistSave.current) { isFirstWishlistSave.current = false; return; }
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  function triggerBounce() {
    setCartBounceTrigger(true);
    const timer = setTimeout(() => setCartBounceTrigger(false), 500);
    return () => clearTimeout(timer);
  }

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  }

  function handleAddToCart(product: Product) {
    setCartItems((prev) => addToCart(prev, product));
    showToast(`${product.name}을(를) 담았습니다.`);
    triggerBounce();
  }

  function handleAddMultipleToCart(productsToAdd: Product[]) {
    setCartItems((prev) => {
      let updated = prev;
      for (const product of productsToAdd) {
        updated = addToCart(updated, product);
      }
      return updated;
    });
    showToast(`${productsToAdd.length}개 상품을 장바구니에 담았습니다.`);
    triggerBounce();
  }

  function handleUpdateQuantity(productId: number, quantity: number) {
    setCartItems((prev) => updateQuantity(prev, productId, quantity));
  }

  function handleRemoveItem(productId: number) {
    setCartItems((prev) => removeItem(prev, productId));
  }

  function handleToggleWishlist(product: Product) {
    setWishlistIds((prev) =>
      prev.includes(product.id)
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]
    );
  }

  function clearCart() {
    setCartItems([]);
  }

  function copyShareUrl() {
    const url = buildShareUrl(cartItems);
    if (!navigator.clipboard) {
      showToast("이 브라우저에서는 링크 복사를 지원하지 않습니다.");
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => showToast("공유 링크가 복사됐습니다."))
      .catch(() => showToast("링크 복사에 실패했습니다. 주소창에서 직접 복사해주세요."));
  }

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = calculateTotalPrice(cartItems);
  const totalSavings = calculateSavings(cartItems);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        wishlistIds,
        isCartOpen,
        toastMessage,
        cartCount,
        totalPrice,
        totalSavings,
        cartBounceTrigger,
        setIsCartOpen,
        setCartItems,
        handleAddToCart,
        handleAddMultipleToCart,
        handleUpdateQuantity,
        handleRemoveItem,
        handleToggleWishlist,
        clearCart,
        copyShareUrl,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
