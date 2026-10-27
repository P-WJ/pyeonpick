/**
 * 찜 목록 동기화 규칙 (순수 함수).
 * 로그인 시 기기에 있던 찜과 서버의 찜을 합친다 — 어느 쪽에서도 지우지 않는다.
 */

/** 로컬 순서를 유지하고, 서버에만 있는 항목을 뒤에 붙인다. */
export function mergeWishlistIds(localIds: number[], serverIds: number[]): number[] {
  const merged = [...localIds];
  const seen = new Set(localIds);
  for (const id of serverIds) {
    if (!seen.has(id)) {
      merged.push(id);
      seen.add(id);
    }
  }
  return merged;
}

/** 서버에 올려야 할 로컬 전용 항목을 반환한다. */
export function findIdsMissingOnServer(localIds: number[], serverIds: number[]): number[] {
  const serverSet = new Set(serverIds);
  return localIds.filter((id) => !serverSet.has(id));
}
