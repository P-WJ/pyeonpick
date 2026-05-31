"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product } from "@/domain/entities/product";
import type { CartItem } from "@/domain/entities/cart";
import { buildShareUrl, calculateSavings } from "@/domain/use-cases/cart";
import {
  addToCart,
  updateQuantity,
  removeItem,
  calculateTotalPrice,
} from "@/app/use-cases/cart-manager";
import { FilterBar, type ActiveFilters } from "./components/FilterBar";
import { ProductCard } from "./components/ProductCard";
import { CartDrawer } from "./components/CartDrawer";

const CART_STORAGE_KEY = "cvs-cart-v1";
const SKELETON_COUNT = 10;

const INITIAL_FILTERS: ActiveFilters = {
  store: "",
  eventType: "",
  category: "",
  search: "",
};

function buildSearchParams(filters: ActiveFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.store) params.set("store", filters.store);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  return params;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(INITIAL_FILTERS);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setCartItems(JSON.parse(stored) as CartItem[]);
    } catch {
      // 손상된 데이터는 무시
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setFetchError(null);
    try {
      const params = buildSearchParams(filters);
      const response = await fetch(`/api/products?${params.toString()}`);
      const json = (await response.json()) as {
        data: Product[] | null;
        error: string | null;
      };
      if (json.error) throw new Error(json.error);
      setProducts(json.data ?? []);
    } catch (error) {
      setFetchError(
        error instanceof Error ? error.message : "상품을 불러오지 못했습니다."
      );
    } finally {
      setIsLoadingProducts(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function handleAddToCart(product: Product) {
    setCartItems((prev) => addToCart(prev, product));
  }

  function handleUpdateQuantity(productId: number, quantity: number) {
    setCartItems((prev) => updateQuantity(prev, productId, quantity));
  }

  function handleRemoveItem(productId: number) {
    setCartItems((prev) => removeItem(prev, productId));
  }

  function copyShareUrl() {
    const url = buildShareUrl(cartItems);
    navigator.clipboard.writeText(url).then(() => alert("공유 링크가 복사됐습니다."));
  }

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = calculateTotalPrice(cartItems);
  const totalSavings = calculateSavings(cartItems);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-indigo-600">편픽 🛒</h1>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white"
          >
            장바구니
            {totalCartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <FilterBar filters={filters} onFilterChange={setFilters} />

        {isLoadingProducts && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-xl bg-gray-200"
              />
            ))}
          </div>
        )}

        {fetchError && (
          <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">
            {fetchError}
          </div>
        )}

        {!isLoadingProducts && !fetchError && products.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-20">
            조건에 맞는 상품이 없습니다.
          </p>
        )}

        {!isLoadingProducts && products.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

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
    </div>
  );
}
