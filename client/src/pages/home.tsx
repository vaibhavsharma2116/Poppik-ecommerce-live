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
  Calendar,
  User,
} from "lucide-react";
import { Link } from "wouter";
import HeroBanner from "@/components/hero-banner";
import ProductCard from "@/components/product-card";
import { Filter } from "lucide-react";
import DynamicFilter from "@/components/dynamic-filter";
import VideoTestimonials from "@/components/video-testimonials";
import type { Product, Category } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import OptimizedImage from "@/components/optimized-image"; // Assuming OptimizedImage is used
import AnnouncementBar from "@/components/announcement-bar";

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
      <section className="py-12 bg-gradient-to-br from-slate-50 via-white to-gray-50 relative overflow-hidden">
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
                  className="flex gap-4"
                  style={{
                    display: 'flex',
                    gap: 'clamp(8px, 2vw, 16px)',
                    paddingLeft: 'clamp(8px, 2vw, 16px)',
                    paddingRight: 'clamp(8px, 2vw, 16px)'
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
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-medium mb-3 sm:mb-4 text-left">
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

                <div className="text-center mt-6 sm:mt-8 md:mt-10">
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
      <section className="py-0 pb-16 sm:pb-20 md:pb-24 bg-gradient-to-br from-slate-50 via-white to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="space-y-8 sm:space-y-12">
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-medium mb-3 sm:mb-4 text-left">
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
                    <div className="text-center mt-6 sm:mt-8 md:mt-10">
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
      <section className="py-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-10">
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

              <div className="text-center mt-6 mb-4">
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

      {/* Blog Section */}
      <section className="py-8 sm:py-10 md:py-12 lg:py-16 bg-gradient-to-br from-slate-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
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

          <LatestBlogPosts />
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
  const { data: comboProducts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/combos"],
  });

  const activeComboProducts = comboProducts.filter(combo => combo.isActive).slice(0, 4);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium mb-2 sm:mb-4">
            <span className="text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
              Exclusive Combo Offers
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">
            Save more with our specially curated combo packs
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8 px-2 sm:px-0">
          {activeComboProducts.map((combo) => (
            <Link key={combo.id} href={`/combo/${combo.id}`}>
              <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="relative overflow-hidden">
                  <div className="aspect-square">
                    <img
                      src={combo.imageUrl}
                      alt={combo.name}
                      className="w-full h-full  group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  {combo.discount && (
                    <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                      {combo.discount}
                    </Badge>
                  )}
                </div>
                <div className="p-3 sm:p-4 space-y-2">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2 group-hover:text-pink-600 transition-colors">
                    {combo.name}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-bold text-pink-600">
                      ₹{combo.price}
                    </span>
                    {combo.originalPrice && combo.originalPrice > combo.price && (
                      <span className="text-sm text-gray-500 line-through">
                        ₹{combo.originalPrice}
                      </span>
                    )}
                  </div>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm py-2">
                    View Combo
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-10">
          <Link href="/combos">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 sm:px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2">
              <span>View All Combos</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// Latest Blog Posts Component
function LatestBlogPosts() {
  const { data: blogPosts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/blog/posts"],
  });

  const latestPosts = blogPosts
    .filter(post => post.published)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

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

  if (latestPosts.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8 px-4">
        <p className="text-sm sm:text-base text-gray-500">No blog posts available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-2 sm:px-0">
        {latestPosts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`}>
            <div className="group cursor-pointer">
              {/* Image - Same as blog page */}
              <div className="relative overflow-hidden bg-gray-100 mb-3 sm:mb-4 rounded-lg sm:rounded-none" style={{ paddingBottom: '66.67%' }}>
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                {post.videoUrl && (
                  <div className="absolute inset-0">
                    <video
                      className="w-full h-full"
                      controls
                      preload="metadata"
                      poster={post.imageUrl}
                    >
                      <source src={post.videoUrl} type="video/mp4" />
                    </video>
                  </div>
                )}
              </div>

              {/* Content - Same as blog page */}
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
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 rounded-full text-xs sm:text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto max-w-xs sm:max-w-none">
            <span>View All Articles</span>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </Link>
      </div>
    </>
  );
}