/**
 * 행사 종료일까지 남은 일수를 계산한다 (순수 함수).
 * 오늘 자정 기준으로 종료일까지의 날짜 차이를 반환한다.
 * 날짜 형식이 올바르지 않으면 null을 반환한다.
 */
export function daysUntilEnd(validTo: string, today: Date = new Date()): number | null {
  const end = new Date(`${validTo}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

/** 남은 일수를 사람이 읽는 라벨로 변환한다. */
export function formatDaysLeft(days: number): string {
  if (days <= 0) return "오늘 마감";
  if (days === 1) return "내일 마감";
  return `D-${days}`;
}
