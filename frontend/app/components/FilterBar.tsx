"use client";

import { useState, useEffect, useRef } from "react";
import { STORES, EVENT_TYPES, CATEGORIES, EVENT_TYPE_BADGES, STORE_COLORS } from "@/lib/constants";
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
      <span className="font-extrabold text-violet-600 bg-violet-50 px-0.5 rounded">
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
    <div className="space-y-3.5">
      {/* 검색바 */}
      <div ref={searchContainerRef} className="relative">
        <div className="flex items-center gap-3 bg-white border border-gray-200/80 rounded-2xl px-4 py-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all duration-200">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="어떤 행사 상품을 찾으시나요?"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setActiveSuggestionIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="flex-1 text-sm font-semibold text-gray-900 placeholder:text-gray-450 focus:outline-none bg-transparent"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue("");
                submitSearch("");
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-0.5 hover:bg-gray-50 rounded-lg"
              aria-label="검색어 지우기"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* 자동완성 드롭다운 */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-50 mt-2.5 rounded-2xl border border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_12px_30px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-200">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                onMouseDown={() => submitSearch(suggestion)}
                className={`cursor-pointer px-4 py-3 text-xs transition-colors duration-100 ${
                  index === activeSuggestionIndex
                    ? "bg-violet-50/70 text-violet-700 font-bold"
                    : "text-gray-700 hover:bg-gray-50/80 font-medium"
                }`}
              >
                {highlightMatch(suggestion, inputValue)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 편의점 필터 */}
      <div className="relative -mx-4 px-4">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 via-gray-50/70 to-transparent z-10" />
        <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-0.5 px-2">
          <button
            type="button"
            onClick={() => handlePillFilterChange("store", "")}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-[0.97] ${
              filters.store === ""
                ? "bg-gray-950 border-gray-950 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            전체 편의점
          </button>
          {STORES.map((store) => {
            const isActive = filters.store === store;
            const storeColors = STORE_COLORS[store];
            return (
              <button
                key={store}
                type="button"
                onClick={() => handlePillFilterChange("store", isActive ? "" : store)}
                className="shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-[0.97]"
                style={
                  isActive
                    ? { backgroundColor: storeColors.primary, borderColor: storeColors.primary, color: "#FFFFFF" }
                    : { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", color: "#4B5563" }
                }
              >
                {store}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 via-gray-50/70 to-transparent z-10" />
      </div>

      {/* 행사 유형 필터 */}
      <div className="relative -mx-4 px-4">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 via-gray-50/70 to-transparent z-10" />
        <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-0.5 px-2">
          <button
            type="button"
            onClick={() => handlePillFilterChange("eventType", "")}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-[0.97] ${
              filters.eventType === ""
                ? "bg-gray-950 border-gray-950 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
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
                className="shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-[0.97]"
                style={
                  isActive
                    ? { backgroundColor: badge.bg, color: badge.color, borderColor: badge.bg }
                    : { backgroundColor: "#FFFFFF", color: "#4B5563", borderColor: "#E5E7EB" }
                }
              >
                {eventType}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 via-gray-50/70 to-transparent z-10" />
      </div>

      {/* 카테고리 필터 */}
      <div className="relative -mx-4 px-4">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 via-gray-50/70 to-transparent z-10" />
        <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-0.5 px-2">
          <button
            type="button"
            onClick={() => handlePillFilterChange("category", "")}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-[0.97] ${
              filters.category === ""
                ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            전체 카테고리
          </button>
          {CATEGORIES.map((category) => {
            const isActive = filters.category === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => handlePillFilterChange("category", isActive ? "" : category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-150 whitespace-nowrap active:scale-[0.97] ${
                  isActive
                    ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 via-gray-50/70 to-transparent z-10" />
      </div>
    </div>
  );
}
