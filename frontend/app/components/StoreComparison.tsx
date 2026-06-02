"use client";

import Link from "next/link";
import type { Product, Store } from "@/domain/entities/product";
import { buildStoreComparison, type StoreComparisonRow } from "@/domain/use-cases/product-matching";
import { STORE_COLORS } from "@/lib/constants";
import { EventBadge } from "./EventBadge";

interface StoreComparisonProps {
  products: Product[];
  currentStore: Store;
}

function RowContent({ row, isCurrent }: { row: StoreComparisonRow; isCurrent: boolean }) {
  const colors = STORE_COLORS[row.store];
  return (
    <>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0 min-w-[70px] justify-center"
        style={{ backgroundColor: colors.secondary, color: colors.text }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
        {row.store}
      </span>

      <div className="shrink-0">
        <EventBadge eventType={row.product.eventType} />
      </div>

      <div className="ml-auto text-right">
        <p className="text-sm font-extrabold text-gray-900 leading-tight">
          개당 {row.benefit.unitPrice.toLocaleString("ko-KR")}원
        </p>
        <p className="text-[11px] font-medium text-gray-400 leading-tight">
          표시 {row.product.price.toLocaleString("ko-KR")}원
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0 w-[42px]">
        {row.isLowest && (
          <span className="rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5">최저가</span>
        )}
        {isCurrent && (
          <span className="rounded-full bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5">현재</span>
        )}
      </div>
    </>
  );
}

export function StoreComparison({ products, currentStore }: StoreComparisonProps) {
  const rows = buildStoreComparison(products);
  if (rows.length < 2) return null;

  return (
    <section className="mt-7 px-5">
      <div className="flex items-baseline justify-between mb-3.5">
        <h2 className="text-sm font-extrabold text-gray-900">다른 편의점 가격 비교</h2>
        <span className="text-[11px] font-bold text-gray-400">{rows.length}개 매장 · 개당가 기준</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
        {rows.map((row, index) => {
          const isCurrent = row.store === currentStore;
          const rowClassName = `flex items-center gap-2.5 px-4 py-3 transition-colors duration-150 ${
            index > 0 ? "border-t border-gray-50" : ""
          } ${row.isLowest ? "bg-emerald-50/40" : ""}`;

          // 현재 매장은 클릭 비활성, 다른 매장은 해당 상품 상세로 이동
          return isCurrent ? (
            <div key={row.store} className={rowClassName}>
              <RowContent row={row} isCurrent />
            </div>
          ) : (
            <Link
              key={row.store}
              href={`/products/${row.product.id}`}
              className={`${rowClassName} hover:bg-gray-50/70 active:bg-gray-100/60`}
            >
              <RowContent row={row} isCurrent={false} />
            </Link>
          );
        })}
      </div>

      <p className="mt-2 px-1 text-[11px] text-gray-400">
        * 상품명이 같은 행사 상품을 매장별로 비교합니다. 용량·구성이 다를 수 있어요.
      </p>
    </section>
  );
}
