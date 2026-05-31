import {
  getProducts as fetchFromRepository,
  type ProductFilters,
} from "@/infrastructure/repositories/product-repository";
import type { Product } from "@/domain/entities/product";

export type { ProductFilters };

export async function getProducts(filters: ProductFilters): Promise<Product[]> {
  return fetchFromRepository(filters);
}
