
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ChevronRight, Grid3X3, List } from "lucide-react";
import ProductCard from "@/components/product-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Product, Category, Subcategory } from "@/lib/types";

export default function CategoryPage() {
  const [match, params] = useRoute("/category/:slug");
  const categorySlug = params?.slug;
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Get category data
  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${categorySlug}`],
    enabled: !!categorySlug,
  });

  // Get subcategories for this category
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery<Subcategory[]>({
    queryKey: [`/api/categories/${categorySlug}/subcategories`],
    enabled: !!categorySlug,
  });

  // Handle URL subcategory parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subcategoryParam = urlParams.get('subcategory');
    
    if (subcategoryParam && subcategories.length > 0) {
      // Find subcategory by slug
      const subcategory = subcategories.find(sub => 
        sub.slug === subcategoryParam || 
        sub.name.toLowerCase().replace(/\s+/g, '-') === subcategoryParam
      );
      
      if (subcategory) {
        setSelectedSubcategoryId(subcategory.id.toString());
      }
    } else if (!subcategoryParam) {
      setSelectedSubcategoryId("");
    }
  }, [subcategories, window.location.search]);

  // Listen for URL changes
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const subcategoryParam = urlParams.get('subcategory');
      
      if (subcategoryParam && subcategories.length > 0) {
        const subcategory = subcategories.find(sub => 
          sub.slug === subcategoryParam || 
          sub.name.toLowerCase().replace(/\s+/g, '-') === subcategoryParam
        );
        
        if (subcategory) {
          setSelectedSubcategoryId(subcategory.id.toString());
        }
      } else if (!subcategoryParam) {
        setSelectedSubcategoryId("");
      }
      
      // Force re-render by updating a state
      window.dispatchEvent(new Event('subcategory-change'));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [subcategories]);

  // Force refresh when subcategory changes via URL
  useEffect(() => {
    const handleSubcategoryChange = () => {
      // Force query invalidation instead of page reload
      window.dispatchEvent(new Event('force-refetch'));
    };

    window.addEventListener('subcategory-change', handleSubcategoryChange);
    return () => window.removeEventListener('subcategory-change', handleSubcategoryChange);
  }, []);

  // Get all products initially
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: [`/api/products/category/${categorySlug}`],
    enabled: !!categorySlug,
  });

  // Get products by subcategory when subcategory is selected
  const { data: subcategoryProducts = [], isLoading: subcategoryProductsLoading, refetch: refetchSubcategoryProducts } = useQuery<Product[]>({
    queryKey: [`/api/products/subcategory/id/${selectedSubcategoryId}`, selectedSubcategoryId],
    enabled: !!selectedSubcategoryId,
    refetchOnWindowFocus: false,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Force refetch when URL changes
  useEffect(() => {
    const handleForceRefetch = () => {
      if (selectedSubcategoryId) {
        refetchSubcategoryProducts();
      }
    };

    window.addEventListener('force-refetch', handleForceRefetch);
    return () => window.removeEventListener('force-refetch', handleForceRefetch);
  }, [selectedSubcategoryId, refetchSubcategoryProducts]);

  // Determine which products to show
  const productsToShow = selectedSubcategoryId ? subcategoryProducts : allProducts;
  const isLoadingProducts = selectedSubcategoryId ? subcategoryProductsLoading : productsLoading;

  // Sort products
  const sortedProducts = [...productsToShow].sort((a, b) => {
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
    if (subcategoryId === "all") {
      setSelectedSubcategoryId("");
      // Update URL to remove subcategory parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('subcategory');
      window.history.pushState({}, '', url.toString());
    } else {
      setSelectedSubcategoryId(subcategoryId);
      // Update URL with subcategory parameter
      const subcategory = subcategories.find(sub => sub.id.toString() === subcategoryId);
      if (subcategory) {
        const url = new URL(window.location.href);
        url.searchParams.set('subcategory', subcategory.slug || subcategory.name.toLowerCase().replace(/\s+/g, '-'));
        window.history.pushState({}, '', url.toString());
      }
    }
  };

  if (!match) {
    return <div>Category not found</div>;
  }

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
            {category?.description && (
              <p className="text-xl text-gray-700 font-medium">{category.description}</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            {/* Subcategory Filter */}
            {subcategories.length > 0 && (
              <Select value={selectedSubcategoryId || "all"} onValueChange={handleSubcategoryChange}>
                <SelectTrigger className="w-64 bg-white/70 backdrop-blur-md border border-white/20 rounded-xl shadow-lg">
                  <SelectValue placeholder="Select subcategory" />
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

        {/* Products Display */}
        {isLoadingProducts || categoryLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
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
                  {selectedSubcategoryId && (
                    <span className="text-base font-normal text-gray-600 ml-2">
                      in {subcategories.find(s => s.id.toString() === selectedSubcategoryId)?.name}
                    </span>
                  )}
                </h2>
              </div>
            </div>

            {/* Products Grid/List */}
            {sortedProducts.length > 0 ? (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8" 
                : "space-y-6"
              }>
                {sortedProducts.map((product) => (
                  <ProductCard 
                    key={`${product.id}-${selectedSubcategoryId || 'all'}-${Date.now()}`} 
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
                    {selectedSubcategoryId 
                      ? "No products available in this subcategory" 
                      : "No products available in this category"
                    }
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
