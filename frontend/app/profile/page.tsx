"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import type { Product } from "@/domain/entities/product";
import type { Post } from "@/domain/entities/post";
import { EventBadge } from "@/app/components/EventBadge";
import { STORE_COLORS } from "@/lib/constants";

const WISHLIST_STORAGE_KEY = "cvs-wishlist-v1";
const RECENTLY_VIEWED_KEY = "cvs-recently-viewed-v1";
const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f9fafb"/><stop offset="100%" stop-color="%23f3f4f6"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g)"/><circle cx="50" cy="45" r="14" fill="%23e5e7eb" opacity="0.8"/><path d="M32 72 h36 v-22 h-36 z" fill="%23d1d5db" opacity="0.6"/><path d="M42 50 h16 v-6 h-16 z" fill="%239ca3af" opacity="0.5"/></svg>`;
const WISHLIST_SKELETON_COUNT = 4;
const POSTS_SKELETON_COUNT = 3;

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  자유: "bg-blue-50/80 text-blue-600 border border-blue-150/40",
  조합공유: "bg-violet-50/80 text-violet-650 border border-violet-150/40",
  질문: "bg-amber-50/80 text-amber-600 border border-amber-150/40",
};

type ActiveTab = "wishlist" | "recentlyViewed" | "posts";

function ProductCardSkeleton() {
  return <div className="h-52 animate-pulse rounded-3xl bg-white border border-gray-100/50 shadow-sm" />;
}

function PostSkeleton() {
  return (
    <div className="rounded-3xl bg-white p-5 border border-gray-100/50 shadow-sm space-y-3">
      <div className="h-4.5 w-16 animate-pulse rounded-full bg-gray-250" />
      <div className="h-5 w-3/4 animate-pulse rounded-xl bg-gray-250" />
      <div className="h-4 w-1/3 animate-pulse rounded-xl bg-gray-250" />
    </div>
  );
}

interface WishlistProductCardProps {
  product: Product;
  onRemoveWishlist: (productId: number) => void;
}

function WishlistProductCard({ product, onRemoveWishlist }: WishlistProductCardProps) {
  const storeColors = STORE_COLORS[product.store];

  return (
    <div
      className="group relative flex flex-col border border-gray-100/80 rounded-2xl bg-white overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.06)]"
    >
      <div className="absolute left-2.5 top-2.5 z-10 shadow-sm rounded-lg overflow-hidden">
        <EventBadge eventType={product.eventType} />
      </div>
      <button
        type="button"
        onClick={() => onRemoveWishlist(product.id)}
        aria-label="찜하기 해제"
        className="absolute right-2.5 top-2.5 z-10 flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white/85 hover:bg-white backdrop-blur-md shadow-sm border border-gray-100/50 transition-all duration-150 hover:scale-110 active:scale-95 group/wish"
      >
        <span className="text-xs leading-none text-rose-500">♥</span>
      </button>
      <Link href={`/products/${product.id}`} className="flex flex-col flex-1">
        <div className="relative w-full aspect-square bg-gray-50/70 overflow-hidden border-b border-gray-50/50 flex items-center justify-center">
          <Image
            src={product.imageUrl || PLACEHOLDER_IMAGE}
            alt={product.name}
            fill
            className="object-contain p-4.5 transition-transform duration-300 group-hover:scale-[1.04]"
            unoptimized={!product.imageUrl}
          />
        </div>
        <div className="flex flex-1 flex-col p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: storeColors.primary }}
            />
            <span className="text-xs font-bold text-gray-500 truncate" style={{ color: storeColors.text }}>
              {product.store}
            </span>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-800 leading-snug flex-1 min-h-[2.5rem]">
            {product.name}
          </h3>
          <p className="text-base font-extrabold text-gray-900 mt-2">
            {product.price.toLocaleString("ko-KR")}
            <span className="text-[11px] font-medium text-gray-400 ml-0.5">원</span>
          </p>
        </div>
      </Link>
    </div>
  );
}

function RecentlyViewedProductCard({
  product,
  onRemove,
}: {
  product: Product;
  onRemove: (productId: number) => void;
}) {
  const storeColors = STORE_COLORS[product.store];

  return (
    <div
      className="group relative flex flex-col border border-gray-100/80 rounded-2xl bg-white overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.06)]"
    >
      <div className="absolute left-2.5 top-2.5 z-10 shadow-sm rounded-lg overflow-hidden">
        <EventBadge eventType={product.eventType} />
      </div>
      <button
        type="button"
        onClick={() => onRemove(product.id)}
        aria-label="삭제"
        className="absolute right-2.5 top-2.5 z-10 flex h-7.5 w-7.5 items-center justify-center rounded-full bg-white/85 hover:bg-red-50 backdrop-blur-md shadow-sm border border-gray-100/50 text-gray-400 hover:text-red-500 transition-colors text-xs font-bold hover:scale-110 active:scale-95"
      >
        ✕
      </button>
      <Link href={`/products/${product.id}`} className="flex flex-col flex-1">
        <div className="relative w-full aspect-square bg-gray-50/70 overflow-hidden border-b border-gray-50/50 flex items-center justify-center">
          <Image
            src={product.imageUrl || PLACEHOLDER_IMAGE}
            alt={product.name}
            fill
            className="object-contain p-4.5 transition-transform duration-300 group-hover:scale-[1.04]"
            unoptimized={!product.imageUrl}
          />
        </div>
        <div className="flex flex-1 flex-col p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: storeColors.primary }}
            />
            <span className="text-xs font-bold text-gray-500 truncate" style={{ color: storeColors.text }}>
              {product.store}
            </span>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-800 leading-snug flex-1 min-h-[2.5rem]">
            {product.name}
          </h3>
          <p className="text-base font-extrabold text-gray-900 mt-2">
            {product.price.toLocaleString("ko-KR")}
            <span className="text-[11px] font-medium text-gray-400 ml-0.5">원</span>
          </p>
        </div>
      </Link>
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface MyPostCardProps {
  post: Post;
}

function MyPostCard({ post }: MyPostCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/board/${post.id}`)}
      className="w-full rounded-3xl bg-white border border-gray-100/65 px-5 py-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-300 active:scale-[0.99] text-left space-y-2 flex flex-col justify-between"
    >
      <div className="flex items-center gap-2">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
            CATEGORY_BADGE_COLORS[post.category] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {post.category}
        </span>
      </div>
      <h3 className="text-sm font-extrabold text-gray-900 line-clamp-2 leading-snug">
        {post.title}
      </h3>
      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 pt-1 border-t border-gray-50/50 w-full justify-between">
        <span>{formatDate(post.createdAt)}</span>
        {post.commentCount > 0 && (
          <span className="text-[10px] text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-100/30">
            댓글 {post.commentCount}
          </span>
        )}
      </div>
    </button>
  );
}

async function fetchProductsByIds(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const response = await fetch(`/api/products/by-ids?ids=${ids.join(",")}`);
  const json = (await response.json()) as {
    data: Product[] | null;
    error: string | null;
  };
  if (json.error) throw new Error(json.error);
  return json.data ?? [];
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const user = session?.user;

  const [activeTab, setActiveTab] = useState<ActiveTab>("wishlist");

  // 찜한 상품 상태
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  // 최근 본 상품 상태
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([]);
  const [isLoadingRecentlyViewed, setIsLoadingRecentlyViewed] = useState(false);
  const [recentlyViewedError, setRecentlyViewedError] = useState<string | null>(null);

  // 내가 쓴 글 상태
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [hasFetchedPosts, setHasFetchedPosts] = useState(false);

  // 찜 목록 로컬스토리지 로드
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

  // 최근 본 상품 로컬스토리지 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          const validIds = (parsed as unknown[]).filter(
            (item): item is number => typeof item === "number" && item > 0
          );
          setRecentlyViewedIds(validIds);
        }
      }
    } catch {
      // 손상된 데이터는 무시
    }
  }, []);

  // 찜 id 배열 변경 시 상품 API 호출
  useEffect(() => {
    if (wishlistIds.length === 0) {
      setWishlistProducts([]);
      return;
    }

    const fetchWishlistProducts = async () => {
      setIsLoadingWishlist(true);
      setWishlistError(null);
      try {
        const products = await fetchProductsByIds(wishlistIds);
        setWishlistProducts(products);
      } catch (error) {
        setWishlistError(
          error instanceof Error ? error.message : "찜한 상품을 불러오지 못했습니다."
        );
      } finally {
        setIsLoadingWishlist(false);
      }
    };

    fetchWishlistProducts();
  }, [wishlistIds]);

  // 최근 본 상품 id 배열 변경 시 상품 API 호출
  useEffect(() => {
    if (recentlyViewedIds.length === 0) {
      setRecentlyViewedProducts([]);
      return;
    }

    const fetchRecentlyViewedProducts = async () => {
      setIsLoadingRecentlyViewed(true);
      setRecentlyViewedError(null);
      try {
        const products = await fetchProductsByIds(recentlyViewedIds);
        const orderedProducts = recentlyViewedIds
          .map((id) => products.find((product) => product.id === id))
          .filter((product): product is Product => product !== undefined);
        setRecentlyViewedProducts(orderedProducts);
      } catch (error) {
        setRecentlyViewedError(
          error instanceof Error ? error.message : "최근 본 상품을 불러오지 못했습니다."
        );
      } finally {
        setIsLoadingRecentlyViewed(false);
      }
    };

    fetchRecentlyViewedProducts();
  }, [recentlyViewedIds]);

  // 내가 쓴 글 탭 선택 시 API 호출 (최초 1회)
  useEffect(() => {
    if (activeTab !== "posts" || hasFetchedPosts) return;

    const fetchMyPosts = async () => {
      setIsLoadingPosts(true);
      setPostsError(null);
      try {
        const response = await fetch(`/api/posts?myPosts=true&limit=50`);
        const json = (await response.json()) as {
          data: Post[] | null;
          error: string | null;
        };
        if (json.error) throw new Error(json.error);
        setMyPosts(json.data ?? []);
      } catch (error) {
        setPostsError(
          error instanceof Error ? error.message : "게시글을 불러오지 못했습니다."
        );
      } finally {
        setIsLoadingPosts(false);
        setHasFetchedPosts(true);
      }
    };

    fetchMyPosts();
  }, [activeTab, hasFetchedPosts, user?.email]);

  function handleRemoveWishlist(productId: number) {
    const nextIds = wishlistIds.filter((id) => id !== productId);
    setWishlistIds(nextIds);
    setWishlistProducts((prev) =>
      prev.filter((product) => product.id !== productId)
    );
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(nextIds));
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-100 border-t-violet-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <div className="mb-6 text-6xl">🔒</div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">
            로그인 후 이용 가능합니다
          </h1>
          <p className="mt-2 text-xs font-semibold text-gray-400 max-w-xs mx-auto leading-relaxed">
            나의 프로필 정보, 보관함 찜 목록, 내가 쓴 커뮤니티 글을 모아보려면 로그인이 필요합니다.
          </p>
          <button
            type="button"
            onClick={() => signIn("kakao")}
            className="mt-8 flex items-center justify-center gap-2 mx-auto rounded-2xl bg-[#FEE500] hover:bg-[#FDE100] px-6 py-3.5 text-xs font-bold text-[#191919] transition-all shadow-[0_2px_8px_-2px_rgba(254,229,0,0.35)] active:scale-[0.98]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.569 1.397 4.836 3.527 6.238l-.898 3.359a.375.375 0 0 0 .545.417L9.31 18.4A10.56 10.56 0 0 0 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
            </svg>
            카카오 로그인하기
          </button>
        </main>
      </div>
    );
  }

  const firstCharacter = user.name?.[0] ?? "?";

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* ⚡ 대형 프로필 히어로 배너 */}
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-violet-900 via-indigo-950 to-slate-900 px-6 py-8 text-white shadow-lg border border-violet-900/10">
          <div className="absolute -left-16 -top-16 w-52 h-52 bg-purple-600/15 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex items-center gap-4.5">
            {user.image ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-white/10 shrink-0">
                <Image
                  src={user.image}
                  alt={user.name ?? "프로필 이미지"}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center justify-center text-xl font-bold shrink-0">
                {firstCharacter}
              </div>
            )}
            <div>
              <p className="text-lg font-black text-white leading-snug">
                {user.name ?? "이름 없음"}
              </p>
              {user.email && (
                <p className="mt-1 text-xs font-bold text-violet-300">{user.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200/60 pb-px gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("wishlist")}
            className={`px-4 py-3 text-xs font-bold transition-all duration-150 border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === "wishlist"
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-gray-400 hover:text-gray-650"
            }`}
          >
            찜한 상품
            {wishlistIds.length > 0 && (
              <span className="rounded-full bg-rose-50 border border-rose-100/50 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-500">
                {wishlistIds.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recentlyViewed")}
            className={`px-4 py-3 text-xs font-bold transition-all duration-150 border-b-2 -mb-px ${
              activeTab === "recentlyViewed"
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-gray-400 hover:text-gray-650"
            }`}
          >
            최근 본 상품
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`px-4 py-3 text-xs font-bold transition-all duration-150 border-b-2 -mb-px ${
              activeTab === "posts"
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-gray-400 hover:text-gray-650"
            }`}
          >
            내가 쓴 글
          </button>
        </div>

        {/* 찜한 상품 탭 */}
        {activeTab === "wishlist" && (
          <section>
            {isLoadingWishlist && (
              <div className="grid grid-cols-2 gap-3.5">
                {Array.from({ length: WISHLIST_SKELETON_COUNT }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            )}

            {wishlistError && !isLoadingWishlist && (
              <div className="rounded-2xl bg-red-50 p-4 text-center text-xs font-bold text-red-650 border border-red-100">
                {wishlistError}
              </div>
            )}

            {!isLoadingWishlist && !wishlistError && wishlistIds.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-white rounded-3xl border border-gray-150/60 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
                <div className="mb-4 text-4xl text-gray-300">♡</div>
                <p className="text-sm font-extrabold text-gray-950">보관함이 비어 있어요</p>
                <p className="mt-1 text-xs font-semibold text-gray-400 leading-relaxed">
                  상품 카드의 하트 버튼을 눌러 소장하고 싶은 행사 상품을 담아보세요.
                </p>
                <Link
                  href="/"
                  className="mt-6 rounded-2xl bg-gray-950 px-5.5 py-3 text-xs font-bold text-white hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 shadow-sm"
                >
                  행사 보러가기
                </Link>
              </div>
            )}

            {!isLoadingWishlist && !wishlistError && wishlistProducts.length > 0 && (
              <div className="grid grid-cols-2 gap-3.5">
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

        {/* 최근 본 상품 탭 */}
        {activeTab === "recentlyViewed" && (
          <section>
            {isLoadingRecentlyViewed && (
              <div className="grid grid-cols-2 gap-3.5">
                {Array.from({ length: WISHLIST_SKELETON_COUNT }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            )}

            {recentlyViewedError && !isLoadingRecentlyViewed && (
              <div className="rounded-2xl bg-red-50 p-4 text-center text-xs font-bold text-red-650 border border-red-100">
                {recentlyViewedError}
              </div>
            )}

            {!isLoadingRecentlyViewed && !recentlyViewedError && recentlyViewedIds.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-white rounded-3xl border border-gray-150/60 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
                <div className="mb-4 text-4xl text-gray-300">👀</div>
                <p className="text-sm font-extrabold text-gray-950">조회한 내역이 없어요</p>
                <p className="mt-1 text-xs font-semibold text-gray-400 leading-relaxed">
                  상품 상세 보기를 방문하면 여기에 최근 본 순서로 기록됩니다.
                </p>
                <Link
                  href="/"
                  className="mt-6 rounded-2xl bg-gray-950 px-5.5 py-3 text-xs font-bold text-white hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 shadow-sm"
                >
                  상품 보러가기
                </Link>
              </div>
            )}

            {!isLoadingRecentlyViewed && !recentlyViewedError && recentlyViewedProducts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">조회 기록 ({recentlyViewedProducts.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(RECENTLY_VIEWED_KEY);
                      setRecentlyViewedIds([]);
                      setRecentlyViewedProducts([]);
                    }}
                    className="text-[10px] font-extrabold text-gray-400 hover:text-red-500 transition-colors bg-white border border-gray-150 px-2.5 py-1.5 rounded-lg active:scale-95 shadow-sm"
                  >
                    기록 전체 삭제
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  {recentlyViewedProducts.map((product) => (
                    <RecentlyViewedProductCard
                      key={product.id}
                      product={product}
                      onRemove={(id) => {
                        const updated = recentlyViewedIds.filter((v) => v !== id);
                        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
                        setRecentlyViewedIds(updated);
                        setRecentlyViewedProducts((prev) => prev.filter((p) => p.id !== id));
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 내가 쓴 글 탭 */}
        {activeTab === "posts" && (
          <section className="space-y-3.5">
            {isLoadingPosts && (
              <>
                {Array.from({ length: POSTS_SKELETON_COUNT }).map((_, index) => (
                  <PostSkeleton key={index} />
                ))}
              </>
            )}

            {postsError && !isLoadingPosts && (
              <div className="rounded-2xl bg-red-50 p-4 text-center text-xs font-bold text-red-650 border border-red-100">
                {postsError}
              </div>
            )}

            {!isLoadingPosts && !postsError && myPosts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-white rounded-3xl border border-gray-150/60 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
                <p className="text-sm font-extrabold text-gray-950">작성한 글이 없어요</p>
                <p className="mt-1 text-xs font-semibold text-gray-400 leading-relaxed">
                  편픽 커뮤니티 게시판에서 꿀조합을 공유하거나 글을 작성해 보세요.
                </p>
                <Link
                  href="/board"
                  className="mt-6 rounded-2xl bg-gray-950 px-5.5 py-3 text-xs font-bold text-white hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 shadow-sm"
                >
                  게시판 이동하기
                </Link>
              </div>
            )}

            {!isLoadingPosts && !postsError && myPosts.length > 0 && (
              <div className="space-y-3">
                {myPosts.map((post) => (
                  <MyPostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
