"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Product } from "@/domain/entities/product";
import { STORE_COLORS } from "@/lib/constants";
import { EventBadge } from "./EventBadge";

const PLACEHOLDER_IMAGE = "/placeholder.png";

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

interface RelatedProductsState {
  items: Product[];
  isLoading: boolean;
}

function RelatedProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  const storeColors = STORE_COLORS[product.store];

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="min-w-[120px] w-[120px] flex-shrink-0 flex flex-col gap-1 rounded-xl bg-white border border-gray-100 p-2 text-left hover:border-gray-300 transition-colors"
    >
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-50">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain"
          unoptimized={!product.imageUrl}
        />
      </div>
      <EventBadge eventType={product.eventType} className="text-[10px] px-1.5 py-0.5" />
      <p className="text-xs text-gray-800 line-clamp-2 leading-tight">{product.name}</p>
      <p className="text-xs font-bold" style={{ color: storeColors.primary }}>
        {product.price.toLocaleString("ko-KR")}원
      </p>
    </button>
  );
}

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [relatedProductsState, setRelatedProductsState] =
    useState<RelatedProductsState>({ items: [], isLoading: false });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const displayedProduct = selectedProduct ?? product;

  useEffect(() => {
    if (!displayedProduct) return;

    setRelatedProductsState({ items: [], isLoading: true });

    const controller = new AbortController();

    async function fetchRelatedProducts() {
      try {
        const response = await fetch(
          `/api/products/${displayedProduct!.id}/related`,
          { signal: controller.signal }
        );
        const json = (await response.json()) as {
          data: Product[] | null;
          error: string | null;
        };
        if (!json.error) {
          setRelatedProductsState({ items: json.data ?? [], isLoading: false });
        } else {
          setRelatedProductsState({ items: [], isLoading: false });
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setRelatedProductsState({ items: [], isLoading: false });
      }
    }

    fetchRelatedProducts();
    return () => controller.abort();
  }, [displayedProduct?.id]);

  useEffect(() => {
    setSelectedProduct(null);
  }, [product]);

  useEffect(() => {
    if (!product) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;
  if (!displayedProduct) return null;

  const storeColors = STORE_COLORS[displayedProduct.store];

  function handleAddToCart() {
    onAddToCart(displayedProduct!);
    onClose();
  }

  function handleSelectRelatedProduct(relatedProduct: Product) {
    setSelectedProduct(relatedProduct);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-h-[90vh] rounded-t-2xl sm:max-w-lg sm:rounded-2xl sm:max-h-[85vh] bg-white overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 이미지 영역 */}
        <div className="relative aspect-square w-full bg-gray-50">
          <Image
            src={displayedProduct.imageUrl || PLACEHOLDER_IMAGE}
            alt={displayedProduct.name}
            fill
            className="object-contain"
            unoptimized={!displayedProduct.imageUrl}
          />
        </div>

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-900 hover:bg-white shadow-sm transition-colors"
          aria-label="닫기"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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

        {/* 상세 정보 */}
        <div className="p-5 flex flex-col gap-3">
          {/* 편의점 + 행사 뱃지 */}
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: storeColors.primary }}
            >
              {displayedProduct.store}
            </span>
            <EventBadge eventType={displayedProduct.eventType} />
          </div>

          {/* 상품명 */}
          <h2 className="text-xl font-bold text-gray-900 leading-snug">
            {displayedProduct.name}
          </h2>

          {/* 가격 */}
          <p className="text-2xl font-black" style={{ color: storeColors.primary }}>
            {displayedProduct.price.toLocaleString("ko-KR")}
            <span className="text-base font-semibold text-gray-500">원</span>
          </p>

          {/* 유효기간 */}
          <p className="text-xs text-gray-400">
            {displayedProduct.validFrom} ~ {displayedProduct.validTo}
          </p>

          {/* 카테고리 */}
          <span className="inline-block self-start rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {displayedProduct.category}
          </span>

          {/* 영양성분 섹션 */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-bold text-amber-800 mb-1">영양성분</p>
            <p className="text-xs text-amber-600">
              영양성분 정보는 준비 중입니다. 빠른 시일 내 제공될 예정이에요.
            </p>
          </div>

          {/* 장바구니 담기 버튼 */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-3 rounded-xl text-base font-bold text-white hover:opacity-90 active:opacity-75 transition-opacity"
            style={{ backgroundColor: storeColors.primary }}
          >
            장바구니 담기
          </button>

          <hr className="border-gray-100" />

          {/* 관련 상품 섹션 */}
          <div>
            <p className="text-sm font-bold text-gray-800 mb-3">
              이 카테고리 베스트
            </p>

            {relatedProductsState.isLoading && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="min-w-[120px] w-[120px] h-40 flex-shrink-0 rounded-xl bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            )}

            {!relatedProductsState.isLoading &&
              relatedProductsState.items.length === 0 && (
                <p className="text-xs text-gray-400">관련 상품이 없습니다.</p>
              )}

            {!relatedProductsState.isLoading &&
              relatedProductsState.items.length > 0 && (
                <div
                  className="flex gap-3 overflow-x-auto pb-2"
                  style={{ scrollbarWidth: "none" }}
                >
                  {relatedProductsState.items.map((relatedProduct) => (
                    <RelatedProductCard
                      key={relatedProduct.id}
                      product={relatedProduct}
                      onSelect={handleSelectRelatedProduct}
                    />
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
