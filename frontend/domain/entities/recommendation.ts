export interface RecommendationCombination {
  title: string;
  reason: string;
  products: number[]; // product IDs
  totalPrice: number;
}

export interface RecommendationResult {
  combinations: RecommendationCombination[];
}

export interface RecommendRequest {
  budget: number;
  stores?: string[];
}
