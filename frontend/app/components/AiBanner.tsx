"use client";

interface AiBannerProps {
  onOpenModal: () => void;
}

export function AiBanner({ onOpenModal }: AiBannerProps) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl px-5 py-4"
      style={{
        background: "linear-gradient(135deg, #6D28D9 0%, #7C3AED 50%, #8B5CF6 100%)",
      }}
    >
      <div>
        <p className="text-sm font-bold text-white">
          AI가 최적 조합을 추천해드려요
        </p>
        <p className="mt-0.5 text-xs text-purple-200">
          행사 상품 조합으로 절약을 극대화하세요
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenModal}
        className="shrink-0 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 active:scale-[0.98] transition-all duration-150 backdrop-blur-sm"
      >
        추천 받기
      </button>
    </div>
  );
}
