import {
  getProducts as fetchFromRepository,
  type ProductFilters,
  type PaginationOptions,
  type PaginatedProducts,
} from "@/infrastructure/repositories/product-repository";

export type { ProductFilters, PaginationOptions, PaginatedProducts };

export async function getProducts(
  filters: ProductFilters,
  pagination?: PaginationOptions
): Promise<PaginatedProducts> {
  return fetchFromRepository(filters, pagination);
}
