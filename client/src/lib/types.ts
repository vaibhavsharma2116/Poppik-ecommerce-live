export interface Product {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  additionalImages?: string[];
  category: string;
  rating: string;
  reviewCount: number;
  inStock: boolean;
  bestseller?: boolean;
  newLaunch?: boolean;
  saleOffer?: string;
  size?: string;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  status: string;
  productCount: number;
}

export interface Subcategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  categoryId: number;
  status: string;
  productCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}