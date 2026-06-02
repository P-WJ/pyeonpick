/**
 * 이번 달 행사 기간 정보를 계산한다 (순수 함수).
 * 모든 행사 상품은 매월 1일~말일 동안 진행되므로, 종료일·남은 일수는 전 상품 공통이다.
 */
export function currentMonthPromotion(today: Date = new Date()): {
  endLabel: string; // 예) "6월 30일"
  daysLeft: number; // 오늘 자정 기준 말일까지 남은 일수
} {
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysLeft = Math.floor((monthEnd.getTime() - startOfToday.getTime()) / MS_PER_DAY);
  return {
    endLabel: `${monthEnd.getMonth() + 1}월 ${monthEnd.getDate()}일`,
    daysLeft,
  };
}

/** 남은 일수를 사람이 읽는 라벨로 변환한다. */
export function formatDaysLeft(days: number): string {
  if (days <= 0) return "오늘 마감";
  if (days === 1) return "내일 마감";
  return `D-${days}`;
}
