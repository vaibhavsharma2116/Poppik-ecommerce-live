import { useState, useEffect } from "react";
import React from "react";
import { ChevronLeft, ChevronRight, Play, X, ShoppingCart, Plus, Minus, Check, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoTestimonial {
  id: number;
  customerImage: string;
  videoUrl: string;
  thumbnailUrl: string;
  productId: number;
  isActive: boolean;
  sortOrder: number;
}

interface Shade {
  id: number;
  name: string;
  colorCode: string;
  imageUrl?: string;
  isActive: boolean;
}

export default function VideoTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<VideoTestimonial | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const { toast } = useToast();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Manual refresh trigger for video testimonials
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());
  const { data: videoTestimonials = [], isLoading: testimonialsLoading } = useQuery<VideoTestimonial[]>({
    queryKey: ["/api/video-testimonials", refreshTrigger],
    queryFn: async () => {
      const response = await fetch(`/api/video-testimonials`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Optional: useEffect to refresh every 30 seconds (safe, not infinite)
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(Date.now());
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch all products to match with testimonials
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter active testimonials (assuming API returns only active or filtering is done server-side)
  // If filtering is needed client-side, uncomment and adjust the line below
  // const activeTestimonials = Array.isArray(videoTestimonials) ? videoTestimonials.filter(t => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const activeTestimonials = Array.isArray(videoTestimonials) ? videoTestimonials : [];

  // Shade drawer state for UGC videos (moved here so hooks run before any early returns)
  const [isShadeDrawerOpen, setIsShadeDrawerOpen] = useState(false);
  const [productShades, setProductShades] = useState<Shade[]>([]);
  const [selectedShades, setSelectedShades] = useState<Shade[]>([]);
  const [shadeQuantity, setShadeQuantity] = useState(1);
  const [currentProductForShades, setCurrentProductForShades] = useState<Product | null>(null);
  // Cache shades per product to avoid refetching and to show conditional buttons
  const [shadesCache, setShadesCache] = useState<Record<number, Shade[]>>({});

  // Prefetch shades for testimonial products so we can render correct button (Add vs Select Shades)
  useEffect(() => {
    const ids = Array.from(new Set(activeTestimonials.map(t => t.productId)));
    ids.forEach(async (id) => {
      if (shadesCache[id] !== undefined) return; // already fetched
      try {
        const res = await fetch(`/api/products/${id}/shades`);
        if (!res.ok) {
          setShadesCache(prev => ({ ...prev, [id]: [] }));
        } else {
          const shades = await res.json();
          const filtered = Array.isArray(shades)
            ? shades.filter((s: any) => s.productIds && Array.isArray(s.productIds) && s.productIds.includes(id))
            : [];
          setShadesCache(prev => ({ ...prev, [id]: filtered }));
        }
      } catch (err) {
        setShadesCache(prev => ({ ...prev, [id]: [] }));
      }
    });
  }, [activeTestimonials]);

  // Auto-slide effect - pause when modal is open
  useEffect(() => {
    if (activeTestimonials.length === 0 || isVideoModalOpen) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 3000); // Auto-slide every 3 seconds

    return () => clearInterval(interval);
  }, [currentIndex, activeTestimonials.length, isVideoModalOpen]);

  const nextSlide = () => {
    if (activeTestimonials.length > 0) {
      const newIndex = (currentIndex + 1) % activeTestimonials.length;
      setCurrentIndex(newIndex);
      
      // Smooth scroll to the next video
      if (scrollContainerRef.current) {
        // Assuming card width + gap is roughly 304px (280px card + 24px gap)
        scrollContainerRef.current.scrollTo({
          left: newIndex * 304, 
          behavior: 'smooth'
        });
      }
    }
  };

  const prevSlide = () => {
    if (activeTestimonials.length > 0) {
      const newIndex = (currentIndex - 1 + activeTestimonials.length) % activeTestimonials.length;
      setCurrentIndex(newIndex);
      
      // Smooth scroll to the previous video
      if (scrollContainerRef.current) {
        // Assuming card width + gap is roughly 304px
        scrollContainerRef.current.scrollTo({
          left: newIndex * 304,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleVideoClick = (testimonial: VideoTestimonial) => {
    setSelectedVideo(testimonial);
    setIsVideoModalOpen(true);
  };

  const addToCart = (product: Product) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((cartItem: any) => cartItem.id === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
      toast({
        title: "Cart Updated",
        description: `${product.name} quantity increased to ${existingItem.quantity}`,
      });
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: `₹${product.price}`,
        originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
        image: product.imageUrl,
        quantity: 1,
        inStock: true,
        cashbackPercentage: product.cashbackPercentage ? parseFloat(String(product.cashbackPercentage)) : undefined,
        cashbackPrice: product.cashbackPrice ? parseFloat(String(product.cashbackPrice)) : undefined,
      });
      toast({
        title: "Added to Cart",
        description: `${product.name} has been successfully added to your cart`,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartCount", cart.reduce((total: number, item: any) => total + item.quantity, 0).toString());
    window.dispatchEvent(new Event("cartUpdated"));
  };

  

  

  // Open shade drawer for a product (fetch shades and open drawer)
  const openShadeDrawer = async (product: Product, preloadedShades?: Shade[]) => {
    setCurrentProductForShades(product);
    setSelectedShades([]);
    setShadeQuantity(1);
    if (preloadedShades) {
      setProductShades(preloadedShades);
    } else {
      try {
        const response = await fetch(`/api/products/${product.id}/shades`);
        if (!response.ok) {
          setProductShades([]);
        } else {
          const shades = await response.json();
          const filtered = Array.isArray(shades)
            ? shades.filter((s: any) => s.productIds && Array.isArray(s.productIds) && s.productIds.includes(product.id))
            : [];
          setProductShades(filtered);
          // cache result
          setShadesCache(prev => ({ ...prev, [product.id]: filtered }));
        }
      } catch (err) {
        setProductShades([]);
      }
    }
    setIsShadeDrawerOpen(true);
  };

  // Add to cart from shade drawer
  const addToCartFromDrawer = () => {
    const product = currentProductForShades;
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    if (productShades.length > 0 && selectedShades.length > 0) {
      selectedShades.forEach((shade) => {
        const itemKey = `${product.id}-${shade.id}`;
        const existingItem = cart.find((cartItem: any) => cartItem.itemKey === itemKey);
        if (existingItem) {
          existingItem.quantity += shadeQuantity;
        } else {
          cart.push({
            id: product.id,
            itemKey,
            name: product.name,
            price: `₹${product.price}`,
            originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
            image: shade.imageUrl || product.imageUrl,
            quantity: shadeQuantity,
            inStock: true,
            selectedShade: {
              id: shade.id,
              name: shade.name,
              colorCode: shade.colorCode,
              imageUrl: shade.imageUrl,
            },
            cashbackPercentage: product.cashbackPercentage ? parseFloat(String(product.cashbackPercentage)) : undefined,
            cashbackPrice: product.cashbackPrice ? parseFloat(String(product.cashbackPrice)) : undefined,
          });
        }
      });
    } else {
      const itemKey = `${product.id}`;
      const existingItem = cart.find((cartItem: any) => cartItem.itemKey === itemKey);
      if (existingItem) {
        existingItem.quantity += shadeQuantity;
      } else {
        cart.push({
          id: product.id,
          itemKey,
          name: product.name,
          price: `₹${product.price}`,
          originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
          image: product.imageUrl,
          quantity: shadeQuantity,
          inStock: true,
          selectedShade: null,
          cashbackPercentage: product.cashbackPercentage ? parseFloat(String(product.cashbackPercentage)) : undefined,
          cashbackPrice: product.cashbackPrice ? parseFloat(String(product.cashbackPrice)) : undefined,
        });
      }
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartCount", cart.reduce((total: number, item: any) => total + item.quantity, 0).toString());
    window.dispatchEvent(new Event("cartUpdated"));
    toast({ title: "Added to Cart", description: `${product.name} added to cart` });
    setIsShadeDrawerOpen(false);
    setCurrentProductForShades(null);
  };

  if (testimonialsLoading || productsLoading) {
    return (
      <section className="py-16 bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Skeleton className="h-12 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (activeTestimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-4 sm:py-4 md:py-4 bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-12xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4 px-4">
            <span className="text-transparent bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text">
              What Our Customers Say
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium px-4">Real reviews from real customers</p>
        </div>

        <div className="relative">
          {/* Navigation Buttons - Hidden on mobile, visible on tablet+ */}
          <button
            onClick={prevSlide}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 lg:p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50 -ml-2 lg:-ml-4"
            aria-label="Previous testimonials"
          >
            <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6 text-gray-800" />
          </button>

          <button
            onClick={nextSlide}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 lg:p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50 -mr-2 lg:-mr-4"
            aria-label="Next testimonials"
          >
            <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6 text-gray-800" />
          </button>

          {/* Horizontal Scrollable Testimonials - Instagram Reel Style */}
          <div className="relative overflow-hidden px-4 md:px-0">
            <div 
              ref={scrollContainerRef}
              className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-4 px-4 md:mx-0 md:px-0"
            >
              {activeTestimonials.map((testimonial) => {
                const product = allProducts?.find(p => p.id === testimonial.productId);
                return (
                  <div key={testimonial.id} className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] lg:w-[280px]">
                    <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-none">
                      {/* Video Section with Reel-like aspect ratio */}
                      <div
                        className="relative bg-gray-100 cursor-pointer"
                        style={{ aspectRatio: '9/16' }}
                        onClick={() => handleVideoClick(testimonial)}
                      >
                        <video
                          src={testimonial.videoUrl}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                          muted
                          loop
                          poster={testimonial.thumbnailUrl}
                        />

                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300">
                          <div className="bg-white rounded-full p-2 sm:p-3 opacity-0 group-hover:opacity-90 transform scale-75 group-hover:scale-100 transition-all duration-300">
                            <Play className="w-4 h-4 sm:w-6 sm:h-6 text-pink-600 fill-pink-600" />
                          </div>
                        </div>

                        {/* Product Image Overlay - Bottom Left */}
                        {product && (
                          <div className="absolute bottom-2 left-2 bg-white rounded-md p-1 sm:p-1.5 shadow-lg">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain rounded"
                            />
                          </div>
                        )}
                      </div>

                      {/* Product Info - Compact */}
                      <div className="p-2 sm:p-3 bg-white">
                        {product ? (
                          <>
                            <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-1 line-clamp-2 leading-tight min-h-[2rem]">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-1 mb-2">
                              <p className="text-sm sm:text-base font-bold text-pink-600">
                                ₹{product.price}
                              </p>
                              {product.originalPrice && (
                                <p className="text-xs text-gray-500 line-through">
                                  ₹{product.originalPrice}
                                </p>
                              )}
                            </div>
                            {(() => {
                              const cached = shadesCache[product.id];
                              const hasShades = Array.isArray(cached) ? cached.length > 0 : undefined;
                              if (hasShades === undefined) {
                                // still loading cache - show lightweight button that opens drawer (safe)
                                return (
                                  <Button
                                    onClick={() => openShadeDrawer(product)}
                                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs py-1.5 flex items-center justify-center gap-1"
                                  >
                                    <ShoppingCart className="h-3 w-3" />
                                    Select Shades
                                  </Button>
                                );
                              }

                              if (hasShades) {
                                return (
                                  <Button
                                    onClick={() => openShadeDrawer(product, shadesCache[product.id])}
                                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs py-1.5 flex items-center justify-center gap-1"
                                  >
                                    <ShoppingCart className="h-3 w-3" />
                                    Select Shades
                                  </Button>
                                );
                              }

                              // no shades -> add directly
                              return (
                                <Button
                                  onClick={() => addToCart(product)}
                                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs py-1.5 flex items-center justify-center gap-1"
                                >
                                  <ShoppingCart className="h-3 w-3" />
                                  ADD
                                </Button>
                              );
                            })()}
                          </>
                        ) : (
                          <>
                            <h3 className="font-semibold text-xs text-gray-900 mb-1 line-clamp-2">
                              Product Loading...
                            </h3>
                            <Button
                              className="w-full bg-gray-300 text-gray-500 cursor-not-allowed text-xs py-1.5"
                              disabled
                            >
                              Loading...
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Shade Selection Drawer for UGC video products */}
      <Sheet open={isShadeDrawerOpen} onOpenChange={setIsShadeDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle className="text-xl font-bold">{currentProductForShades?.name}</SheetTitle>
            <SheetDescription>
              Select shade and quantity
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-6">
            <div className="relative bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg overflow-hidden aspect-square">
              <img
                src={currentProductForShades?.imageUrl}
                alt={currentProductForShades?.name || ''}
                className="w-full h-full object-contain"
                loading="lazy"
              />
              {selectedShades.length > 0 && (
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
                  <span className="text-xs font-semibold text-purple-600">
                    {selectedShades.length} shade{selectedShades.length > 1 ? 's' : ''} selected
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ₹{currentProductForShades ? Number(currentProductForShades.price).toLocaleString() : '0'}
                </span>
              </div>
              {selectedShades.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm text-gray-600">Selected Shades:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedShades.map(shade => (
                      <div key={shade.id} className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-purple-200">
                        <div 
                          className="w-3 h-3 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: shade.colorCode }}
                        />
                        <span className="text-xs font-medium text-purple-700">{shade.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Select Shades:</h3>
                {selectedShades.length > 0 && (
                  <button
                    onClick={() => setSelectedShades([])}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {productShades.length > 0 ? (
                  productShades.map((shade) => {
                    const isSelected = selectedShades.some(s => s.id === shade.id);
                    const hasSelection = selectedShades.length > 0;
                    return (
                      <div
                        key={shade.id}
                        onClick={() => {
                          if (isSelected) setSelectedShades(selectedShades.filter(s => s.id !== shade.id));
                          else setSelectedShades([...selectedShades, shade]);
                        }}
                        className={`cursor-pointer group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${isSelected ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md scale-105' : 'border-purple-300 hover:border-purple-400'}`}
                      >
                        {shade.imageUrl ? (
                          <div className="relative">
                            <img src={shade.imageUrl} alt={shade.name} className={`w-12 h-12 rounded-full object-cover border-2 shadow-md ${isSelected ? 'border-purple-500' : 'border-gray-300'}`} />
                            {isSelected && <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-pulse" />}
                          </div>
                        ) : (
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-full border-2 shadow-md ${isSelected ? 'border-purple-500 scale-110' : 'border-gray-300'}`} style={{ backgroundColor: shade.colorCode }} />
                            {isSelected && <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse" />}
                          </div>
                        )}
                        <span className={`text-xs text-center font-medium ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>{shade.name}</span>
                        {hasSelection && (
                          <div
                            className={`absolute -top-1 -right-1 rounded-full p-1 shadow-lg transition-colors ${isSelected
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                              : 'bg-white border border-purple-300'
                              }`}
                          >
                            {isSelected ? (
                              <Check className="w-3 h-3 text-white" />
                            ) : (
                              <Circle className="w-3 h-3 text-gray-300" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-4 text-sm text-gray-500">No shades available for this product.</div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Quantity:</h3>
              <div className="flex items-center justify-center gap-6 bg-gray-50 rounded-lg p-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShadeQuantity(Math.max(1, shadeQuantity - 1))}
                  disabled={shadeQuantity <= 1}
                  className="h-12 w-12 rounded-full border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-30 transition-all"
                >
                  <Minus className="h-5 w-5 text-purple-600" />
                </Button>
                <div className="text-center min-w-[4rem]">
                  <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{shadeQuantity}</span>
                  <p className="text-xs text-gray-500 mt-1">Items</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShadeQuantity(shadeQuantity + 1)}
                  className="h-12 w-12 rounded-full border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all"
                >
                  <Plus className="h-5 w-5 text-purple-600" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t-2 border-purple-100">
              <Button
                className={`w-full py-4 text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600`}
                onClick={addToCartFromDrawer}
                disabled={productShades.length > 0 && selectedShades.length === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {productShades.length > 0 ? `Add ${selectedShades.length} Shade${selectedShades.length > 1 ? 's' : ''} to Cart` : 'Add to Cart'}
              </Button>

              {productShades.length > 0 && selectedShades.length === 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-medium">Please select at least one shade to continue</span>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Video Popup Modal - Instagram Reel Style */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="p-0 max-w-none w-auto h-auto bg-black/95 border-none shadow-2xl overflow-hidden">
          {/* Close Button - Outside video container */}
          <button
            onClick={() => setIsVideoModalOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all"
            aria-label="Close video"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Reel-style Video Container */}
          <div className="relative bg-black rounded-lg overflow-hidden mx-auto" style={{ width: '340px', height: '550px' }}>
            {selectedVideo && (
              <>
                {/* Video Player */}
                <video
                  src={selectedVideo.videoUrl}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  playsInline
                  poster={selectedVideo.thumbnailUrl}
                />

                {/* Bottom Overlay - Product Info - Inside Video Container */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-6 pointer-events-none">
                  {(() => {
                    const product = allProducts?.find(p => p.id === selectedVideo.productId);
                    return product ? (
                      <div className="flex items-end gap-3 pointer-events-auto">
                        {/* Product Image */}
                        <div className="flex-shrink-0 bg-white rounded-lg p-2 shadow-lg">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-16 h-16 object-contain"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 text-white">
                          <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-lg font-bold">₹{product.price}</p>
                            {product.originalPrice && (
                              <p className="text-sm text-gray-300 line-through">₹{product.originalPrice}</p>
                            )}
                          </div>
                          {(() => {
                            const cached = shadesCache[product.id];
                            const hasShades = Array.isArray(cached) ? cached.length > 0 : undefined;
                            if (hasShades === undefined) {
                              return (
                                <Button
                                  onClick={() => {
                                    openShadeDrawer(product);
                                    setIsVideoModalOpen(false);
                                  }}
                                  className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                  Select Shades
                                </Button>
                              );
                            }

                            if (hasShades) {
                              return (
                                <Button
                                  onClick={() => {
                                    openShadeDrawer(product, shadesCache[product.id]);
                                    setIsVideoModalOpen(false);
                                  }}
                                  className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                  Select Shades
                                </Button>
                              );
                            }

                            // no shades -> add directly and close modal
                            return (
                              <Button
                                onClick={() => {
                                  addToCart(product);
                                  setIsVideoModalOpen(false);
                                }}
                                className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                ADD TO CART
                              </Button>
                            );
                          })()}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}