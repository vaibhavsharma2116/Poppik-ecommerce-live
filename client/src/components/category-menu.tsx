
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Product, Category } from "@/lib/types";

interface CategoryMenuProps {
  products: Product[];
  categories: Category[];
  onCategorySelect: (category: string, subcategory?: string) => void;
  selectedCategory?: string;
  selectedSubcategory?: string;
}

export default function CategoryMenu({ 
  products, 
  categories, 
  onCategorySelect,
  selectedCategory,
  selectedSubcategory 
}: CategoryMenuProps) {
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const getSubcategoriesForCategory = (categoryName: string) => {
    return [...new Set(
      products
        .filter(p => p.category === categoryName)
        .map(p => p.subcategory)
        .filter(Boolean)
    )];
  };

  const getProductCount = (categoryName: string, subcategory?: string) => {
    return products.filter(p => 
      p.category === categoryName && 
      (subcategory ? p.subcategory === subcategory : true)
    ).length;
  };

  return (
    <Card className="w-full">
      
    </Card>
  );
}
