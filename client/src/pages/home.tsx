import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  Heart,
  ShoppingCart,
  Eye,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import HeroBanner from "@/components/hero-banner";
import ProductCard from "@/components/product-card";
import { Filter } from "lucide-react";
import DynamicFilter from "@/components/dynamic-filter";
import VideoTestimonials from "@/components/video-testimonials";
import type { Product, Category } from "@/lib/types";

interface Testimonial {
  id: number;
  customerName: string;
  customerImageUrl: string;
  rating: number;
  content: string;
  isActive: boolean;
  createdAt: string;
}

// Testimonials Carousel Component
function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ['/api/testimonials'],
  });

  const activeTestimonials = testimonials.filter(t => t.isActive);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % activeTestimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + activeTestimonials.length) % activeTestimonials.length);
  };

  const getVisibleTestimonials = () => {
    if (activeTestimonials.length === 0) return [];
    
    const visible = [];
    for (let i = -2; i <= 2; i++) {
      const index = (currentIndex + i + activeTestimonials.length) % activeTestimonials.length;
      visible.push({
        testimonial: activeTestimonials[index],
        position: i,
      });
    }
    return visible;
  };

  useEffect(() => {
    if (activeTestimonials.length > 1) {
      const interval = setInterval(nextTestimonial, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTestimonials.length, currentIndex]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Skeleton className="w-full max-w-3xl h-64" />
      </div>
    );
  }

  if (activeTestimonials.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No testimonials available at the moment.</p>
      </div>
    );
  }

  const currentTestimonial = activeTestimonials[currentIndex];
  const visibleTestimonials = getVisibleTestimonials();

  return (
    <div className="relative">
      {/* Profile Images Carousel */}
      <div className="flex items-center justify-center gap-12 mb-8">
        <button 
          onClick={prevTestimonial}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>

        <div className="flex items-center gap-16">
          {visibleTestimonials.map(({ testimonial, position }) => {
            const isCenter = position === 0;
            const opacity = position === 0 ? 1 : position === -1 || position === 1 ? 0.7 : 0.5;
            const size = isCenter ? 'w-24 h-24' : 'w-16 h-16';
            
            return (
              <div
                key={testimonial.id}
                className={`${size} rounded-3xl overflow-hidden transition-all duration-300 ${
                  isCenter ? 'shadow-lg border-4 border-white' : ''
                }`}
                style={{ opacity }}
              >
                <img
                  src={testimonial.customerImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop'}
                  alt={testimonial.customerName}
                  className="w-full h-full object-cover"
                  
                />
              </div>
            );
          })}
        </div>

        <button 
          onClick={nextTestimonial}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Testimonial Content */}
      <div className="text-center max-w-3xl mx-auto">
        {/* Star Rating */}
        <div className="flex justify-center gap-1 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= currentTestimonial.rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Testimonial Text */}
        <p className="text-lg sm:text-xl text-gray-700 mb-6 leading-relaxed">
          {currentTestimonial.content}
        </p>

        {/* Customer Name */}
        <p className="text-sm text-gray-500 italic">— {currentTestimonial.customerName}</p>
      </div>

      {/* Dots Indicator */}
     
    </div>
  );
}

// WhatsApp Integration Component has been moved to Layout
export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredAllProducts, setFilteredAllProducts] = useState<Product[]>([]);
  const [showAllProductsFilter, setShowAllProductsFilter] = useState(false);

  const { data: categories, isLoading: categoriesLoading } = useQuery<
    Category[]
  >({
    queryKey: ["/api/categories"],
  });

  const { data: bestsellerProducts, isLoading: bestsellersLoading } = useQuery<
    Product[]
  >({
    queryKey: ["/api/products/bestsellers"],
  });

  const { data: featuredProducts, isLoading: featuredLoading } = useQuery<
    Product[]
  >({
    queryKey: ["/api/products/featured"],
  });

  const { data: newLaunchProducts, isLoading: newLaunchLoading } = useQuery<
    Product[]
  >({
    queryKey: ["/api/products/new-launches"],
  });

  const { data: allProducts, isLoading: allProductsLoading } = useQuery<
    Product[]
  >({
    queryKey: ["/api/products"],
  });

  

  const categoryImages = {
    skincare:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
    haircare:
      "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
    makeup:
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
    bodycare:
      "https://images.unsplash.com/photo-1571019613454-1cb2f982d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
  };

  const categoryGradients = {
    skincare: "from-pink-100 via-rose-50 to-pink-200",
    haircare: "from-blue-100 via-sky-50 to-blue-200",
    makeup: "from-purple-100 via-violet-50 to-purple-200",
    bodycare: "from-green-100 via-emerald-50 to-green-200",
  };

  return (
    <div>
      {/* Hero Section */}
      <HeroBanner />

      {/* Timer Section
      <Timer
        targetDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} // 7 days from now
        title="Flash Sale Ending Soon!"
        subtitle="Get your favorite beauty products at unbeatable prices"
      /> */}

      {/* Enhanced Categories Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 via-white to-gray-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_var(--tw-gradient-stops))] from-purple-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            {/* <div className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-pink-50 to-purple-500 border border-pink-100 rounded-full mb-6 sm:mb-8 shadow-sm">
              <span className="text-xs sm:text-sm font-semibold text-transparent bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text">
                ✨ Premium Beauty Collection
              </span>
            </div> */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-6 sm:mb-8 tracking-tight">
              <span className="text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text">
                Shop by Category
              </span>
            </h2>
            {/* <p className="text-lg sm:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-light">
              Discover our complete range of beauty and wellness products
              crafted with premium ingredients and designed for your unique
              beauty journey
            </p> */}
            <div className="mt-6 sm:mt-8 w-16 sm:w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto"></div>
          </div>

          {/* Dynamic Categories Grid - Mobile-first Design */}
          {categoriesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mb-12 sm:mb-16 md:mb-20">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 sm:space-y-3 md:space-y-4">
                  <Skeleton className="aspect-square rounded-2xl sm:rounded-3xl" />
                  <Skeleton className="h-4 sm:h-5 md:h-6 w-3/4 mx-auto" />
                  <Skeleton className="h-3 sm:h-4 w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mb-16 sm:mb-20 md:mb-24">
              {categories?.map((category, index) => (
                <Link key={category.id} href={`/category/${category.slug}`}>
                  <div
                    className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-sm hover:shadow-lg sm:hover:shadow-xl md:hover:shadow-2xl transition-all duration-300 sm:duration-500 md:duration-700 transform hover:scale-105 sm:hover:-translate-y-1 md:hover:-translate-y-3 md:hover:rotate-1"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: "fadeInUp 0.6s ease-out forwards",
                    }}
                  >
                    <div className="aspect-square overflow-hidden relative">
                      <div
                        className={`relative h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br ${categoryGradients[category.slug as keyof typeof categoryGradients] || "from-gray-100 to-gray-200"}`}
                      >
                        {/* Decorative Elements - Hidden on mobile for cleaner look */}
                        <div className="hidden sm:block absolute top-3 sm:top-4 right-3 sm:right-4 w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8 bg-white/20 rounded-full blur-sm"></div>
                        <div className="hidden sm:block absolute bottom-3 sm:bottom-4 left-3 sm:left-4 w-3 sm:w-4 md:w-6 h-3 sm:h-4 md:h-6 bg-white/30 rounded-full blur-sm"></div>

                        <img
                          src={
                            category.imageUrl ||
                            categoryImages[
                              category.slug as keyof typeof categoryImages
                            ] ||
                            "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
                          }
                          alt={category.name}
                          className="w-full h-full object-contain rounded-xl sm:rounded-2xl group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-300 sm:duration-500 md:duration-700 shadow-md sm:shadow-lg md:shadow-xl bg-white"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent rounded-xl sm:rounded-2xl group-hover:from-black/5 transition-all duration-300 sm:duration-500"></div>

                        {/* Product count badge - Responsive sizing */}
                        {/* <div className="absolute top-2 sm:top-3 md:top-4 lg:top-6 left-2 sm:left-3 md:left-4 lg:left-6 bg-white/90 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full shadow-sm sm:shadow-md md:shadow-lg">
                          <span className="text-xs sm:text-xs md:text-sm font-semibold text-gray-700">{category.productCount}</span>
                        </div> */}
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative">
                      <h3 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 md:mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300 line-clamp-1">
                        {category.name}
                      </h3>
                      {/* <p className="text-xs sm:text-sm text-gray-500 group-hover:text-gray-600 transition-colors mb-2 sm:mb-3 md:mb-4 line-clamp-1">
                        {category.productCount} products
                      </p> */}
                      <div className="hidden sm:flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-700">
                          Shop Now
                        </span>
                        <svg
                          className="w-3 sm:w-4 h-3 sm:h-4 text-gray-700"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Bestsellers Section - First */}
          <div className="space-y-8 sm:space-y-12">
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-medium mb-3 sm:mb-4 text-center sm:text-left">
                <span className="text-transparent bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 bg-clip-text">
                  Bestsellers
                </span>
              </h3>
            </div>

            {bestsellersLoading ? (
              <div className="px-2 sm:px-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                      <Skeleton className="aspect-square w-full" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : bestsellerProducts && bestsellerProducts.length > 0 ? (
              <>
                <div className="px-2 sm:px-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
                    {bestsellerProducts.slice(0, 8).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        className="w-full h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center mt-10">
                  <Link href="/products?filter=bestseller">
                    <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2">
                      <span>
                        View All Bestsellers ({bestsellerProducts?.length || 0})
                      </span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No bestseller products available at the moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Our Products Section - Second */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="space-y-8 sm:space-y-12">
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-medium mb-3 sm:mb-4 text-center sm:text-left">
                <span className="text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text">
                  Our Products
                </span>
              </h3>
            </div>

            {allProductsLoading ? (
              <div className="px-2 sm:px-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                      <Skeleton className="aspect-square w-full" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="px-2 sm:px-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
                    {allProducts
                      ?.slice(0, 8)
                      .map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          className="w-full h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                        />
                      ))}
                  </div>
                </div>

                {!allProductsLoading &&
                  allProducts &&
                  allProducts.length > 10 && (
                    <div className="text-center mt-12">
                      <Link href="/products">
                        <Button className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-black text-white hover:bg-gray-800 px-10 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                          View All Products ({allProducts.length})
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          </svg>
                        </Button>
                      </Link>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* New Launches Section - Third */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-medium mb-4 sm:mb-6 text-left">
              <span className="text-transparent bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-700 bg-clip-text">
                New Launches
              </span>
            </h2>
          </div>

          {allProductsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-72 w-full" />
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="px-2 sm:px-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
                  {allProducts
                    ?.filter((product) => product.newLaunch)
                    .slice(0, 4)
                    .map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        className="w-full h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                      />
                    ))}
                </div>
              </div>

              <div className="text-center mt-10">
                <Link href="/products?filter=newLaunch">
                  <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2">
                    <span>Explore New Launches</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Button>
                </Link>
              </div>

              {allProducts?.filter((product) => product.newLaunch).length ===
                0 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mb-6">
                    <svg
                      className="w-8 h-8 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    New Products Coming Soon!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    We're working on exciting new launches. Stay tuned!
                  </p>
                  <Link href="/products">
                    <Button
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      Browse All Products
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Video Testimonials Section */}
      <VideoTestimonials />

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium mb-4">
              <span className="text-gray-900">Testimonials</span>
            </h2>
          </div>

          <TestimonialsCarousel />
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      {/* <WhatsAppButton /> */}

      {/* Footer */}
      <footer className="bg-black text-black py-16">
      </footer>
    </div>
  );
}