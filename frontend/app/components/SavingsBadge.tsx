interface SavingsBadgeProps {
  savings: number;
}

export function SavingsBadge({ savings }: SavingsBadgeProps) {
  if (savings === 0) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
      {savings.toLocaleString("ko-KR")}원 절약
    </span>
  );
}
