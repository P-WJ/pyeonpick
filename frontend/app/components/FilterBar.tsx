"use client";

import { STORES, EVENT_TYPES, CATEGORIES } from "@/lib/constants";
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
    <div className="flex flex-wrap gap-3 rounded-xl bg-gray-50 p-4">
      <input
        type="text"
        placeholder="상품명 검색..."
        value={filters.search}
        onChange={(e) => handleChange("search", e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <select
        value={filters.store}
        onChange={(e) => handleChange("store", e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">전체 편의점</option>
        {STORES.map((store) => (
          <option key={store} value={store}>
            {store}
          </option>
        ))}
      </select>
      <select
        value={filters.eventType}
        onChange={(e) => handleChange("eventType", e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">전체 행사</option>
        {EVENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <select
        value={filters.category}
        onChange={(e) => handleChange("category", e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">전체 카테고리</option>
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </div>
  );
}
