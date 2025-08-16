import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Filter, X, RotateCcw } from "lucide-react";
import type { Product, Category } from "@/lib/types";

interface FilterState {
  categories: string[];
  subcategories: string[];
  priceRange: [number, number];
  rating: number;
  inStock: boolean;
  featured: boolean;
  bestseller: boolean;
  newLaunch: boolean;
  searchTerm: string;
}

interface DynamicFilterProps {
  products: Product[];
  categories: Category[];
  onFilterChange: (filteredProducts: Product[], activeFilters: FilterState) => void;
  className?: string;
}

export default function DynamicFilter({ 
  products, 
  categories, 
  onFilterChange, 
  className = "" 
}: DynamicFilterProps) {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    subcategories: [],
    priceRange: [0, 2000],
    rating: 0,
    inStock: false,
    featured: false,
    bestseller: false,
    newLaunch: false,
    searchTerm: ""
  });

  const [maxPrice, setMaxPrice] = useState(2000);

  // Calculate max price from products and reset filters when products change
  useEffect(() => {
    if (products.length > 0) {
      const max = Math.max(...products.map(p => p.price));
      const roundedMax = Math.ceil(max / 100) * 100;
      setMaxPrice(roundedMax);
      setFilters({
        categories: [],
        subcategories: [],
        priceRange: [0, roundedMax],
        rating: 0,
        inStock: false,
        featured: false,
        bestseller: false,
        newLaunch: false,
        searchTerm: ""
      });
    }
  }, [products]);

  // Apply filters whenever filters change
  useEffect(() => {
    const filteredProducts = products.filter(product => {
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(product.category)) {
        return false;
      }

      // Subcategory filter
      if (filters.subcategories.length > 0 && !filters.subcategories.includes(product.subcategory)) {
        return false;
      }

      // Price range filter
      if (product.price < filters.priceRange[0] || product.price > filters.priceRange[1]) {
        return false;
      }

      // Rating filter
      if (filters.rating > 0 && parseFloat(product.rating) < filters.rating) {
        return false;
      }

      // Stock filter
      if (filters.inStock && !product.inStock) {
        return false;
      }

      // Featured filter
      if (filters.featured && !product.featured) {
        return false;
      }

      // Bestseller filter
      if (filters.bestseller && !product.bestseller) {
        return false;
      }

      // New launch filter
      if (filters.newLaunch && !product.newLaunch) {
        return false;
      }

      // Search term filter
      if (filters.searchTerm && !product.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });

    onFilterChange(filteredProducts, filters);
  }, [filters, products, onFilterChange]);

  const handleCategoryChange = (category: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      categories: checked 
        ? [...prev.categories, category]
        : prev.categories.filter(c => c !== category)
    }));
  };

  const handlePriceRangeChange = (value: number[]) => {
    setFilters(prev => ({
      ...prev,
      priceRange: [value[0], value[1]]
    }));
  };

  const handleRatingChange = (rating: number) => {
    setFilters(prev => ({
      ...prev,
      rating: prev.rating === rating ? 0 : rating
    }));
  };

  const resetFilters = () => {
    setFilters({
      categories: [],
      subcategories: [],
      priceRange: [0, maxPrice],
      rating: 0,
      inStock: false,
      featured: false,
      bestseller: false,
      newLaunch: false,
      searchTerm: ""
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.subcategories.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) count++;
    if (filters.rating > 0) count++;
    if (filters.inStock) count++;
    if (filters.featured) count++;
    if (filters.bestseller) count++;
    if (filters.newLaunch) count++;
    if (filters.searchTerm) count++;
    return count;
  };

  const removeFilter = (filterType: string, value?: string) => {
    switch (filterType) {
      case 'category':
        if (value) {
          handleCategoryChange(value, false);
        }
        break;
      case 'subcategory':
        if (value) {
          setFilters(prev => ({
            ...prev,
            subcategories: prev.subcategories.filter(s => s !== value)
          }));
        }
        break;
      case 'price':
        setFilters(prev => ({ ...prev, priceRange: [0, maxPrice] }));
        break;
      case 'rating':
        setFilters(prev => ({ ...prev, rating: 0 }));
        break;
      case 'inStock':
        setFilters(prev => ({ ...prev, inStock: false }));
        break;
      case 'featured':
        setFilters(prev => ({ ...prev, featured: false }));
        break;
      case 'bestseller':
        setFilters(prev => ({ ...prev, bestseller: false }));
        break;
      case 'newLaunch':
        setFilters(prev => ({ ...prev, newLaunch: false }));
        break;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-semibold">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary">{getActiveFilterCount()}</Badge>
          )}
        </div>
        {getActiveFilterCount() > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.categories.map(category => (
            <Badge key={category} variant="outline" className="flex items-center gap-1">
              {category}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('category', category)}
              />
            </Badge>
          ))}
          {filters.subcategories?.map(subcategory => (
            <Badge key={subcategory} variant="outline" className="flex items-center gap-1">
              {subcategory}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('subcategory', subcategory)}
              />
            </Badge>
          ))}
          {(filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) && (
            <Badge variant="outline" className="flex items-center gap-1">
              ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('price')}
              />
            </Badge>
          )}
          {filters.rating > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              {filters.rating}+ Stars
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('rating')}
              />
            </Badge>
          )}
          {filters.inStock && (
            <Badge variant="outline" className="flex items-center gap-1">
              In Stock
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('inStock')}
              />
            </Badge>
          )}
          {filters.featured && (
            <Badge variant="outline" className="flex items-center gap-1">
              Featured
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('featured')}
              />
            </Badge>
          )}
          {filters.bestseller && (
            <Badge variant="outline" className="flex items-center gap-1">
              Bestseller
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('bestseller')}
              />
            </Badge>
          )}
          {filters.newLaunch && (
            <Badge variant="outline" className="flex items-center gap-1">
              New Launch
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('newLaunch')}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Categories Filter - Only show if there are multiple categories in filtered products */}
      {(() => {
        const availableCategories = [...new Set(products.map(p => p.category))];
        const relevantCategories = categories.filter(cat => 
          availableCategories.includes(cat.name)
        );

        return relevantCategories.length > 1 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {relevantCategories.map(category => {
                const productCount = products.filter(p => p.category === category.name).length;
                return (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={filters.categories.includes(category.name)}
                      onCheckedChange={(checked) => 
                        handleCategoryChange(category.name, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={`category-${category.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {category.name} ({productCount})
                    </label>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Subcategories Filter - Only show if there are multiple subcategories */}
      {(() => {
        const availableSubcategories = [...new Set(products.map(p => p.subcategory).filter(Boolean))];

        return availableSubcategories.length > 1 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Subcategories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableSubcategories.map(subcategory => {
                const productCount = products.filter(p => p.subcategory === subcategory).length;
                return (
                  <div key={subcategory} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subcategory-${subcategory}`}
                      checked={filters.subcategories?.includes(subcategory) || false}
                      onCheckedChange={(checked) => {
                        setFilters(prev => ({
                          ...prev,
                          subcategories: checked 
                            ? [...(prev.subcategories || []), subcategory]
                            : (prev.subcategories || []).filter(s => s !== subcategory)
                        }));
                      }}
                    />
                    <label 
                      htmlFor={`subcategory-${subcategory}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {subcategory} ({productCount})
                    </label>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Price Range Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Price Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={filters.priceRange}
            onValueChange={handlePriceRangeChange}
            max={maxPrice}
            min={0}
            step={50}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>₹{filters.priceRange[0]}</span>
            <span>₹{filters.priceRange[1]}</span>
          </div>
        </CardContent>
      </Card>

      {/* Rating Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[4, 3, 2, 1].map(rating => (
            <div 
              key={rating}
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => handleRatingChange(rating)}
            >
              <Checkbox
                checked={filters.rating === rating}
                readOnly
              />
              <div className="flex items-center">
                {Array.from({ length: 5 }, (_, i) => (
                  <span 
                    key={i} 
                    className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </span>
                ))}
                <span className="text-sm text-gray-600 ml-1">& up</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Product Status Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Product Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="inStock"
              checked={filters.inStock}
              onCheckedChange={(checked) => 
                setFilters(prev => ({ ...prev, inStock: checked as boolean }))
              }
              className="h-3.5 w-3.5 scale-75"
            />
            <label htmlFor="inStock" className="text-sm font-medium cursor-pointer">
              In Stock Only
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={filters.featured}
              onCheckedChange={(checked) => 
                setFilters(prev => ({ ...prev, featured: checked as boolean }))
              }
              className="h-3.5 w-3.5 scale-75"
            />
            <label htmlFor="featured" className="text-sm font-medium cursor-pointer">
              Featured Products
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="bestseller"
              checked={filters.bestseller}
              onCheckedChange={(checked) => 
                setFilters(prev => ({ ...prev, bestseller: checked as boolean }))
              }
              className="h-3.5 w-3.5 scale-75"
            />
            <label htmlFor="bestseller" className="text-sm font-medium cursor-pointer">
              Bestsellers
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="newLaunch"
              checked={filters.newLaunch}
              onCheckedChange={(checked) => 
                setFilters(prev => ({ ...prev, newLaunch: checked as boolean }))
              }
              className="h-3.5 w-3.5 scale-75"
            />
            <label htmlFor="newLaunch" className="text-sm font-medium cursor-pointer">
              New Launches
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}