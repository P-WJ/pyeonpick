"use client";

interface AiBannerProps {
  onOpenModal: () => void;
}

export function AiBanner({ onOpenModal }: AiBannerProps) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl px-5.5 py-4.5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 shadow-[0_8px_30px_rgba(124,58,237,0.22)] border border-violet-400/20 relative overflow-hidden group hover:shadow-[0_12px_36px_rgba(124,58,237,0.3)] transition-all duration-300"
    >
      {/* Decorative neon background highlight */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
      
      <div className="relative z-10">
        <p className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
          <span>✨</span> AI 최적 꿀조합 추천
        </p>
        <p className="mt-1 text-xs text-violet-100 font-medium">
          다양한 편의점 행사 상품을 엮어 지출과 절약을 스마트하게 계산해 보세요
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenModal}
        className="relative z-10 shrink-0 rounded-xl bg-white/20 hover:bg-white px-4 py-2 text-xs font-bold text-white hover:text-violet-700 active:scale-[0.96] transition-all duration-200 backdrop-blur-md shadow-sm border border-white/10 hover:border-white"
      >
        조합 받기
      </button>
    </div>
  );
}
