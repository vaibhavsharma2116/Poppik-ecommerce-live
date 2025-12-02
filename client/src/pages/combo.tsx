import { useState } from "react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, Star, Loader2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface ComboProduct {
  id: number;
  name: string;
  description: string;
  price: string | number;
  originalPrice: string | number;
  discount: string;
  imageUrl: string;
  images?: string[];
  products: string[] | string;
  rating: string | number;
  reviewCount: number;
  cashbackPercentage?: number; // Added for cashback
  cashbackPrice?: number;      // Added for cashback
}

export default function ComboPage() {
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState<Set<number>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Load wishlist from localStorage on mount
  React.useEffect(() => {
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

  const { data: comboProducts = [], isLoading } = useQuery<ComboProduct[]>({
    queryKey: ["/api/combos"],
  });


 const { data: comboSliders = [], isLoading: slidersLoading, refetch } = useQuery<[]>({
    queryKey: ['/api/admin/combo-sliders'],
    queryFn: async () => {
      const timestamp = Date.now();
      const res = await fetch(`/api/admin/combo-sliders?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch sliders');
      const data = await res.json();
      console.log('✅ Combo sliders fetched (fresh data):', data.length);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const handleAddToCart = (combo: ComboProduct) => {

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((cartItem: any) => cartItem.id === combo.id);
console.log("VCVVVVVV",combo)
    // Parse prices to ensure they are numbers for calculations
    const price = typeof combo.price === 'string' ? parseFloat(combo.price.replace(/[^0-9.-]+/g,"")) : combo.price;
    const originalPrice = typeof combo.originalPrice === 'string' ? parseFloat(combo.originalPrice.replace(/[^0-9.-]+/g,"")) : combo.originalPrice;


    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      // Create cart item without productId field for combos
      const cartItem = {
        id: combo.id,
        name: combo.name,
        price: `₹${price}`,
        originalPrice: combo.originalPrice ? `₹${originalPrice}` : undefined,
        image: combo.imageUrl,
        quantity: 1,
        inStock: true,
        isCombo: true,
        cashbackPercentage: combo.cashbackPercentage,
        cashbackPrice: combo.cashbackPrice,
        // Explicitly set product-related fields
        productName: combo.name,
        productImage: combo.imageUrl,
      };
      cart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartCount", cart.reduce((total: number, item: any) => total + item.quantity, 0).toString());
    window.dispatchEvent(new Event("cartUpdated"));

    toast({
      title: "Added to Cart",
      description: `${combo.name} has been added to your cart.`,
    });
  };

  const handleToggleWishlist = (combo: ComboProduct) => {
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
      const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      const existingIndex = wishlist.findIndex((item: any) => item.id === combo.id && item.isCombo);

      if (existingIndex >= 0) {
        wishlist.splice(existingIndex, 1);
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
          inStock: true,
          category: 'combo',
          rating: combo.rating.toString(),
          isCombo: true,
        };
        wishlist.push(wishlistItem);
        setWishlist(prev => new Set([...prev, combo.id]));
        toast({
          title: "Added to Wishlist",
          description: `${combo.name} has been added to your wishlist`,
        });
      }

      localStorage.setItem("wishlist", JSON.stringify(wishlist));
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-pink-600" />
      </div>
    );
  }

  const ComboSliderComponent = () => {
    const [api, setApi] = React.useState<any>();
    const [current, setCurrent] = React.useState(0);
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
      if (!api) return;

      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);

      api.on("select", () => {
        setCurrent(api.selectedScrollSnap() + 1);
      });
    }, [api]);

    // Auto-play functionality
    React.useEffect(() => {
      if (!api) return;

      const autoplayInterval = setInterval(() => {
        if (api.canScrollNext()) {
          api.scrollNext();
        } else {
          api.scrollTo(0);
        }
      }, 5000); // Change slide every 5 seconds

      return () => clearInterval(autoplayInterval);
    }, [api]);

    if (slidersLoading || comboSliders.length === 0) return null;

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
          <CarouselContent>
            {comboSliders.map((slide: any) => (
              <CarouselItem key={slide.id}>
                <div className="relative overflow-hidden rounded-lg sm:rounded-xl">
                  <img
                    src={slide.imageUrl}
                    alt={slide.title || 'Combo Banner'}
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
          <CarouselPrevious className="left-2 sm:left-4 bg-white/80 hover:bg-white shadow-lg border-2 border-gray-200" />
          <CarouselNext className="right-2 sm:right-4 bg-white/80 hover:bg-white shadow-lg border-2 border-gray-200" />

          {count > 1 && (
            <div className="absolute bottom-4 right-4 z-20 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
              {current} / {count}
            </div>
          )}
        </Carousel>
      </div>
    );
  };

  return (
    <div className="">
      <div className="">
        {/* Slider */}
        <ComboSliderComponent />

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Glow & Harmony Combo
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 px-4">
            Save more with our curated beauty bundles
          </p>
        </div>

        {/* Combo Products Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
          {comboProducts.map((combo) => {
            const products = typeof combo.products === 'string' ? JSON.parse(combo.products) : combo.products;
            const price = typeof combo.price === 'string' ? parseFloat(combo.price.replace(/[^0-9.-]+/g,"")) : combo.price;
            const originalPrice = typeof combo.originalPrice === 'string' ? parseFloat(combo.originalPrice.replace(/[^0-9.-]+/g,"")) : combo.originalPrice;
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
                      handleToggleWishlist(combo);
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
                    onClick={() => handleAddToCart(combo)}
                  >
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Add to </span>Cart
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="mt-6 sm:mt-8 md:mt-10 lg:mt-12 xl:mt-16 bg-white/70 backdrop-blur-md rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 lg:p-8 shadow-lg sm:shadow-xl border border-white/20">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent px-2">
            Why Choose Our Combos?
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 transition-all duration-300 hover:shadow-md">
              <div className="w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-2.5 md:mb-3 lg:mb-4 shadow-md">
                <span className="text-xl xs:text-2xl sm:text-2xl md:text-3xl">💰</span>
              </div>
              <h3 className="font-bold text-sm xs:text-base sm:text-base md:text-lg mb-1 sm:mb-1.5 md:mb-2 text-gray-800">Save More</h3>
              <p className="text-xs xs:text-sm sm:text-sm md:text-base text-gray-600 px-2">Get up to 45% off on combo packs</p>
            </div>
            <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 transition-all duration-300 hover:shadow-md">
              <div className="w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-2.5 md:mb-3 lg:mb-4 shadow-md">
                <span className="text-xl xs:text-2xl sm:text-2xl md:text-3xl">✨</span>
              </div>
              <h3 className="font-bold text-sm xs:text-base sm:text-base md:text-lg mb-1 sm:mb-1.5 md:mb-2 text-gray-800">Curated Selection</h3>
              <p className="text-xs xs:text-sm sm:text-sm md:text-base text-gray-600 px-2">Expertly selected products that work together</p>
            </div>
            <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 transition-all duration-300 hover:shadow-md">
              <div className="w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-2.5 md:mb-3 lg:mb-4 shadow-md">
                <span className="text-xl xs:text-2xl sm:text-2xl md:text-3xl">🎁</span>
              </div>
              <h3 className="font-bold text-sm xs:text-base sm:text-base md:text-lg mb-1 sm:mb-1.5 md:mb-2 text-gray-800">Perfect Gifting</h3>
              <p className="text-xs xs:text-sm sm:text-sm md:text-base text-gray-600 px-2">Beautifully packaged for any occasion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}