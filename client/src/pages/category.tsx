import { useState, useEffect } from "react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ChevronRight, Grid3X3, List, SlidersHorizontal } from "lucide-react";
import ProductCard from "@/components/product-card";
import DynamicFilter from "@/components/dynamic-filter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Product, Category, Subcategory } from "@/lib/types";

export default function CategoryPage() {
  const [match, params] = useRoute("/category/:slug");
  const categorySlug = params?.slug;
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeFilters, setActiveFilters] = useState<any>({});

  // Get category data
  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${categorySlug}`],
    enabled: !!categorySlug,
  });

  // Get categories for filter component
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Get subcategories for this category
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery<Subcategory[]>({
    queryKey: [`/api/categories/${categorySlug}/subcategories`],
    enabled: !!categorySlug,
  });

  // Initialize subcategory selection when component mounts
  useEffect(() => {
    // Reset subcategory selection when changing categories
    setSelectedSubcategoryId("");
  }, [categorySlug]);

  // Get all products initially
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: [`/api/products/category/${categorySlug}`],
    enabled: !!categorySlug,
  });

  // Get products by subcategory when subcategory is selected
  const { data: subcategoryProducts = [], isLoading: subcategoryProductsLoading } = useQuery<Product[]>({
    queryKey: [`/api/products/subcategory/id/${selectedSubcategoryId}`],
    enabled: !!selectedSubcategoryId,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // Determine which products to show
  // If subcategories exist and one is selected, show subcategory products
  // If no subcategories exist OR no subcategory is selected, show all category products
  const productsToShow = selectedSubcategoryId && subcategories.length > 0
    ? (subcategoryProducts.length > 0 ? subcategoryProducts : allProducts)
    : allProducts;
  
  // Show loading state based on what we're actually loading
  const isLoadingProducts = selectedSubcategoryId && subcategories.length > 0 ? subcategoryProductsLoading : productsLoading;

  // Handle dynamic filter changes with debouncing to prevent excessive updates
  const handleFilterChange = React.useCallback((products: Product[], filters: any) => {
    setFilteredProducts(products);
    setActiveFilters(filters);
  }, []);

  // Use filtered products if available, otherwise use productsToShow
  const productsForSorting = filteredProducts.length > 0 || Object.keys(activeFilters).length > 0 ? filteredProducts : productsToShow;

  // Sort products
  const sortedProducts = [...productsForSorting].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return parseFloat(a.price.toString()) - parseFloat(b.price.toString());
      case "price-high":
        return parseFloat(b.price.toString()) - parseFloat(a.price.toString());
      case "newest":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      default: // popular
        return (b.reviewCount || 0) - (a.reviewCount || 0);
    }
  });

  const handleSubcategoryChange = (subcategoryId: string) => {
    // Handle change smoothly without URL updates to prevent refresh
    if (subcategoryId === "all") {
      setSelectedSubcategoryId("");
    } else {
      setSelectedSubcategoryId(subcategoryId);
    }
  };

  if (!match) {
    return <div>Category not found</div>;
  }

  // Debug logging
  React.useEffect(() => {
    console.log('Category Products Debug:', {
      categorySlug,
      allProductsCount: allProducts.length,
      subcategoriesCount: subcategories.length,
      selectedSubcategoryId,
      subcategoryProductsCount: subcategoryProducts.length,
      productsToShowCount: productsToShow.length,
      filteredProductsCount: filteredProducts.length,
      activeFilters
    });
  }, [categorySlug, allProducts, subcategories, selectedSubcategoryId, subcategoryProducts, productsToShow, filteredProducts, activeFilters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">
            {categoryLoading ? "Loading..." : category?.name}
          </span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              {categoryLoading ? "Loading..." : category?.name}
            </h1>
            <p className="text-xl text-gray-700 font-medium">
              Discover our amazing {category?.name?.toLowerCase()} collection
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            {/* Always show category info */}
            <div className="bg-white/70 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-white/20">
              <span className="text-sm font-medium text-gray-700">
                {category?.name} ({allProducts.length} products)
                {subcategories.length === 0 && <span className="ml-2 text-xs text-gray-500">(No subcategories)</span>}
              </span>
            </div>

            {/* Subcategory Filter - only show if subcategories exist */}
            {subcategories.length > 0 && (
              <Select value={selectedSubcategoryId || "all"} onValueChange={handleSubcategoryChange}>
                <SelectTrigger className="w-64 bg-white/70 backdrop-blur-md border border-white/20 rounded-xl shadow-lg">
                  <SelectValue placeholder="Filter by subcategory" />
                </SelectTrigger>
                <SelectContent className="bg-white/90 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl">
                  <SelectItem value="all" className="rounded-lg">
                    All Products ({allProducts.length})
                  </SelectItem>
                  {subcategories.map((subcategory) => {
                    const actualCount = allProducts.filter(product => 
                      product.subcategory && 
                      product.subcategory.toLowerCase() === subcategory.name.toLowerCase()
                    ).length;

                    return (
                      <SelectItem key={subcategory.id} value={subcategory.id.toString()} className="rounded-lg">
                        {subcategory.name} ({actualCount})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

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
                products={productsToShow || []}
                categories={categories || []}
                onFilterChange={handleFilterChange}
                className="bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6"
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
                    Filter products by category, price, rating and more.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <DynamicFilter
                    products={productsToShow || []}
                    categories={categories || []}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Products Display */}
          <div className="lg:col-span-3">
            {isLoadingProducts || categoryLoading ? (
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
                      {sortedProducts.length} Products Found
                      {selectedSubcategoryId && subcategories.length > 0 ? (
                        subcategoryProducts.length === 0 && allProducts.length > 0 ? (
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            (No products in subcategory, showing all category products)
                          </span>
                        ) : (
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            (Filtered by subcategory)
                          </span>
                        )
                      ) : (
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          {subcategories.length === 0 ? '(All category products)' : '(All products)'}
                        </span>
                      )}
                    </h2>
                  </div>
                </div>

                {/* Products Grid/List */}
                {sortedProducts.length > 0 ? (
                  <div className={viewMode === "grid" 
                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8" 
                    : "space-y-6"
                  }>
                    {sortedProducts.map((product) => (
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
                      <p className="text-gray-600 text-lg font-medium">
                        {allProducts.length === 0
                          ? `No products available in ${category?.name} category`
                          : selectedSubcategoryId && subcategories.length > 0
                            ? "No products match the current subcategory and filters"
                            : "No products match the current filters"
                        }
                      </p>
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