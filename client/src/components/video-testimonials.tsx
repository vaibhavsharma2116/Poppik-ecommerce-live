import { useState } from "react";
import { ChevronLeft, ChevronRight, Play, X, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

export default function VideoTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoTestimonial | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch UGC Video from API
  const { data: videoTestimonials = [], isLoading: testimonialsLoading } = useQuery<VideoTestimonial[]>({
    queryKey: ["/api/video-testimonials"],
  });

  // Fetch all products to match with testimonials
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter active testimonials and sort by sortOrder
  const activeTestimonials = videoTestimonials
    .filter(t => t.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const nextSlide = () => {
    if (activeTestimonials.length > 0) {
      const newIndex = (currentIndex + 1) % activeTestimonials.length;
      setCurrentIndex(newIndex);
      if (autoplayEnabled) {
        setIsPlaying(activeTestimonials[newIndex].id);
      } else {
        setIsPlaying(null);
      }
    }
  };

  const prevSlide = () => {
    if (activeTestimonials.length > 0) {
      const newIndex = (currentIndex - 1 + activeTestimonials.length) % activeTestimonials.length;
      setCurrentIndex(newIndex);
      if (autoplayEnabled) {
        setIsPlaying(activeTestimonials[newIndex].id);
      } else {
        setIsPlaying(null);
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
        inStock: true
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

  const getVisibleTestimonials = () => {
    const visible = [];
    const displayCount = Math.min(4, activeTestimonials.length);

    for (let i = 0; i < displayCount; i++) {
      const index = (currentIndex + i) % activeTestimonials.length;
      const testimonial = activeTestimonials[index];
      const product = allProducts?.find(p => p.id === testimonial.productId);
      visible.push({ ...testimonial, product });
    }
    return visible;
  };

  const visibleTestimonials = getVisibleTestimonials();

  // Autoplay all visible videos when component mounts or slides change
  useState(() => {
    if (autoplayEnabled && visibleTestimonials.length > 0) {
      // Set all visible video IDs to play
      visibleTestimonials.forEach((testimonial) => {
        setIsPlaying(testimonial.id);
      });
    }
  });

  if (testimonialsLoading || productsLoading) {
    return (
      <section className="py-16 bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
    <section className="py-12 sm:py-14 md:py-16 bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
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

          {/* Testimonials Grid - Responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 px-1 sm:px-0">
            {visibleTestimonials.map((testimonial) => (
              <Card key={testimonial.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300">
                {/* Video Section */}
                <div 
                  className="relative aspect-[3/4] bg-gray-100 cursor-pointer"
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
                    <div className="bg-white rounded-full p-3 opacity-0 group-hover:opacity-90 transform scale-75 group-hover:scale-100 transition-all duration-300">
                      <Play className="w-6 h-6 text-pink-600 fill-pink-600" />
                    </div>
                  </div>

                  {/* Product Image Overlay - Bottom Left */}
                  {testimonial.product && (
                    <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-2 sm:left-3 md:left-4 bg-white rounded-md sm:rounded-lg p-1.5 sm:p-2 shadow-lg">
                      <img
                        src={testimonial.product.imageUrl}
                        alt={testimonial.product.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 object-contain rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-2 sm:p-3 md:p-4 bg-white">
                  {testimonial.product ? (
                    <>
                      <h3 className="font-semibold text-xs sm:text-sm md:text-base text-gray-900 mb-1 sm:mb-1.5 line-clamp-2 leading-tight min-h-[2rem] sm:min-h-[2.5rem]">
                        {testimonial.product.name}
                      </h3>
                      <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                        <p className="text-sm sm:text-base md:text-lg font-bold text-pink-600">
                          ₹{testimonial.product.price}
                        </p>
                        {testimonial.product.originalPrice && (
                          <p className="text-xs sm:text-sm text-gray-500 line-through">
                            ₹{testimonial.product.originalPrice}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => addToCart(testimonial.product!)}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs sm:text-sm py-1.5 sm:py-2 flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        ADD TO CART
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-1 line-clamp-2">
                        Product Loading...
                      </h3>
                      <Button
                        className="w-full bg-gray-300 text-gray-500 cursor-not-allowed text-xs sm:text-sm py-1.5 sm:py-2"
                        disabled
                      >
                        Loading...
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Mobile Navigation Dots */}
          {/* <div className="flex md:hidden justify-center gap-2 mt-6">
            <button
              onClick={prevSlide}
              className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>
            <button
              onClick={nextSlide}
              className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-gray-800" />
            </button>
          </div> */}
        </div>
      </div>

      {/* Video Popup Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-md w-full p-0 bg-white border-0 overflow-hidden">
          {/* Close Button */}
          <button
            onClick={() => setIsVideoModalOpen(false)}
            className="absolute top-3 right-3 z-50 p-1.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
            aria-label="Close video"
          >
            <X className="w-5 h-5 text-gray-800" />
          </button>

          {/* Video Container */}
          <div className="relative w-full bg-black" style={{ aspectRatio: '9/16' }}>
            {selectedVideo && (
              <video
                src={selectedVideo.videoUrl}
                className="w-full h-full object-cover"
                controls
                autoPlay
                playsInline
                poster={selectedVideo.thumbnailUrl}
              />
            )}
          </div>

          {/* Product Info Below Video */}
          {selectedVideo && (
            <div className="p-4 bg-white border-t">
              {(() => {
                const product = allProducts?.find(p => p.id === selectedVideo.productId);
                return product ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{product.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-base font-bold text-pink-600">₹{product.price}</p>
                        {product.originalPrice && (
                          <p className="text-sm text-gray-500 line-through">₹{product.originalPrice}</p>
                        )}
                      </div>
                      <Button
                        onClick={() => {
                          addToCart(product);
                          setIsVideoModalOpen(false);
                        }}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm py-2 flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        ADD TO CART
                      </Button>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}