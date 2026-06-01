"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn } from "next-auth/react";
import type { Product } from "@/domain/entities/product";
import { EventBadge } from "@/app/components/EventBadge";
import { STORE_COLORS } from "@/lib/constants";
import { ProfileHeader } from "@/app/profile/components/ProfileHeader";

const WISHLIST_STORAGE_KEY = "cvs-wishlist-v1";
const PLACEHOLDER_IMAGE = "/placeholder.png";
const WISHLIST_SKELETON_COUNT = 4;

type ActiveTab = "wishlist" | "posts";

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: WISHLIST_SKELETON_COUNT }).map((_, index) => (
        <div
          key={index}
          className="h-52 animate-pulse rounded-xl bg-gray-200"
        />
      ))}
    </div>
  );
}

interface WishlistProductCardProps {
  product: Product;
  onRemoveWishlist: (productId: number) => void;
}

function WishlistProductCard({ product, onRemoveWishlist }: WishlistProductCardProps) {
  const storeColor = STORE_COLORS[product.store];

  return (
    <div className="relative flex flex-col rounded-xl bg-white shadow-sm overflow-hidden"
      style={{ borderTop: `3px solid ${storeColor.primary}` }}
    >
      {/* 행사 뱃지 */}
      <div className="absolute left-2 top-2 z-10">
        <EventBadge eventType={product.eventType} />
      </div>

      {/* 찜 해제 버튼 */}
      <button
        type="button"
        onClick={() => onRemoveWishlist(product.id)}
        aria-label="찜하기 해제"
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm hover:bg-white transition-colors"
      >
        <span className="text-base leading-none text-rose-500">♥</span>
      </button>

      {/* 상품 상세 링크 */}
      <Link href={`/products/${product.id}`} className="flex flex-col flex-1">
        {/* 이미지 */}
        <div className="relative mx-auto mt-4 h-28 w-28">
          <Image
            src={product.imageUrl || PLACEHOLDER_IMAGE}
            alt={product.name}
            fill
            className="object-contain"
            unoptimized={!product.imageUrl}
          />
        </div>

        {/* 정보 */}
        <div className="flex flex-1 flex-col p-3">
          <p className="text-xs font-semibold" style={{ color: storeColor.primary }}>
            {product.store}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-gray-900 leading-snug">
            {product.name}
          </h3>
          <p className="mt-1.5 text-base font-bold text-gray-900">
            {product.price.toLocaleString("ko-KR")}
            <span className="text-xs font-normal text-gray-500">원</span>
          </p>
        </div>
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const user = session?.user;

  const [activeTab, setActiveTab] = useState<ActiveTab>("wishlist");
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  // 로컬스토리지에서 찜 목록 id 배열 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          const validIds = (parsed as unknown[]).filter(
            (item): item is number => typeof item === "number" && item > 0
          );
          setWishlistIds(validIds);
        }
      }
    } catch {
      // 손상된 데이터는 무시
    }
  }, []);

  // 찜 id 배열이 변경되면 상품 정보 API 호출
  useEffect(() => {
    if (wishlistIds.length === 0) {
      setWishlistProducts([]);
      return;
    }

    const fetchWishlistProducts = async () => {
      setIsLoadingWishlist(true);
      setWishlistError(null);

      try {
        const response = await fetch(
          `/api/products/by-ids?ids=${wishlistIds.join(",")}`
        );
        const json = (await response.json()) as {
          data: Product[] | null;
          error: string | null;
        };

        if (json.error) throw new Error(json.error);
        setWishlistProducts(json.data ?? []);
      } catch (error) {
        setWishlistError(
          error instanceof Error
            ? error.message
            : "찜한 상품을 불러오지 못했습니다."
        );
      } finally {
        setIsLoadingWishlist(false);
      }
    };

    fetchWishlistProducts();
  }, [wishlistIds]);

  function handleRemoveWishlist(productId: number) {
    const nextIds = wishlistIds.filter((id) => id !== productId);
    setWishlistIds(nextIds);
    setWishlistProducts((prev) =>
      prev.filter((product) => product.id !== productId)
    );
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(nextIds));
  }

  // 로딩 중
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <ProfileHeader />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      </div>
    );
  }

  // 비로그인 상태
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <ProfileHeader />
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <div className="mb-6 text-6xl">🔐</div>
          <h1 className="text-xl font-bold text-gray-900">
            로그인 후 이용할 수 있습니다
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            프로필, 찜한 상품, 내가 쓴 글을 확인하려면 로그인이 필요합니다.
          </p>
          <button
            type="button"
            onClick={() => signIn("kakao")}
            className="mt-8 flex items-center justify-center gap-2 mx-auto rounded-full bg-[#FEE500] px-6 py-3 text-sm font-semibold text-[#191919] hover:bg-[#F5DC00] transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.569 1.397 4.836 3.527 6.238l-.898 3.359a.375.375 0 0 0 .545.417L9.31 18.4A10.56 10.56 0 0 0 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
            </svg>
            카카오로 로그인
          </button>
        </main>
      </div>
    );
  }

  const firstCharacter = user.name?.[0] ?? "?";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <ProfileHeader />

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "프로필 이미지"}
                width={64}
                height={64}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-2xl font-bold shrink-0">
                {firstCharacter}
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-gray-900">
                {user.name ?? "이름 없음"}
              </p>
              {user.email && (
                <p className="mt-0.5 text-sm text-gray-500">{user.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("wishlist")}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "wishlist"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            찜한 상품
            {wishlistIds.length > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-600">
                {wishlistIds.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "posts"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            내가 쓴 글
          </button>
        </div>

        {/* 탭 내용 */}
        {activeTab === "wishlist" && (
          <section>
            {isLoadingWishlist && <WishlistSkeleton />}

            {wishlistError && !isLoadingWishlist && (
              <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600 border border-red-100">
                {wishlistError}
              </div>
            )}

            {!isLoadingWishlist && !wishlistError && wishlistIds.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 text-5xl text-gray-300">♡</div>
                <p className="text-base font-semibold text-gray-700">
                  찜한 상품이 없습니다
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  상품 카드의 하트 버튼을 눌러 찜해보세요.
                </p>
                <Link
                  href="/"
                  className="mt-5 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  상품 보러가기
                </Link>
              </div>
            )}

            {!isLoadingWishlist && !wishlistError && wishlistProducts.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {wishlistProducts.map((product) => (
                  <WishlistProductCard
                    key={product.id}
                    product={product}
                    onRemoveWishlist={handleRemoveWishlist}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "posts" && (
          <section>
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-base font-semibold text-gray-700">
                아직 작성한 글이 없습니다
              </p>
              <p className="mt-1 text-sm text-gray-400">
                게시판에서 자유롭게 글을 써보세요.
              </p>
              <Link
                href="/board"
                className="mt-5 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                게시판 가기
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
