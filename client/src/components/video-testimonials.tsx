
import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const { toast } = useToast();

  // Fetch video testimonials from API
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
    <section className="py-16 bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="text-transparent bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text">
              What Our Customers Say
            </span>
          </h2>
          <p className="text-gray-600 text-lg font-medium">Real reviews from real customers</p>
        </div>

        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50 -ml-4"
            aria-label="Previous testimonials"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50 -mr-4"
            aria-label="Next testimonials"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleTestimonials.map((testimonial) => (
              <Card key={testimonial.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300">
                {/* Video Section */}
                <div className="relative aspect-[3/4] bg-gray-100">
                  <video
                    src={testimonial.videoUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                    loop
                    poster={testimonial.thumbnailUrl}
                  />

                  {/* Product Image Overlay - Bottom Left */}
                  {testimonial.product && (
                    <div className="absolute bottom-4 left-4 bg-white rounded-lg p-2 shadow-lg">
                      <img
                        src={testimonial.product.imageUrl}
                        alt={testimonial.product.name}
                        className="w-16 h-16 object-contain rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 bg-white">
                  {testimonial.product ? (
                    <>
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                        {testimonial.product.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-lg font-bold text-pink-600">
                          ₹{testimonial.product.price}
                        </p>
                        {testimonial.product.originalPrice && (
                          <p className="text-sm text-gray-500 line-through">
                            ₹{testimonial.product.originalPrice}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => addToCart(testimonial.product!)}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                      >
                        ADD TO CART
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                        Product Loading...
                      </h3>
                      <Button
                        className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
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
        </div>
      </div>
    </section>
  );
}
