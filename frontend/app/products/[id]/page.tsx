import { notFound } from "next/navigation";
import {
  getProductById,
  getRelatedProducts,
  getCrossStoreComparison,
} from "@/infrastructure/repositories/product-repository";
import { ProductDetailClient } from "./ProductDetailClient";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const productId = Number(id);

  if (isNaN(productId)) notFound();

  const product = await getProductById(productId);

  if (!product) notFound();

  const [relatedProducts, crossStoreProducts] = await Promise.all([
    getRelatedProducts(productId, product.category),
    getCrossStoreComparison(product),
  ]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>
      <ProductDetailClient
        product={product}
        relatedProducts={relatedProducts}
        crossStoreProducts={crossStoreProducts}
      />
    </div>
  );
}
