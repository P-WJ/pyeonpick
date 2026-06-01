"use client";

import { STORES, EVENT_TYPES, CATEGORIES, STORE_COLORS, EVENT_TYPE_BADGES } from "@/lib/constants";
import type { Store, EventType, Category } from "@/domain/entities/product";

export interface ActiveFilters {
  store: Store | "";
  eventType: EventType | "";
  category: Category | "";
  search: string;
}

interface FilterBarProps {
  filters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  function handleChange(key: keyof ActiveFilters, value: string) {
    onFilterChange({ ...filters, [key]: value });
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
      {/* 검색 */}
      <div>
        <input
          type="text"
          placeholder="상품명 검색..."
          value={filters.search}
          onChange={(e) => handleChange("search", e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
        />
      </div>

      {/* 편의점 필터 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleChange("store", "")}
          className="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
          style={
            filters.store === ""
              ? { backgroundColor: "#1F2937", color: "#FFFFFF", borderColor: "#1F2937" }
              : { backgroundColor: "#FFFFFF", color: "#6B7280", borderColor: "#D1D5DB" }
          }
        >
          전체
        </button>
        {STORES.map((store) => {
          const isActive = filters.store === store;
          const colors = STORE_COLORS[store];
          return (
            <button
              key={store}
              type="button"
              onClick={() => handleChange("store", isActive ? "" : store)}
              className="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
              style={
                isActive
                  ? {
                      backgroundColor: colors.primary,
                      color: "#FFFFFF",
                      borderColor: colors.primary,
                    }
                  : {
                      backgroundColor: colors.secondary,
                      color: colors.primary,
                      borderColor: colors.primary,
                    }
              }
            >
              {store}
            </button>
          );
        })}
      </div>

      {/* 행사 유형 필터 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleChange("eventType", "")}
          className="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
          style={
            filters.eventType === ""
              ? { backgroundColor: "#1F2937", color: "#FFFFFF", borderColor: "#1F2937" }
              : { backgroundColor: "#FFFFFF", color: "#6B7280", borderColor: "#D1D5DB" }
          }
        >
          전체 행사
        </button>
        {EVENT_TYPES.map((eventType) => {
          const isActive = filters.eventType === eventType;
          const badge = EVENT_TYPE_BADGES[eventType];
          return (
            <button
              key={eventType}
              type="button"
              onClick={() => handleChange("eventType", isActive ? "" : eventType)}
              className="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
              style={
                isActive
                  ? {
                      background: badge.gradient,
                      color: "#FFFFFF",
                      borderColor: "transparent",
                    }
                  : {
                      backgroundColor: "#FFFFFF",
                      color: "#374151",
                      borderColor: "#D1D5DB",
                    }
              }
            >
              {eventType}
            </button>
          );
        })}
      </div>

      {/* 카테고리 필터 */}
      <div>
        <select
          value={filters.category}
          onChange={(e) => handleChange("category", e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">전체 카테고리</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
