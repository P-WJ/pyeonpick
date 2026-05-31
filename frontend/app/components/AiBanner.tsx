"use client";

interface AiBannerProps {
  onToast: (message: string) => void;
}

export function AiBanner({ onToast }: AiBannerProps) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-5 py-4"
      style={{
        background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #C084FC 100%)",
      }}
    >
      <div>
        <p className="text-sm font-bold text-white">
          ✨ AI가 최적 조합을 추천해드려요
        </p>
        <p className="mt-0.5 text-xs text-purple-200">
          행사 상품 조합으로 절약을 극대화하세요
        </p>
      </div>
      <button
        type="button"
        onClick={() => onToast("AI 추천 기능은 준비 중이에요!")}
        className="shrink-0 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
      >
        추천 받기
      </button>
    </div>
  );
}
