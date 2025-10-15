export interface Product {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number; // Discount percentage
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

export interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

export interface CategorySlider {
  id: number;
  categoryId: number;
  imageUrl: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlogSubcategory {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  subcategory?: string;
  imageUrl: string;
  videoUrl?: string;
  featured: boolean;
  published: boolean;
  likes: number;
  comments: number;
  readTime: string;
  createdAt: string;
  updatedAt: string;
}