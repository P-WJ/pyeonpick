interface SavingsBadgeProps {
  savings: number;
}

export function SavingsBadge({ savings }: SavingsBadgeProps) {
  if (savings === 0) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-600 border border-rose-100">
      -{savings.toLocaleString("ko-KR")}원
    </span>
  );
}
