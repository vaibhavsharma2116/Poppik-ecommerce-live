
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import type { Category, Product } from "@/lib/types";

interface Subcategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  categoryId: number;
  status: string;
  productCount: number;
}

export default function CategoryMenu() {
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  // Fetch products to count subcategory products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Get subcategories for a category
  const getSubcategoriesForCategory = (categorySlug: string) => {
    const categoryProducts = products.filter(product => 
      product.category?.toLowerCase().includes(categorySlug.replace('-', ' ').toLowerCase())
    );

    const subcategoryMap = new Map();
    categoryProducts.forEach(product => {
      if (product.subcategory) {
        const subcategorySlug = product.subcategory.toLowerCase().replace(/\s+/g, '-');
        if (subcategoryMap.has(subcategorySlug)) {
          subcategoryMap.set(subcategorySlug, {
            ...subcategoryMap.get(subcategorySlug),
            productCount: subcategoryMap.get(subcategorySlug).productCount + 1
          });
        } else {
          subcategoryMap.set(subcategorySlug, {
            name: product.subcategory,
            slug: subcategorySlug,
            productCount: 1
          });
        }
      }
    });

    return Array.from(subcategoryMap.values());
  };

  return (
    <nav className="hidden md:flex items-center space-x-8">
      {categories.map((category) => {
        const subcategories = getSubcategoriesForCategory(category.slug);
        
        return (
          <div
            key={category.id}
            className="relative group"
            onMouseEnter={() => setHoveredCategory(category.id)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            <Link
              href={`/category/${category.slug}`}
              className="flex items-center space-x-1 text-gray-700 hover:text-red-600 font-medium transition-colors"
            >
              <span>{category.name}</span>
              {subcategories.length > 0 && (
                <ChevronDown className="h-4 w-4" />
              )}
            </Link>

            {/* Subcategory Dropdown */}
            {subcategories.length > 0 && hoveredCategory === category.id && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-3">
                    {category.name}
                  </h3>
                  <div className="space-y-2">
                    {subcategories.map((subcategory) => (
                      <Link
                        key={subcategory.slug}
                        href={`/category/${category.slug}?subcategory=${subcategory.slug}`}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span>{subcategory.name}</span>
                          <span className="text-xs text-gray-500">({subcategory.productCount})</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
