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
    // Ensure newSet is defined or replace with a standard JavaScript Set
    // Assuming 'newSet' was intended to be 'new Set'
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
      <CardContent className="p-0">
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category.id}>
              <Collapsible open={openCategories.includes(category.id)} onOpenChange={() => toggleCategory(category.id)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start font-normal text-md text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => onCategorySelect(category.name)}
                  >
                    <div className="flex items-center w-full">
                      <div className="relative w-16 h-16 mr-3 flex-shrink-0">
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          style={{
                            width: 200,
                            height: 200,
                            quality: 75,
                            fit: 'cover'
                          }}
                          lazy={true}
                          responsive={false}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                      <span className="flex-grow">{category.name}</span>
                      <span className="ml-auto text-sm text-gray-500 mr-2">
                        ({getProductCount(category.name)})
                      </span>
                      {getSubcategoriesForCategory(category.name).length > 0 && (
                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                {getSubcategoriesForCategory(category.name).length > 0 && (
                  <CollapsibleContent className="pl-4">
                    <ul className="space-y-1">
                      {getSubcategoriesForCategory(category.name).map((subcategory) => (
                        <li key={subcategory}>
                          <Button
                            variant="ghost"
                            className={`w-full justify-start font-normal text-sm ${selectedSubcategory === subcategory ? "text-primary font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                            onClick={() => onCategorySelect(category.name, subcategory)}
                          >
                            <span className="flex-grow">{subcategory}</span>
                            <span className="ml-auto text-sm text-gray-500 mr-2">
                              ({getProductCount(category.name, subcategory)})
                            </span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                )}
              </Collapsible>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}