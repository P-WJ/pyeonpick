"use client";

import type { EventType } from "@/domain/entities/product";
import { EVENT_TYPE_BADGES } from "@/lib/constants";

interface EventBadgeProps {
  eventType: EventType;
  className?: string;
}

export function EventBadge({ eventType, className = "" }: EventBadgeProps) {
  const badge = EVENT_TYPE_BADGES[eventType];

  return (
    <span
      className={`inline-flex items-center rounded-full text-[11px] font-bold px-2 py-0.5 select-none ${className}`}
      style={{ backgroundColor: badge.bg, color: badge.color }}
    >
      {badge.label}
    </span>
  );
}
