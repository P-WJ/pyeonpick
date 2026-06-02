"use client";

import { useState, useEffect, useRef } from "react";
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
  onSearch: (searchText: string) => void;
}

const DEBOUNCE_DELAY_MS = 300;
const MINIMUM_QUERY_LENGTH = 2;

function highlightMatch(text: string, query: string): React.ReactNode {
  const matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
  if (matchIndex === -1 || query.length === 0) return text;
  return (
    <>
      {text.slice(0, matchIndex)}
      <span className="font-bold text-gray-900">
        {text.slice(matchIndex, matchIndex + query.length)}
      </span>
      {text.slice(matchIndex + query.length)}
    </>
  );
}

export function FilterBar({ filters, onFilterChange, onSearch }: FilterBarProps) {
  const [inputValue, setInputValue] = useState(filters.search);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 자동완성 디바운스 조회
  useEffect(() => {
    if (inputValue.length < MINIMUM_QUERY_LENGTH) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/products/suggestions?q=${encodeURIComponent(inputValue)}`
        );
        const json = (await response.json()) as { data: string[]; error: string | null };
        const fetchedSuggestions = json.data ?? [];
        setSuggestions(fetchedSuggestions);
        setShowSuggestions(fetchedSuggestions.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, DEBOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function submitSearch(text: string) {
    setInputValue(text);
    setShowSuggestions(false);
    setSuggestions([]);
    onSearch(text);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        submitSearch(suggestions[activeSuggestionIndex]);
      } else {
        submitSearch(inputValue);
      }
      setActiveSuggestionIndex(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => Math.max(prev - 1, -1));
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function handlePillFilterChange(key: keyof ActiveFilters, value: string) {
    onFilterChange({ ...filters, [key]: value });
  }

  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] space-y-3">
      {/* 검색 */}
      <div ref={searchContainerRef} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="상품명 검색..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setActiveSuggestionIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-150"
            />
          </div>
          <button
            type="button"
            onClick={() => submitSearch(inputValue)}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 shrink-0"
          >
            검색
          </button>
        </div>

        {/* 자동완성 드롭다운 */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                onMouseDown={() => submitSearch(suggestion)}
                className={`cursor-pointer px-4 py-2.5 text-sm transition-colors duration-100 ${
                  index === activeSuggestionIndex
                    ? "bg-gray-50 text-gray-900 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {highlightMatch(suggestion, inputValue)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 편의점 필터 */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1.5 pb-0.5">
        <button
          type="button"
          onClick={() => handlePillFilterChange("store", "")}
          className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap active:scale-[0.97]"
          style={
            filters.store === ""
              ? { backgroundColor: "#111827", color: "#FFFFFF", borderColor: "#111827" }
              : { backgroundColor: "#F9FAFB", color: "#6B7280", borderColor: "#E5E7EB" }
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
              onClick={() => handlePillFilterChange("store", isActive ? "" : store)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap active:scale-[0.97]"
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
                      borderColor: "transparent",
                    }
              }
            >
              {store}
            </button>
          );
        })}
      </div>

      {/* 행사 유형 필터 */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1.5 pb-0.5">
        <button
          type="button"
          onClick={() => handlePillFilterChange("eventType", "")}
          className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap active:scale-[0.97]"
          style={
            filters.eventType === ""
              ? { backgroundColor: "#111827", color: "#FFFFFF", borderColor: "#111827" }
              : { backgroundColor: "#F9FAFB", color: "#6B7280", borderColor: "#E5E7EB" }
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
              onClick={() => handlePillFilterChange("eventType", isActive ? "" : eventType)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap active:scale-[0.97]"
              style={
                isActive
                  ? {
                      background: badge.gradient,
                      color: "#FFFFFF",
                      borderColor: "transparent",
                    }
                  : {
                      backgroundColor: "#F9FAFB",
                      color: "#374151",
                      borderColor: "#E5E7EB",
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
          onChange={(e) => handlePillFilterChange("category", e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-150"
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
