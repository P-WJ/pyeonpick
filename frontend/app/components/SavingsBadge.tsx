interface SavingsBadgeProps {
  savings: number;
}

export function SavingsBadge({ savings }: SavingsBadgeProps) {
  if (savings === 0) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 border border-emerald-200">
      {savings.toLocaleString("ko-KR")}원 절약
    </span>
  );
}
