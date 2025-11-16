import React, { useState, useEffect, lazy, Suspense } from "react";
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
  Calendar,
  User,
  Package,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import HeroBanner from "@/components/hero-banner";
import ProductCard from "@/components/product-card";
import { Filter } from "lucide-react";
import DynamicFilter from "@/components/dynamic-filter";
import VideoTestimonials from "@/components/video-testimonials";
import type { Product, Category } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import AnnouncementBar from "@/components/announcement-bar";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { LazyImage } from "@/components/LazyImage";

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
    const displayCount = 3;
    const offset = Math.floor(displayCount / 2);

    for (let i = -offset; i <= offset; i++) {
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
  }, [activeTestimonials.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12">
        <Skeleton className="w-full max-w-3xl h-48 sm:h-64" />
      </div>
    );
  }

  if (activeTestimonials.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 px-4">
        <p className="text-sm sm:text-base text-gray-500">No testimonials available at the moment.</p>
      </div>
    );
  }

  const currentTestimonial = activeTestimonials[currentIndex];
  const visibleTestimonials = getVisibleTestimonials();

  return (
    <div className="relative px-2 sm:px-4">
      {/* Profile Images Carousel */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-8 lg:gap-12 mb-6 sm:mb-8">
        <button
          onClick={prevTestimonial}
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-600" />
        </button>

        <div className="flex items-center gap-1 sm:gap-3 md:gap-6 lg:gap-10 overflow-hidden">
          {visibleTestimonials.map(({ testimonial, position }) => {
            const isCenter = position === 0;

            let opacity = 1;
            let size = '';

          if (isCenter) {
            size = 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32';
            opacity = 1;
          } else if (position === -1 || position === 1) {
             size = 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24';
            opacity = 0.7;
          } else {
              size = 'w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20';
              opacity = 0.5;
          }


            return (
              <div
                key={testimonial.id}
                className={`${size} rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 flex-shrink-0 ${
                  isCenter ? 'shadow-md sm:shadow-lg border-2 sm:border-4 border-white' : ''
                } ${position === -1 || position === 1 ? 'blur-[2px]' : ''}`}
                style={{ opacity }}
              >
                <img
                  src={testimonial.customerImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop'}
                  alt={testimonial.customerName}
                  className="w-full h-full"
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={nextTestimonial}
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-600" />
        </button>
      </div>

      {/* Testimonial Content */}
      <div className="text-center max-w-3xl mx-auto px-4 sm:px-6">
        {/* Star Rating */}
        <div className="flex justify-center gap-0.5 sm:gap-1 mb-4 sm:mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                star <= currentTestimonial.rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Testimonial Text */}
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 mb-4 sm:mb-6 leading-relaxed px-2">
          {currentTestimonial.content}
        </p>

        {/* Customer Name */}
        <p className="text-xs sm:text-sm text-gray-500 italic">— {currentTestimonial.customerName}</p>
      </div>
    </div>
  );
}

// WhatsApp Integration Component has been moved to Layout
export default function HomePage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredAllProducts, setFilteredAllProducts] = useState<Product[]>([]);
  const [showAllProductsFilter, setShowAllProductsFilter] = useState(false);

  // Store affiliate code from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateRef = urlParams.get('ref');

    if (affiliateRef) {
      localStorage.setItem('affiliateRef', affiliateRef);
      console.log('Affiliate code stored:', affiliateRef);
    }
  }, []);

  const { data: categories, isLoading: categoriesLoading } = useQuery<
    Category[]
  >({
    queryKey: ["/api/categories"],
  });

  const { data: bestsellerProducts, isLoading: bestsellersLoading } = useQuery<
    Product[]
  >({
    queryKey: ["/api/products/bestsellers"],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch featured products
  const { data: featuredProducts = [], isLoading: isLoadingFeatured } = useQuery<Product[]>({
    queryKey: ["/api/products/featured"],
    queryFn: async () => {
      const res = await fetch("/api/products/featured");
      if (!res.ok) throw new Error("Failed to fetch featured products");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch new arrivals
  const { data: newArrivals = [], isLoading: isLoadingNew } = useQuery<Product[]>({
    queryKey: ["/api/products/new-launches"],
    queryFn: async () => {
      const res = await fetch("/api/products/new-launches");
      if (!res.ok) throw new Error("Failed to fetch new arrivals");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: allProducts, isLoading: allProductsLoading } = useQuery<
    Product[]
  >({
    queryKey: ["/api/products"],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    select: (data) => {
      if (!data || !Array.isArray(data)) return [];
      return data.slice(0, 8); // Only take first 8 products for home page
    },
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

  // Fetch data for filters
  const { data: allProductsForFilter = [], isLoading: allProductsForFilterLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/all"], // Assuming a new endpoint for all products without slicing
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const { data: featured = [], isLoading: isLoadingFeaturedProducts } = useQuery<Product[]>({
    queryKey: ["/api/products/featured"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: newLaunches = [], isLoading: isLoadingNewLaunches } = useQuery<Product[]>({
    queryKey: ["/api/products/new-launches"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: bestsellers = [], isLoading: isLoadingBestsellers } = useQuery<Product[]>({
    queryKey: ["/api/products/bestsellers"],
    staleTime: 5 * 60 * 1000,
  });
console.log("featured",featured)

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
      <section className="py-6 bg-gradient-to-br from-slate-50 via-white to-gray-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_var(--tw-gradient-stops))] from-purple-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">


          {/* Dynamic Categories Grid - Mobile-first Design */}
          {categoriesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mb-12 sm:mb-16 md:mb-20">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 sm:space-3 md:space-y-4">
                  <Skeleton className="aspect-square rounded-2xl sm:rounded-3xl" />
                  <Skeleton className="h-4 sm:h-5 md:h-6 w-3/4 mx-auto" />
                  <Skeleton className="h-3 sm:h-4 w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <div
                id="categories-scroll-container"
                className="overflow-auto scrollbar-hide pb-4"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollBehavior: 'smooth'
                }}
              >
                <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
                <div
                  className="flex gap-4 justify-center"
                  style={{
                    display: 'flex',
                    gap: 'clamp(8px, 2vw, 16px)',
                    paddingLeft: 'clamp(8px, 2vw, 16px)',
                    paddingRight: 'clamp(8px, 2vw, 16px)',
                    justifyContent: 'center'
                  }}
                >
                  {categories?.map((category, index) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.slug}`}
                      className="group inline-block flex-shrink-0"
                      style={{
                        width: 'clamp(140px, 40vw, 280px)',
                        minWidth: '140px',
                        maxWidth: '280px'
                      }}
                    >
                      <div
                        className="relative bg-white/70 backdrop-blur-md overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 group-hover:-translate-y-1 border border-white/20"
                        style={{
                          borderRadius: 'clamp(12px, 3vw, 24px)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div
                          className="overflow-hidden relative"
                          style={{
                            aspectRatio: '1',
                            borderRadius: 'clamp(12px, 3vw, 24px)'
                          }}
                        >
                          <div
                            className={`relative h-full bg-gradient-to-br ${categoryGradients[category.slug as keyof typeof categoryGradients] || "from-gray-100 to-gray-200"}`}
                            style={{
                              padding: 'clamp(8px, 2vw, 32px)'
                            }}
                          >
                            {/* Decorative Elements - Hidden on mobile for cleaner look */}
                            <div
                              className="hidden sm:block absolute bg-white/20 rounded-full blur-sm"
                              style={{
                                top: 'clamp(8px, 2vw, 16px)',
                                right: 'clamp(8px, 2vw, 16px)',
                                width: 'clamp(12px, 3vw, 32px)',
                                height: 'clamp(12px, 3vw, 32px)'
                              }}
                            ></div>
                            <div
                              className="hidden sm:block absolute bg-white/30 rounded-full blur-sm"
                              style={{
                                bottom: 'clamp(8px, 2vw, 16px)',
                                left: 'clamp(8px, 2vw, 16px)',
                                width: 'clamp(8px, 2vw, 24px)',
                                height: 'clamp(8px, 2vw, 24px)'
                              }}
                            ></div>

                            <img
                              src={
                                category.imageUrl ||
                                categoryImages[
                                  category.slug as keyof typeof categoryImages
                                ] ||
                                "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
                              }
                              alt={category.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 bg-white"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                borderRadius: 'clamp(8px, 2vw, 16px)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <div
                              className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent group-hover:from-black/5 transition-all duration-300"
                              style={{
                                borderRadius: 'clamp(8px, 2vw, 16px)'
                              }}
                            ></div>
                          </div>
                        </div>
                        <div
                          className="text-center relative"
                          style={{
                            padding: 'clamp(8px, 2vw, 32px)'
                          }}
                        >
                          <h3
                            className="font-bold text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300 line-clamp-1"
                            style={{
                              fontSize: 'clamp(0.75rem, 2vw, 1.5rem)',
                              lineHeight: '1.2',
                              marginBottom: 'clamp(4px, 1vw, 12px)'
                            }}
                          >
                            {category.name}
                          </h3>
                          <div
                            className="hidden sm:flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
                            style={{
                              fontSize: 'clamp(0.65rem, 1.5vw, 0.875rem)'
                            }}
                          >
                            <span className="font-medium text-gray-700">
                              Shop Now
                            </span>
                            <svg
                              className="text-gray-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              style={{
                                width: 'clamp(12px, 2vw, 16px)',
                                height: 'clamp(12px, 2vw, 16px)'
                              }}
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
              </div>

              {/* Navigation Buttons */}
              {categories && categories.length > 4 && (
                <>
                  <button
                    onClick={() => {
                      const container = document.getElementById('categories-scroll-container');
                      if (container) {
                        const scrollAmount = window.innerWidth < 640 ? 160 : 300;
                        container.scrollBy({
                          left: -scrollAmount,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full transition-all duration-200 hidden sm:flex items-center justify-center"
                    style={{
                      padding: 'clamp(8px, 2vw, 12px)'
                    }}
                    aria-label="Scroll left"
                  >
                    <svg
                      className="text-gray-800"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        width: 'clamp(20px, 4vw, 24px)',
                        height: 'clamp(20px, 4vw, 24px)'
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      const container = document.getElementById('categories-scroll-container');
                      if (container) {
                        const scrollAmount = window.innerWidth < 640 ? 160 : 300;
                        container.scrollBy({
                          left: scrollAmount,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full transition-all duration-200 hidden sm:flex items-center justify-center"
                    style={{
                      padding: 'clamp(8px, 2vw, 12px)'
                    }}
                    aria-label="Scroll right"
                  >
                    <svg
                      className="text-gray-800"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        width: 'clamp(20px, 4vw, 24px)',
                        height: 'clamp(20px, 4vw, 24px)'
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Bestsellers Section - First */}
          <div className="space-y-8 sm:space-y-12">
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-medium mb-3 sm:mb-4 text-center">
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
                    {bestsellerProducts.slice(0, 4).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        className="w-full h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center mt-6 sm:mt-8 md:mt-10">
                  <Link href="/products?filter=bestsellers">
                    <Button className="font-poppins bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2">
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
      <section className="py-6 bg-gradient-to-br from-slate-50 via-white to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="space-y-8 sm:space-y-12">
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-medium mb-3 sm:mb-4 text-center">
                <span className="text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text">
                  Our Products
                </span>
              </h3>
            </div>

            {isLoadingFeatured ? (
              <div className="px-2 sm:px-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
                  {Array.from({ length: 4 }).map((_, i) => (
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
            ) : featured && featured.length > 0 ? (
              <>
                <div className="px-2 sm:px-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
                    {featured.slice(0, 4).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        className="w-full h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center mt-6 sm:mt-8 md:mt-10">
                  <Link href="/products?filter=featured">
                    <Button className="font-poppins inline-flex items-center justify-center gap-2 whitespace-nowrap bg-black text-white hover:bg-gray-800 px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <span>View All Products  ({featured?.length || 0})</span>
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
                  No products available at the moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* New Launches Section - Third */}
      <section className="py-6 bg-gradient-to-br from-slate-50 via-white to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="space-y-8 sm:space-y-12">
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-medium mb-3 sm:mb-4 text-center">
                <span className="text-transparent bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-700 bg-clip-text">
                  New Launches
                </span>
              </h3>
            </div>

            {isLoadingNew ? (
              <div className="px-2 sm:px-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
                  {Array.from({ length: 4 }).map((_, i) => (
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
            ) : newArrivals && newArrivals.length > 0 ? (
              <>
                <div className="px-2 sm:px-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
                    {newArrivals.slice(0, 4).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        className="w-full h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center mt-6 sm:mt-8 md:mt-10">
                  <Link href="/products?filter=newLaunches">
                    <Button className="font-poppins bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2">
                      <span>
                        View All New Launches ({newLaunches?.length || 0})
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
                  No new launches available at the moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* UGC Video Section */}

      {/* Combos Section */}
      <ComboSection />

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 md:py-5 bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium mb-2 sm:mb-4">
              <span className="text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text">
                Testimonials
              </span>
            </h2>
          </div>

          <TestimonialsCarousel />
        </div>
      </section>

      <VideoTestimonials />

      {/* Blog Section - Latest Posts Per Category */}
      <section className="py-8 sm:py-10 md:py-12 lg:py-16 bg-gradient-to-br from-slate-50 via-white to-gray-50">
        <div className="max-w-12xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 px-2">
              <span className="text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text">
                Latest From Our Blog
              </span>
            </h2>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 px-4">
              Stay in style with the freshest beauty trends, tips, and expert advice
            </p>
          </div>

          <LatestBlogPostsPerCategory />
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      {/* <WhatsAppButton /> */}

      {/* Footer */}
      {/* <footer className="bg-black text-black py-16">
      </footer> */}
    </div>
  );
}

// Combo Section Component
function ComboSection() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [wishlist, setWishlist] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: comboProducts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/combos"],
    select: (data) => Array.isArray(data) ? data : [],
  });

  const activeComboProducts = Array.isArray(comboProducts)
    ? comboProducts.filter(combo => combo.isActive).slice(0, 4)
    : [];

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const savedWishlist = localStorage.getItem("wishlist");
    if (savedWishlist) {
      try {
        const parsedWishlist = JSON.parse(savedWishlist);
        const wishlistIds = new Set(parsedWishlist.map((item: any) => item.id));
        setWishlist(wishlistIds);
      } catch (error) {
        console.error("Error loading wishlist:", error);
      }
    }
  }, []);

  const handleToggleWishlist = (combo: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is logged in
    const user = localStorage.getItem("user");
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your wishlist",
        variant: "destructive",
      });
      window.location.href = "/auth/login";
      return;
    }

    try {
      const wishlistData = JSON.parse(localStorage.getItem("wishlist") || "[]");
      const existingIndex = wishlistData.findIndex((item: any) => item.id === combo.id && item.isCombo);

      if (existingIndex >= 0) {
        wishlistData.splice(existingIndex, 1);
        setWishlist(prev => {
          const newSet = new Set(prev);
          newSet.delete(combo.id);
          return newSet;
        });
        toast({
          title: "Removed from Wishlist",
          description: `${combo.name} has been removed from your wishlist`,
        });
      } else {
        const wishlistItem = {
          id: combo.id,
          name: combo.name.substring(0, 100),
          price: `₹${combo.price}`,
          originalPrice: combo.originalPrice ? `₹${combo.originalPrice}` : undefined,
          image: combo.imageUrl?.substring(0, 200) || '',
          inStock: combo.inStock !== false,
          category: 'combo',
          rating: combo.rating?.toString() || '5.0',
          isCombo: true,
        };
        wishlistData.push(wishlistItem);
        setWishlist(prev => new Set([...prev, combo.id]));
        toast({
          title: "Added to Wishlist",
          description: `${combo.name} has been added to your wishlist`,
        });
      }

      localStorage.setItem("wishlist", JSON.stringify(wishlistData));
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("Wishlist storage error:", error);
      toast({
        title: "Storage Error",
        description: "Your wishlist is full. Please remove some items to add new ones.",
        variant: "destructive",
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300"
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <Skeleton className="h-12 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
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
      </section>
    );
  }

  if (activeComboProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium mb-2 sm:mb-4">
            <span className="text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
              Exclusive Combo Deals
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">
            Save more with our specially curated combo packs
          </p>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
          {activeComboProducts.map((combo) => {
            const products = typeof combo.products === 'string' ? JSON.parse(combo.products) : combo.products;
            const price = typeof combo.price === 'string' ? parseFloat(combo.price) : combo.price;
            const originalPrice = typeof combo.originalPrice === 'string' ? parseFloat(combo.originalPrice) : combo.originalPrice;
            const rating = typeof combo.rating === 'string' ? parseFloat(combo.rating) : combo.rating;
            const discountPercentage = originalPrice > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
            const isHovered = hoveredCard === combo.id;

            return (
              <div
                key={combo.id}
                className="group transition-all duration-300 overflow-hidden bg-white rounded-lg sm:rounded-xl shadow-sm hover:shadow-md cursor-pointer flex flex-col"
                onMouseEnter={() => setHoveredCard(combo.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Image Section */}
                <div
                  className="relative overflow-hidden group-hover:scale-105 transition-transform duration-300"
                  onClick={() => {
                    React.startTransition(() => {
                      window.location.href = `/combo/${combo.id}`;
                    });
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWishlist(combo, e);
                    }}
                    className="absolute top-1 right-1 sm:top-2 sm:right-2 p-1.5 sm:p-2 hover:scale-110 transition-all duration-300 z-10 bg-white/80 backdrop-blur-sm rounded-full shadow-md"
                  >
                    <Heart
                      className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-all duration-300 ${
                        wishlist.has(combo.id)
                          ? "text-red-500 fill-current"
                          : "text-gray-400 hover:text-pink-500"
                      }`}
                    />
                  </button>
                  <div className="relative overflow-hidden bg-white">
                    <div className="aspect-square overflow-hidden rounded-t-lg sm:rounded-t-xl bg-gray-100">
                      {combo.imageUrl || (combo.images && combo.images.length > 0) ? (
                        <img
                          src={combo.imageUrl || combo.images[0]}
                          alt={combo.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=75';
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
                    <div className={`absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-2 sm:p-3 md:p-4 lg:p-5 space-y-2 sm:space-y-2.5 md:space-y-3 bg-white flex-1 flex flex-col">
                  {/* Rating */}
                  <div className="flex items-center justify-between bg-white rounded-lg p-1 sm:p-1.5 md:p-2">
                    <div className="flex items-center gap-0.5">
                      {renderStars(rating)}
                    </div>
                    <span className="text-gray-700 text-xs sm:text-sm font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                      {rating}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="font-semibold text-gray-900 hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 hover:bg-clip-text hover:text-transparent transition-all duration-300 cursor-pointer line-clamp-3 text-xs sm:text-sm md:text-base break-words"
                    style={{ minHeight: '3.6rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', hyphens: 'auto' }}
                    onClick={() => {
                      React.startTransition(() => {
                        window.location.href = `/combo/${combo.id}`;
                      });
                    }}
                  >
                    {combo.name}
                  </h3>

                  {/* Price Section */}
                  <div className="space-y-1 sm:space-y-1.5 md:space-y-2 mt-auto">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-baseline space-x-1 sm:space-x-2 min-h-[24px]">
                        <span className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                          ₹{price.toLocaleString()}
                        </span>
                        {originalPrice > price && (
                          <>
                            <span className="text-xs sm:text-sm text-gray-500 line-through">
                              ₹{originalPrice.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 sm:px-2 rounded whitespace-nowrap">
                              {discountPercentage}% OFF
                            </span>
                          </>
                        )}
                      </div>

                      {/* Cashback Badge - Fixed height container */}
                      <div className="mt-1" style={{ minHeight: '28px', display: 'flex', alignItems: 'center' }}>
                        {combo.cashbackPercentage && combo.cashbackPrice ? (
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-1.5 w-full">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] sm:text-xs font-semibold text-orange-700">Cashback</span>
                              <span className="text-[10px] sm:text-xs bg-orange-200 text-orange-800 px-1.5 sm:px-2 py-0.5 rounded-full font-bold">
                                {combo.cashbackPercentage}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ minHeight: '28px' }}></div>
                        )}
                      </div>

                      {/* Stock status and Savings */}
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                          <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse ${
                            combo.inStock !== false
                              ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                              : 'bg-gradient-to-r from-red-400 to-rose-400'
                          }`}></div>
                          <span className={`font-bold text-xs sm:text-sm ${
                            combo.inStock !== false ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {combo.inStock !== false ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                        {originalPrice > price && (
                          <span className="text-xs sm:text-sm font-bold text-green-600">
                            Save ₹{(originalPrice - price).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <Button
                    className="w-full text-xs sm:text-sm py-2 sm:py-2.5 md:py-3 flex items-center justify-center gap-1 sm:gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                    onClick={() => window.location.href = `/combo/${combo.id}`}
                  >
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Add to </span>Cart
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8 sm:mt-10">
          <Link href="/combos">
            <Button className="font-poppins bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 sm:px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2">
              <span>View All Combos</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        </div>
      </div>
    </section>
  );
}

// Latest Blog Posts Per Category Component
function LatestBlogPostsPerCategory() {
  const { data: blogPosts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/blog/posts"],
  });

  const { data: blogCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/blog/categories"],
  });

  // Get latest post per category
  const latestPostsPerCategory = React.useMemo(() => {
    const categoryMap = new Map<string, any>();

    // Ensure blogPosts is an array
    if (!Array.isArray(blogPosts)) {
      return [];
    }

    // Filter published posts and sort by createdAt
    const publishedPosts = blogPosts
      .filter(post => post.published)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Get the latest post for each category
    publishedPosts.forEach(post => {
      if (post.category && !categoryMap.has(post.category)) {
        categoryMap.set(post.category, post);
      }
    });

    return Array.from(categoryMap.values());
  }, [blogPosts]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-2 sm:px-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg sm:rounded-none overflow-hidden shadow-sm">
            <Skeleton className="aspect-square w-full" style={{ paddingBottom: '66.67%' }} />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (latestPostsPerCategory.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8 px-4">
        <p className="text-sm sm:text-base text-gray-500">No blog posts available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-2 sm:px-0">
        {latestPostsPerCategory.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`}>
            <div className="group cursor-pointer">
              {/* Image */}
              <div className="relative overflow-hidden bg-gray-100 mb-3 sm:mb-4 rounded-lg sm:rounded-none" style={{ paddingBottom: '66.67%' }}>
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full  group-hover:scale-105 transition-transform duration-500"
                />
                {post.videoUrl && (
                  <div className="absolute inset-0">
                    <video
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                      poster={post.imageUrl}
                    >
                      <source src={post.videoUrl} type="video/mp4" />
                    </video>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2 sm:space-y-3 px-1 sm:px-0">
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-wrap">
                  <Badge variant="outline" className="rounded-full sm:rounded-none border-gray-300 text-gray-600 text-xs px-2 py-0.5">
                    {post.category}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="hidden sm:inline">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="sm:hidden">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg md:text-xl font-medium text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 leading-tight">
                  {post.title}
                </h3>

                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between pt-1 sm:pt-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-[100px] sm:max-w-none">{post.author}</span>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{post.readTime}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center mt-6 sm:mt-8 md:mt-10 px-4">
        <Link href="/blog">
          <Button className="font-poppins bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 rounded-full text-xs sm:text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto max-w-xs sm:max-w-none">
            <span>View All Articles</span>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </Link>
      </div>
    </>
  );
}