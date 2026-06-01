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
const PLACEHOLDER_IMAGE = "/placeholder.png";
const WISHLIST_SKELETON_COUNT = 4;
const POSTS_SKELETON_COUNT = 3;

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  자유: "bg-gray-100 text-gray-600",
  조합공유: "bg-blue-100 text-blue-700",
  질문: "bg-green-100 text-green-700",
};

type ActiveTab = "wishlist" | "recentlyViewed" | "posts";

function ProductCardSkeleton() {
  return <div className="h-52 animate-pulse rounded-xl bg-gray-200" />;
}

function PostSkeleton() {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
      <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
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
    <div
      className="relative flex flex-col rounded-xl bg-white shadow-sm overflow-hidden"
      style={{ borderTop: `3px solid ${storeColor.primary}` }}
    >
      <div className="absolute left-2 top-2 z-10">
        <EventBadge eventType={product.eventType} />
      </div>
      <button
        type="button"
        onClick={() => onRemoveWishlist(product.id)}
        aria-label="찜하기 해제"
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm hover:bg-white transition-colors"
      >
        <span className="text-base leading-none text-rose-500">♥</span>
      </button>
      <Link href={`/products/${product.id}`} className="flex flex-col flex-1">
        <div className="relative mx-auto mt-4 h-28 w-28">
          <Image
            src={product.imageUrl || PLACEHOLDER_IMAGE}
            alt={product.name}
            fill
            className="object-contain"
            unoptimized={!product.imageUrl}
          />
        </div>
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

function RecentlyViewedProductCard({ product }: { product: Product }) {
  const storeColor = STORE_COLORS[product.store];

  return (
    <Link
      href={`/products/${product.id}`}
      className="relative flex flex-col rounded-xl bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
      style={{ borderTop: `3px solid ${storeColor.primary}` }}
    >
      <div className="absolute left-2 top-2 z-10">
        <EventBadge eventType={product.eventType} />
      </div>
      <div className="relative mx-auto mt-4 h-28 w-28">
        <Image
          src={product.imageUrl || PLACEHOLDER_IMAGE}
          alt={product.name}
          fill
          className="object-contain"
          unoptimized={!product.imageUrl}
        />
      </div>
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
      className="w-full rounded-xl bg-white p-4 shadow-sm text-left hover:shadow-md transition-shadow space-y-1.5"
    >
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            CATEGORY_BADGE_COLORS[post.category] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {post.category}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
        {post.title}
      </h3>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>{formatDate(post.createdAt)}</span>
        {post.commentCount > 0 && (
          <>
            <span>·</span>
            <span>댓글 {post.commentCount}</span>
          </>
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
        // 로컬스토리지 순서(최근 순)를 유지
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
      <div className="min-h-screen bg-[#F8FAFC]">
         
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
         
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
            onClick={() => setActiveTab("recentlyViewed")}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "recentlyViewed"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            최근 본 상품
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

        {/* 찜한 상품 탭 */}
        {activeTab === "wishlist" && (
          <section>
            {isLoadingWishlist && (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: WISHLIST_SKELETON_COUNT }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            )}

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

        {/* 최근 본 상품 탭 */}
        {activeTab === "recentlyViewed" && (
          <section>
            {isLoadingRecentlyViewed && (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: WISHLIST_SKELETON_COUNT }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            )}

            {recentlyViewedError && !isLoadingRecentlyViewed && (
              <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600 border border-red-100">
                {recentlyViewedError}
              </div>
            )}

            {!isLoadingRecentlyViewed && !recentlyViewedError && recentlyViewedIds.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 text-5xl text-gray-300">👀</div>
                <p className="text-base font-semibold text-gray-700">
                  최근 본 상품이 없습니다
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  상품 상세를 방문하면 여기에 기록됩니다.
                </p>
                <Link
                  href="/"
                  className="mt-5 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  상품 보러가기
                </Link>
              </div>
            )}

            {!isLoadingRecentlyViewed && !recentlyViewedError && recentlyViewedProducts.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {recentlyViewedProducts.map((product) => (
                  <RecentlyViewedProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 내가 쓴 글 탭 */}
        {activeTab === "posts" && (
          <section className="space-y-3">
            {isLoadingPosts && (
              <>
                {Array.from({ length: POSTS_SKELETON_COUNT }).map((_, index) => (
                  <PostSkeleton key={index} />
                ))}
              </>
            )}

            {postsError && !isLoadingPosts && (
              <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600 border border-red-100">
                {postsError}
              </div>
            )}

            {!isLoadingPosts && !postsError && myPosts.length === 0 && (
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
