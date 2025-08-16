import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { ChevronRight, Grid3X3, List } from "lucide-react";
import ProductCard from "@/components/product-card";
import DynamicFilter from "@/components/dynamic-filter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import type { Product, Category } from "@/lib/types";

export default function ProductsPage() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeFilters, setActiveFilters] = useState<any>({});

  const { data: allProducts, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Handle initial URL parameter filtering
  useEffect(() => {
    if (allProducts) {
      const filterParam = searchParams.get('filter');
      let filtered = [...allProducts];

      // Apply URL filter parameters
      if (filterParam) {
        switch (filterParam) {
          case 'bestseller':
            filtered = allProducts.filter(product => product.bestseller);
            break;
          case 'featured':
            filtered = allProducts.filter(product => product.featured);
            break;
          case 'newLaunch':
            filtered = allProducts.filter(product => product.newLaunch);
            break;
        }
      }

      let categoryParam = searchParams.get('category');
      if (categoryParam && categoryParam !== "all") {
        filtered = filtered.filter(product => product.category === categoryParam);
      }

      setFilteredProducts(filtered);
    }
  }, [allProducts, searchParams]);

  // Handle dynamic filter changes
  const handleFilterChange = (products: Product[], filters: any) => {
    setFilteredProducts(products);
    setActiveFilters(filters);
  };

  // Sort products based on selected sort option
  const sortedProducts = useMemo(() => {
    if (!filteredProducts) return [];

    let sorted = [...filteredProducts];

    switch (sortBy) {
      case "price-low":
        sorted.sort((a, b) => {
          const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
          const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
          return priceA - priceB;
        });
        break;
      case "price-high":
        sorted.sort((a, b) => {
          const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
          const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
          return priceB - priceA;
        });
        break;
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case "rating":
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default: // popular
        sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }

    return sorted;
  }, [filteredProducts, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">Our Products</h1>
            <p className="text-xl text-gray-700 font-medium">Discover our complete range of premium beauty products</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/70 backdrop-blur-md border border-white/20 rounded-2xl p-1 shadow-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-xl transition-all duration-200 ${viewMode === "grid" ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" : "hover:bg-gray-100"}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-xl transition-all duration-200 ${viewMode === "list" ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" : "hover:bg-gray-100"}`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-64 bg-white/70 backdrop-blur-md border border-white/20 rounded-xl shadow-lg">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white/90 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl">
                <SelectItem value="popular" className="rounded-lg">Most Popular</SelectItem>
                <SelectItem value="price-low" className="rounded-lg">Price: Low to High</SelectItem>
                <SelectItem value="price-high" className="rounded-lg">Price: High to Low</SelectItem>
                <SelectItem value="newest" className="rounded-lg">Newest First</SelectItem>
                <SelectItem value="rating" className="rounded-lg">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter and Products Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-4">
              <DynamicFilter
                products={allProducts || []}
                categories={categories || []}
                onFilterChange={handleFilterChange}
                className="bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20"
              />
            </div>
          </div>

          {/* Mobile Filter Sheet */}
          <div className="lg:hidden mb-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full bg-white/70 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-white/90 backdrop-blur-md">
                <SheetHeader>
                  <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Filters</SheetTitle>
                  <SheetDescription className="text-gray-600 font-medium">
                    Filter products by category, price, and more.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <DynamicFilter
                    products={allProducts || []}
                    categories={categories || []}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Products Display */}
          <div className="lg:col-span-3">
            {productsLoading || categoriesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20">
                    <Skeleton className="h-64 w-full rounded-t-3xl" />
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-3 rounded-xl" />
                      <Skeleton className="h-5 w-1/2 mb-3 rounded-xl" />
                      <Skeleton className="h-8 w-1/4 rounded-xl" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Results Count */}
                <div className="flex items-center justify-between mb-8">
                  <div className="bg-white/70 backdrop-blur-md rounded-2xl px-6 py-4 shadow-lg border border-white/20">
                    <h2 className="text-xl font-bold text-gray-900">
                      {filteredProducts.length} Products Found
                    </h2>
                  </div>
                </div>

                {/* Products Grid/List */}
                {filteredProducts.length > 0 ? (
                  <div className={viewMode === "grid" 
                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8" 
                    : "space-y-6"
                  }>
                    {filteredProducts.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="max-w-md mx-auto bg-white/70 backdrop-blur-md rounded-3xl p-12 shadow-2xl border border-white/20">
                      <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full"></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">No products found</h3>
                      <p className="text-gray-600 text-lg font-medium">Try adjusting your filters or search terms</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}