"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { mergeWishlistIds, findIdsMissingOnServer } from "@/domain/use-cases/wishlist";

const WISHLIST_STORAGE_KEY = "cvs-wishlist-v1";
const WISHLIST_API_PATH = "/api/wishlist";

interface WishlistApiResponse<T> {
  data: T | null;
  error: string | null;
}

async function fetchServerWishlist(): Promise<number[]> {
  const response = await fetch(WISHLIST_API_PATH);
  const body = (await response.json()) as WishlistApiResponse<number[]>;
  if (!response.ok || !body.data) throw new Error(body.error ?? "찜 목록을 불러오지 못했습니다.");
  return body.data;
}

async function addToServerWishlist(productIds: number[]): Promise<void> {
  const response = await fetch(WISHLIST_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds }),
  });
  if (!response.ok) throw new Error("찜 추가를 서버에 저장하지 못했습니다.");
}

async function removeFromServerWishlist(productId: number): Promise<void> {
  const response = await fetch(`${WISHLIST_API_PATH}?productId=${productId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("찜 해제를 서버에 저장하지 못했습니다.");
}

/**
 * 찜 목록 상태. 항상 localStorage에 저장하고, 로그인 상태면 서버와도 동기화한다.
 * 로그인 시 로컬과 서버 목록을 합집합으로 합친다 (기기를 바꿔도 찜이 사라지지 않게).
 */
export function useWishlist(onSyncError: (message: string) => void) {
  const { data: session, status } = useSession();
  const kakaoId = status === "authenticated" ? session?.user?.kakaoId : undefined;

  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [isRestored, setIsRestored] = useState(false);
  const wishlistIdsRef = useRef(wishlistIds);
  wishlistIdsRef.current = wishlistIds;
  const onSyncErrorRef = useRef(onSyncError);
  onSyncErrorRef.current = onSyncError;
  // 서버와 합치기를 시도한 사용자 — 실패해도 같은 세션에서 반복 요청하지 않는다
  const attemptedKakaoId = useRef<string | null>(null);
  // 서버와 합치기에 성공한 사용자 — 그 전에는 토글을 서버로 보내지 않는다
  const syncedKakaoId = useRef<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) setWishlistIds(JSON.parse(stored) as number[]);
    } catch {}
    setIsRestored(true);
  }, []);

  useEffect(() => {
    if (!isRestored) return;
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {}
  }, [wishlistIds, isRestored]);

  useEffect(() => {
    if (!isRestored || !kakaoId || attemptedKakaoId.current === kakaoId) return;
    attemptedKakaoId.current = kakaoId;

    (async () => {
      try {
        const serverIds = await fetchServerWishlist();
        const localIds = wishlistIdsRef.current;
        const missing = findIdsMissingOnServer(localIds, serverIds);
        if (missing.length > 0) await addToServerWishlist(missing);
        setWishlistIds((latestLocalIds) => mergeWishlistIds(latestLocalIds, serverIds));
        syncedKakaoId.current = kakaoId;
      } catch {
        onSyncErrorRef.current("찜 목록을 계정과 동기화하지 못했어요. 이 기기에는 그대로 저장돼요.");
      }
    })();
  }, [isRestored, kakaoId]);

  function toggleWishlist(productId: number) {
    const isWishlisted = wishlistIds.includes(productId);
    setWishlistIds((prev) =>
      isWishlisted ? prev.filter((id) => id !== productId) : [...prev, productId]
    );

    if (!kakaoId || syncedKakaoId.current !== kakaoId) return;
    const request = isWishlisted
      ? removeFromServerWishlist(productId)
      : addToServerWishlist([productId]);
    request.catch(() => onSyncErrorRef.current("찜 변경을 서버에 저장하지 못했어요. 이 기기에는 반영됐어요."));
  }

  return { wishlistIds, toggleWishlist };
}
