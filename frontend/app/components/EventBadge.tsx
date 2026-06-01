"use client";

import type { EventType } from "@/domain/entities/product";
import { EVENT_TYPE_BADGES } from "@/lib/constants";

interface EventBadgeProps {
  eventType: EventType;
  className?: string;
}

export function EventBadge({ eventType, className = "" }: EventBadgeProps) {
  const badge = EVENT_TYPE_BADGES[eventType];

  const baseClassName =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black tracking-wide text-white shadow-sm select-none";

  const combinedClassName = [
    baseClassName,
    badge.extraClassName ?? "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const displayLabel = badge.prefix
    ? `${badge.prefix} ${badge.label}`
    : badge.label;

  return (
    <span
      className={combinedClassName}
      style={{ background: badge.gradient }}
    >
      {displayLabel}
    </span>
  );
}
