import {
  getProducts as fetchFromRepository,
  getProductStats as fetchStatsFromRepository,
  type ProductFilters,
  type PaginationOptions,
  type PaginatedProducts,
  type ProductStats,
} from "@/infrastructure/repositories/product-repository";

export type { ProductFilters, PaginationOptions, PaginatedProducts, ProductStats };

export async function getProducts(
  filters: ProductFilters,
  pagination?: PaginationOptions
): Promise<PaginatedProducts> {
  return fetchFromRepository(filters, pagination);
}

export async function getProductStats(): Promise<ProductStats> {
  return fetchStatsFromRepository();
}
