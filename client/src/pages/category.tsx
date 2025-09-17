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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
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
    } else if (!subcategoryParam && selectedSubcategoryId) {
      setSelectedSubcategoryId("");
    }
  }, [subcategories, selectedSubcategoryId]);

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
  const productsToShow = selectedSubcategoryId ? subcategoryProducts : allProducts;
  const isLoadingProducts = selectedSubcategoryId ? subcategoryProductsLoading : productsLoading;

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
    // Prevent default behavior and handle change smoothly
    if (subcategoryId === "all") {
      setSelectedSubcategoryId("");
      // Update URL without triggering a page refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('subcategory');
      window.history.replaceState(null, '', url.toString());
    } else {
      // Update state immediately
      setSelectedSubcategoryId(subcategoryId);
      // Update URL with subcategory parameter
      const subcategory = subcategories.find(sub => sub.id.toString() === subcategoryId);
      if (subcategory) {
        const url = new URL(window.location.href);
        url.searchParams.set('subcategory', subcategory.slug || subcategory.name.toLowerCase().replace(/\s+/g, '-'));
        window.history.replaceState(null, '', url.toString());
      }
    }
  };

  // Get category sliders with better error handling
  const { data: categorySliderImages = [], isLoading: slidersLoading, error: slidersError } = useQuery({
    queryKey: [`/api/categories/slug/${categorySlug}/sliders`],
    queryFn: async () => {
      const response = await fetch(`/api/categories/slug/${categorySlug}/sliders`);
      if (!response.ok) {
        console.warn(`Failed to fetch sliders for category ${categorySlug}:`, response.status);
        return [];
      }
      const data = await response.json();
      console.log('Category sliders fetched:', data);
      return data;
    },
    enabled: !!categorySlug,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fallback static slider data if no dynamic sliders exist
  const fallbackSliderImages = [
   
  ];

  // Use dynamic sliders if available, otherwise use fallback
  const slidesToShow = categorySliderImages && categorySliderImages.length > 0 ? categorySliderImages : fallbackSliderImages;
  
  // Debug log
  React.useEffect(() => {
    console.log('Category sliders state:', {
      categorySlug,
      slidersLoading,
      slidersError,
      categorySliderImages,
      slidesToShow
    });
  }, [categorySlug, slidersLoading, slidersError, categorySliderImages, slidesToShow]);

  const CategoryHeroSlider = () => {
    const [api, setApi] = React.useState<any>();
    const [current, setCurrent] = React.useState(0);
    const [count, setCount] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(true);
    const [progress, setProgress] = React.useState(0);
    const autoplayDelay = 5000; // 5 seconds

    React.useEffect(() => {
      if (!api) return;

      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);

      api.on("select", () => {
        setCurrent(api.selectedScrollSnap() + 1);
        setProgress(0);
      });
    }, [api]);

    // Auto play functionality
    React.useEffect(() => {
      if (!isPlaying || !api || count <= 1) return;

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (api.canScrollNext()) {
              api.scrollNext();
            } else {
              api.scrollTo(0);
            }
            return 0;
          }
          return prev + (100 / (autoplayDelay / 100));
        });
      }, 100);

      return () => clearInterval(interval);
    }, [api, isPlaying, autoplayDelay, count]);

    const togglePlayPause = () => {
      setIsPlaying(!isPlaying);
    };

    const goToSlide = (index: number) => {
      api?.scrollTo(index);
      setProgress(0);
    };

    return (
      <div className="mb-8 sm:mb-12">
        <Carousel
          setApi={setApi}
          className="w-full relative"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          {/* Progress bar */}
          {count > 1 && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 z-10">
              <div 
                className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <CarouselContent>
            {slidesToShow.map((slide) => (
              <CarouselItem key={slide.id}>
                <div className="relative overflow-hidden rounded-lg sm:rounded-xl">
                  <img
                    src={slide.imageUrl}
                    alt={slide.title || 'Category Banner'}
                    className="w-full h-auto object-contain bg-gray-50"
                    style={{
                      objectFit: 'contain',
                      objectPosition: 'center'
                    }}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4" />
          <CarouselNext className="right-4" />

          {/* Play/Pause button */}
          {count > 1 && (
            <button
              onClick={togglePlayPause}
              className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all"
              aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
            >
              {isPlaying ? (
                <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7L8 5z"/>
                </svg>
              )}
            </button>
          )}

          {/* Slide counter */}
          {count > 1 && (
            <div className="absolute bottom-4 right-4 z-20 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
              {current} / {count}
            </div>
          )}
        </Carousel>

        {/* Dot indicators */}
        {/* {count > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  current === index + 1
                    ? 'bg-blue-500 w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )} */}
      </div>
    );
  };

  if (!match) {
    return <div>Category not found</div>;
  }

  return (
    <div className="">
      <div className="">
        {/* Breadcrumb */}
        {/* <nav className="flex items-center space-x-2 text-sm mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium">
            {categoryLoading ? "Loading..." : category?.name}
          </span>
        </nav> */}

        {/* Hero Slider */}
        {slidersLoading ? (
          <div className="mb-8 sm:mb-12">
            <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96  bg-gray-200 animate-pulse"></div>
          </div>
        ) : (
          <CategoryHeroSlider />
        )}

       

        {/* Controls */}
         <div className="lg:hidden mb-4 sm:mb-6 order-last lg:order-first">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full bg-white/70 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 py-3 sm:py-4 min-h-[48px] touch-target">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <span className="text-sm sm:text-base font-medium">Filters</span>
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
                    subcategories={subcategories || []}
                    showSubcategories={true}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

        {/* Filter and Products Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-4">
              <DynamicFilter
                products={productsToShow || []}
                categories={categories || []}
                subcategories={subcategories || []}
                showSubcategories={true}
                onFilterChange={handleFilterChange}
                className="bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6"
              />
            </div>
          </div>

          {/* Mobile Filter Sheet */}
        

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
                    </h2>
                  </div>
                </div>

                {/* Products Grid/List */}
                {sortedProducts.length > 0 ? (
                  <div className={viewMode === "grid" 
                    ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8" 
                    : "space-y-4 sm:space-y-6"
                  }>
                    {sortedProducts.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        viewMode={viewMode}
                        className="mobile-category-product-card bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300" 
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
                          ? "No products available in this subcategory with current filters" 
                          : "No products available in this category with current filters"
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