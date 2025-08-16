import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Heart, ShoppingCart, Eye, ArrowRight, Sparkles, Zap, Shield, Truck } from "lucide-react";
import { Link } from "wouter";
import HeroBanner from "@/components/hero-banner";
import ProductCard from "@/components/product-card";
import Timer from "@/components/timer";
import { Filter } from "lucide-react";
import DynamicFilter from "@/components/dynamic-filter";
import type { Product, Category } from "@/lib/types";
import loUntitled_design from "@assets/Untitled_design.png";
// WhatsApp Integration Component
function WhatsAppButton() {
  const handleWhatsAppClick = () => {
    const phoneNumber = "+919867577565"; // Replace with your actual WhatsApp business number
    const message = "Hi! I'm interested in your beauty products. Can you help me?";
    const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleWhatsAppClick}
        className="text-white p-2 rounded-full "
        title="Chat with us on WhatsApp"
      >
        <img
          src={loUntitled_design}
          alt="Boss Babe"
          className="w-16 h-16 rounded-full object-cover"
          
         
        />
      </button>
    </div>
  );
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredAllProducts, setFilteredAllProducts] = useState<Product[]>([]);
  const [showAllProductsFilter, setShowAllProductsFilter] = useState(false);

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: bestsellerProducts, isLoading: bestsellersLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/bestsellers"],
  });

  const { data: featuredProducts, isLoading: featuredLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/featured"],
  });

  const { data: newLaunchProducts, isLoading: newLaunchLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/new-launches"],
  });

  const { data: allProducts, isLoading: allProductsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const categoryImages = {
    skincare: "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
    haircare: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
    makeup: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
    bodycare: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
  };

  const categoryGradients = {
    skincare: "from-pink-100 via-rose-50 to-pink-200",
    haircare: "from-blue-100 via-sky-50 to-blue-200", 
    makeup: "from-purple-100 via-violet-50 to-purple-200",
    bodycare: "from-green-100 via-emerald-50 to-green-200"
  };

  return (
    <div>
      {/* Hero Section */}
      <HeroBanner />

      {/* Timer Section */}
      <Timer 
        targetDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} // 7 days from now
        title="Flash Sale Ending Soon!"
        subtitle="Get your favorite beauty products at unbeatable prices"
      />

      {/* Enhanced Categories Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 via-white to-gray-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_var(--tw-gradient-stops))] from-purple-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-full mb-8 shadow-sm">
              <span className="text-sm font-semibold text-transparent bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text">
                ✨ Premium Beauty Collection
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-8 tracking-tight">
              <span className="text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text">
                Shop by Category
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-light">
              Discover our complete range of beauty and wellness products crafted with premium ingredients 
              and designed for your unique beauty journey
            </p>
            <div className="mt-8 w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto rounded-full"></div>
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
                      animation: 'fadeInUp 0.6s ease-out forwards'
                    }}
                  >
                    <div className="aspect-square overflow-hidden relative">
                      <div className={`relative h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br ${categoryGradients[category.slug as keyof typeof categoryGradients] || 'from-gray-100 to-gray-200'}`}>
                        {/* Decorative Elements - Hidden on mobile for cleaner look */}
                        <div className="hidden sm:block absolute top-3 sm:top-4 right-3 sm:right-4 w-4 sm:w-6 md:w-8 h-4 sm:h-6 md:h-8 bg-white/20 rounded-full blur-sm"></div>
                        <div className="hidden sm:block absolute bottom-3 sm:bottom-4 left-3 sm:left-4 w-3 sm:w-4 md:w-6 h-3 sm:h-4 md:h-6 bg-white/30 rounded-full blur-sm"></div>

                        <img
                          src={category.imageUrl || categoryImages[category.slug as keyof typeof categoryImages] || "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"}
                          alt={category.name}
                          className="w-full h-full object-cover rounded-xl sm:rounded-2xl group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-300 sm:duration-500 md:duration-700 shadow-md sm:shadow-lg md:shadow-xl"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent rounded-xl sm:rounded-2xl group-hover:from-black/5 transition-all duration-300 sm:duration-500"></div>

                        {/* Product count badge - Responsive sizing */}
                        <div className="absolute top-2 sm:top-3 md:top-4 lg:top-6 left-2 sm:left-3 md:left-4 lg:left-6 bg-white/90 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full shadow-sm sm:shadow-md md:shadow-lg">
                          <span className="text-xs sm:text-xs md:text-sm font-semibold text-gray-700">{category.productCount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative">
                      <h3 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 md:mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300 line-clamp-1">
                        {category.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 group-hover:text-gray-600 transition-colors mb-2 sm:mb-3 md:mb-4 line-clamp-1">
                        {category.productCount} products
                      </p>
                      <div className="hidden sm:flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-700">Shop Now</span>
                        <svg className="w-3 sm:w-4 h-3 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Enhanced Products Section */}
          <div className="space-y-12">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-full mb-6">
                <span className="text-sm font-semibold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
                  🌟 Curated Collection
                </span>
              </div>
              <h3 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text">
                  Our Products
                </span>
              </h3>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-light mb-8">
                Handpicked beauty essentials crafted with love and designed for your daily routine
              </p>
              {!allProductsLoading && allProducts && allProducts.length > 12 && (
                <Link href="/category/all">
                  <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-3">
                    <span>Explore All {allProducts.length} Products</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Button>
                </Link>
              )}
            </div>

            {/* Products Grid - 4 products per row */}
            {allProductsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden bg-white shadow-sm">
                    <Skeleton className="h-72 w-full" />
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-6 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Mobile-first Grid Layout */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
                  {allProducts?.slice(0, 8).map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      className="mobile-product-card shadow-sm hover:shadow-md transition-all duration-300" 
                    />
                  ))}
                </div>

                {/* View More Button */}
                {!allProductsLoading && allProducts && allProducts.length > 10 && (
                  <div className="text-center mt-12">
                    <Link href="/products">
                      <Button className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-black text-white hover:bg-gray-800 px-10 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                        View All Products ({allProducts.length})
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
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

      {/* Featured Products Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-white to-pink-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,_var(--tw-gradient-stops))] from-purple-500 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,_var(--tw-gradient-stops))] from-pink-500 via-transparent to-transparent"></div>
        </div>

        <div className=" mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-full mb-8 shadow-sm">
              <span className="text-sm font-semibold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
                ⭐ Featured Products
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-transparent bg-gradient-to-r from-purple-700 via-pink-600 to-purple-700 bg-clip-text">
                Featured Collection
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-light mb-8">
              Our featured products, carefully selected for their exceptional quality and popularity
            </p>
            <Link href="/products?filter=featured">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2">
                <span>View All Featured ({featuredProducts?.length || 0})</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </Link>
          </div>

          {featuredLoading ? (
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
          ) : featuredProducts && featuredProducts.length > 0 ? (
            <>
              {/* Mobile-first Grid Layout for Featured Products */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
                {featuredProducts.slice(0, 8).map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    className="mobile-product-card shadow-sm hover:shadow-md transition-all duration-300"
                  />
                ))}
              </div>

              {/* View All Button */}
              {featuredProducts.length > 8 && (
                <div className="text-center mt-10">
                  <Link href="/products?filter=featured">
                    <Button className="btn-primary px-8 py-3 rounded-full">
                      View All Featured Products ({featuredProducts.length})
                    </Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No featured products available at the moment.</p>
              <p className="text-gray-400 text-sm mt-2">Check back soon for new featured items!</p>
            </div>
          )}
        </div>
      </section>

      {/* New Launch Products Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,_var(--tw-gradient-stops))] from-teal-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-full mb-8 shadow-sm animate-pulse">
              <span className="text-sm font-semibold text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text">
                🚀 Fresh & New
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-transparent bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-700 bg-clip-text">
                New Launches
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-light mb-8">
              Discover our latest innovations - cutting-edge formulas and revolutionary beauty solutions
            </p>
            <Link href="/products?filter=newLaunch">
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2">
                <span>Explore New Launches</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </Link>
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
              {/* Mobile-first Grid Layout for New Launch Products */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
                {allProducts?.filter(product => product.newLaunch).slice(0, 4).map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    className="mobile-product-card shadow-sm hover:shadow-md transition-all duration-300 relative"
                  />
                ))}
              </div>



              {/* Show message if no new launch products */}
              {allProducts?.filter(product => product.newLaunch).length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">New Products Coming Soon!</h3>
                  <p className="text-gray-600 mb-6">We're working on exciting new launches. Stay tuned!</p>
                  <Link href="/products">
                    <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      Browse All Products
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Bestsellers Section */}
      <section className="py-20 bg-gradient-to-br from-amber-50 via-white to-yellow-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent"></div>
        </div>

        <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-full mb-8 shadow-sm">
              <span className="text-sm font-semibold text-transparent bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text">
                🏆 Customer Favorites
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-transparent bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 bg-clip-text">
                Bestsellers
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-light mb-8">
              Our most loved products by customers - tried, tested, and trusted by thousands
            </p>
            <Link href="/products?filter=bestseller">
              <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2">
                <span>View All Bestsellers ({bestsellerProducts?.length || 0})</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </Link>
          </div>

          {bestsellersLoading ? (
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
          ) : bestsellerProducts && bestsellerProducts.length > 0 ? (
            <>
              {/* Mobile-first Grid Layout for Bestsellers */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
                {bestsellerProducts.slice(0, 8).map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    className="mobile-product-card shadow-sm hover:shadow-md transition-all duration-300"
                  />
                ))}
              </div>

              {/* View All Button */}
              {bestsellerProducts.length > 8 && (
                <div className="text-center mt-10">
                  <Link href="/products?filter=bestseller">
                    <Button className="btn-primary px-8 py-3 rounded-full">
                      View All Bestsellers ({bestsellerProducts.length})
                    </Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No bestseller products available at the moment.</p>
              <p className="text-gray-400 text-sm mt-2">Check back soon for our top-rated products!</p>
            </div>
          )}
        </div>
      </section>

  
      {/* WhatsApp Floating Button */}
      <WhatsAppButton />
    </div>
  );
}