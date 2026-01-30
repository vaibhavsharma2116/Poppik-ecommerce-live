import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { ChevronRight, Grid3X3, List, ShoppingCart } from "lucide-react";
import ProductCard from "@/components/product-card";
import DynamicFilter from "@/components/dynamic-filter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product, Category } from "@/lib/types";

export default function ProductsPage() {
  const search = useSearch();
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const { toast } = useToast();

  const { data: allProducts, isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: (data: any) => {
      // Ensure we always return an array
      if (!data) {
        console.warn('Products data is null/undefined:', data);
        return [];
      }
      
      // If data has a products property (nested structure), extract it
      if (data.products && Array.isArray(data.products)) {
        console.log('Extracted products from nested structure:', data.products.length);
        return data.products;
      }
      
      // If data is already an array
      if (Array.isArray(data)) {
        console.log('Products data is already an array:', data.length);
        return data;
      }
      
      console.warn('Products data is not in expected format:', typeof data);
      return [];
    }
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Handle initial URL parameter filtering
  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    const filterParam = searchParams.get('filter');
    const categoryParam = searchParams.get('category');

    console.log('Products page - URL params:', { 
      filterParam, 
      categoryParam, 
      productsCount: allProducts?.length || 0, 
      isLoading: productsLoading,
      allProductsSample: allProducts?.slice(0, 2).map(p => ({ 
        id: p.id, 
        name: p.name, 
        bestseller: p.bestseller,
        featured: p.featured,
        newLaunch: p.newLaunch 
      }))
    });

    // Wait for products to load
    if (productsLoading) {
      console.log('Products still loading...');
      return;
    }

    if (!allProducts || allProducts.length === 0) {
      console.log('⚠️ NO PRODUCTS IN DATABASE - Please add products via admin panel first!');
      setFilteredProducts([]);
      return;
    }

    console.log(`✅ ${allProducts.length} products loaded from database`);

    // Apply initial filtering
    let filtered = [...allProducts];

    // Apply URL filter parameters
    if (filterParam) {
      console.log(`🔍 Applying filter: ${filterParam}`);
      const beforeFilterCount = filtered.length;
      
      switch (filterParam) {
        case 'bestseller':
          filtered = filtered.filter(product => {
            const isBestseller = product.bestseller === true || product.bestseller === 1 || product.bestseller === "true";
            console.log(`Product ${product.id} (${product.name}): bestseller=${product.bestseller}, isBestseller=${isBestseller}`);
            return isBestseller;
          });
          setActiveFilters({ bestseller: true });
          console.log(`📊 Bestseller filter: ${beforeFilterCount} → ${filtered.length} products`);
          if (filtered.length === 0) {
            console.log('⚠️ No bestseller products found. Make sure to mark products as bestsellers in admin panel!');
          }
          break;
        case 'featured':
          filtered = filtered.filter(product => product.featured === true || product.featured === 1 || product.featured === "true");
          setActiveFilters({ featured: true });
          console.log(`📊 Featured filter: ${beforeFilterCount} → ${filtered.length} products`);
          break;
        case 'newLaunch':
          filtered = filtered.filter(product => product.newLaunch === true || product.newLaunch === 1 || product.newLaunch === "true");
          setActiveFilters({ newLaunch: true });
          console.log(`📊 New launch filter: ${beforeFilterCount} → ${filtered.length} products`);
          break;
        default:
          setActiveFilters({});
          console.log('ℹ️ Unknown filter parameter, showing all products');
      }
    } else {
      // No filter parameter - show all products
      setActiveFilters({});
      console.log('ℹ️ No filter applied, showing all products');
    }

    if (categoryParam && categoryParam !== "all") {
      const beforeCategoryFilter = filtered.length;
      filtered = filtered.filter(product => product.category === categoryParam);
      console.log(`📂 Category filter (${categoryParam}): ${beforeCategoryFilter} → ${filtered.length} products`);
    }

    console.log(`✅ Final filtered products: ${filtered.length}`);
    setFilteredProducts(filtered);
  }, [allProducts, search, productsLoading]);

  // Handle dynamic filter changes
  const handleFilterChange = (products: Product[], filters: any) => {
    console.log('Dynamic filter change:', { productsCount: products.length, filters });
    
    setFilteredProducts([...products]); // Force array update
    setActiveFilters({...filters}); // Force object update

    // Update URL if needed to reflect filter changes
    const searchParams = new URLSearchParams(search);
    const currentFilter = searchParams.get('filter');

    // If user has manually changed filters, remove the URL filter parameter
    if (currentFilter && !filters[currentFilter]) {
      searchParams.delete('filter');
      const newUrl = `${window.location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      window.history.replaceState(null, '', newUrl);
    }
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
        sorted.sort((a, b) => (parseFloat(String(b.rating || 0)) || 0) - (parseFloat(String(a.rating || 0)) || 0));
        break;
      default: // popular
        sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }

    return sorted;
  }, [filteredProducts, sortBy]);

  const displayedProducts = sortedProducts;

  // Add all filtered products to cart
  const addAllToCart = () => {
    if (filteredProducts.length === 0) {
      toast({
        title: "No products to add",
        description: "Please select some products first",
        variant: "destructive",
      });
      return;
    }

    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      let addedCount = 0;

      filteredProducts.forEach((product) => {
        const itemKey = `${product.id}`;
        const existingItem = cart.find((cartItem: any) => cartItem.itemKey === itemKey);

        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          cart.push({
            id: product.id,
            itemKey,
            name: product.name,
            price: `₹${product.price}`,
            originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
            image: product.imageUrl || (product.images && Array.isArray(product.images) && product.images.length > 0 ? product.images[0].url || product.images[0].imageUrl : ''),
            quantity: 1,
            inStock: product.inStock !== false,
            selectedShade: null,
            cashbackPercentage: product.cashbackPercentage ? parseFloat(String(product.cashbackPercentage)) : undefined,
            cashbackPrice: product.cashbackPrice ? parseFloat(String(product.cashbackPrice)) : undefined,
          });
          addedCount++;
        }
      });

      localStorage.setItem("cart", JSON.stringify(cart));
      localStorage.setItem("cartCount", cart.reduce((total: number, item: any) => total + item.quantity, 0).toString());
      window.dispatchEvent(new Event("cartUpdated"));

      toast({
        title: "✅ Added to Cart",
        description: `${addedCount} product${addedCount !== 1 ? 's' : ''} added successfully! You now have ${cart.length} items in your cart.`,
      });
    } catch (error) {
      console.error("Error adding all products to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add products to cart",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mobile-page-container min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16">
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {/* <div className="text-center mb-12">
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">Our Products</h1>
            <p className="text-xl text-gray-700 font-medium">Discover our complete range of premium beauty products</p>
          </div>
        </div> */}

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            {/* <div className="flex items-center bg-white/70 backdrop-blur-md border border-white/20 rounded-2xl p-1 shadow-lg"> */}
              {/* <Button
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
            </div> */}
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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
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
                <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {displayedProducts.length} Products Found
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Products Grid/List */}
                {displayedProducts.length > 0 ? (
                  <div className={viewMode === "grid" 
                    ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8" 
                    : "space-y-6"
                  }>
                    {displayedProducts.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        viewMode={viewMode}
                        titleLines={4}
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