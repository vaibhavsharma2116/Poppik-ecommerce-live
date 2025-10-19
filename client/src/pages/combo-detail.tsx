import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ChevronRight, Star, ShoppingCart, Heart, ArrowLeft, Share2, Package, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ComboDetail() {
  const [, params] = useRoute("/combo/:id");
  const comboId = params?.id || "";
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: "",
    comment: "",
    userName: "",
  });
  const { toast } = useToast();

  const { data: combo, isLoading, error } = useQuery<any>({
    queryKey: [`/api/combos/${comboId}`],
    enabled: !!comboId,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: [`/api/combos/${comboId}/reviews`],
    enabled: !!comboId,
  });

  console.log("Combo data:", combo);
  console.log("Loading:", isLoading);
  console.log("Error:", error);

  // Get all image URLs (from imageUrls array or fallback to imageUrl)
  const allImageUrls = combo?.imageUrls && combo.imageUrls.length > 0 
    ? combo.imageUrls 
    : combo?.imageUrl 
      ? [combo.imageUrl] 
      : [];

  // Declare rating early so it can be used in averageRating calculation
  const rating = combo ? (typeof combo.rating === 'string' ? parseFloat(combo.rating) : combo.rating) : 0;

  const toggleWishlist = () => {
    if (!combo) return;

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

    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    const existingIndex = wishlist.findIndex((item: any) => item.id === combo.id && item.isCombo);

    if (existingIndex >= 0) {
      wishlist.splice(existingIndex, 1);
      setIsInWishlist(false);
    } else {
      wishlist.push({
        id: combo.id,
        name: combo.name,
        price: `₹${combo.price}`,
        originalPrice: combo.originalPrice ? `₹${combo.originalPrice}` : undefined,
        image: combo.imageUrl,
        inStock: true,
        isCombo: true,
      });
      setIsInWishlist(true);
    }

    localStorage.setItem("wishlist", JSON.stringify(wishlist));
    window.dispatchEvent(new Event("wishlistUpdated"));
  };

  const addToCart = () => {
    if (!combo) return;

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((cartItem: any) => cartItem.id === combo.id && cartItem.isCombo);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: combo.id,
        name: combo.name,
        price: `₹${combo.price}`,
        originalPrice: combo.originalPrice ? `₹${combo.originalPrice}` : undefined,
        image: combo.imageUrl,
        quantity: 1,
        inStock: true,
        isCombo: true,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartCount", cart.reduce((total: number, item: any) => total + item.quantity, 0).toString());
    window.dispatchEvent(new Event("cartUpdated"));

    toast({
      title: "Added to Cart",
      description: `${combo.name} has been added to your cart.`,
    });
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out this combo: ${combo?.name}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast({
          title: "Link Copied",
          description: "Product link has been copied to clipboard",
        });
        setShowShareDialog(false);
        break;
    }
  };

  const handleSubmitReview = async () => {
    const user = localStorage.getItem("user");
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to write a review",
        variant: "destructive",
      });
      window.location.href = "/auth/login";
      return;
    }

    if (!newReview.title.trim() || !newReview.comment.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and comment for your review",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/combos/${comboId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newReview,
          userName: newReview.userName || JSON.parse(user).username || "Anonymous",
        }),
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Review Submitted",
          description: "Thank you for your feedback!",
        });
        setShowReviewDialog(false);
        setNewReview({ rating: 5, title: "", comment: "", userName: "" });
        window.location.reload();
      } else {
        throw new Error("Failed to submit review");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const calculateRatingDistribution = () => {
    if (!reviews || reviews.length === 0) {
      return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    }

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review: any) => {
      const rating = Math.floor(review.rating);
      if (rating >= 1 && rating <= 5) {
        distribution[rating as keyof typeof distribution]++;
      }
    });

    return distribution;
  };

  const averageRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : rating;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < Math.floor(rating) 
            ? "fill-yellow-400 text-yellow-400" 
            : "text-gray-300"
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-6 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-3xl" />
            <div className="space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!combo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Combo Not Found</h1>
            <p className="text-gray-600 mb-8">The combo you're looking for doesn't exist.</p>
            <Link href="/combos">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 rounded-xl font-semibold">
                ← Back to Combos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const price = typeof combo.price === 'string' ? parseFloat(combo.price) : combo.price;
  const originalPrice = typeof combo.originalPrice === 'string' ? parseFloat(combo.originalPrice) : combo.originalPrice;
  const discountPercentage = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const products = typeof combo.products === 'string' ? JSON.parse(combo.products) : combo.products;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-8 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/combos">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Combos
          </Button>
        </Link>

        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm mb-8 bg-white/60 backdrop-blur-md rounded-2xl px-6 py-4 shadow-lg border border-white/20">
          <Link href="/" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-purple-400" />
          <Link href="/combos" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
            Combos
          </Link>
          <ChevronRight className="h-4 w-4 text-purple-400" />
          <span className="text-gray-900 font-semibold">{combo.name}</span>
        </nav>

        {/* Combo Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Image Carousel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/20">
                <div className="space-y-4">
                  {/* Vertical Layout: Thumbnails on Left, Main Image on Right */}
                  <div className="flex gap-4">
                    {/* Thumbnail Column - Swipeable Vertical Carousel */}
                    {allImageUrls.length > 1 && (
                      <div className="w-20 flex-shrink-0 relative">
                        <div 
                          className="h-80 overflow-hidden scroll-smooth"
                          style={{ scrollBehavior: 'smooth' }}
                        >
                          <div 
                            id="thumbnail-container"
                            className="flex flex-col gap-3 h-full overflow-y-auto scrollbar-hide touch-pan-y"
                            style={{
                              scrollSnapType: 'y mandatory',
                              scrollBehavior: 'smooth',
                              WebkitOverflowScrolling: 'touch'
                            }}
                            onScroll={(e) => {
                              const container = e.currentTarget;
                              const scrollTop = container.scrollTop;
                              const scrollHeight = container.scrollHeight;
                              const clientHeight = container.clientHeight;
                              const itemHeight = 92;

                              const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;
                              let visibleIndex;
                              if (isAtBottom) {
                                visibleIndex = allImageUrls.length - 1;
                              } else {
                                visibleIndex = Math.round(scrollTop / itemHeight);
                              }

                              if (allImageUrls[visibleIndex] && visibleIndex !== currentImageIndex) {
                                setCurrentImageIndex(visibleIndex);
                              }
                            }}
                          >
                            {allImageUrls.map((imageUrl: string, index: number) => (
                              <button
                                key={`thumb-${index}`}
                                onClick={() => {
                                  setCurrentImageIndex(index);
                                  const container = document.getElementById('thumbnail-container');
                                  if (container) {
                                    const itemHeight = 92;
                                    container.scrollTo({
                                      top: index * itemHeight,
                                      behavior: 'smooth'
                                    });
                                  }
                                }}
                                className={`w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:border-purple-300 flex-shrink-0 relative ${
                                  currentImageIndex === index
                                    ? 'border-purple-500 ring-2 ring-purple-200 scale-105'
                                    : 'border-gray-200'
                                }`}
                                style={{ scrollSnapAlign: 'start' }}
                              >
                                <div className="w-full h-full flex items-center justify-center p-1 bg-white rounded-lg">
                                  <img
                                    src={imageUrl}
                                    alt={`${combo.name} view ${index + 1}`}
                                    className="w-full h-full hover:scale-110 transition-transform duration-200"
                                    style={{ 
                                      objectFit: 'contain',
                                      width: '100%',
                                      height: '100%',
                                      borderRadius: '6px'
                                    }}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80';
                                    }}
                                  />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Navigation Arrows */}
                        {allImageUrls.length > 3 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                const prevIndex = currentImageIndex <= 0 ? allImageUrls.length - 1 : currentImageIndex - 1;
                                setCurrentImageIndex(prevIndex);
                                const container = document.getElementById('thumbnail-container');
                                if (container) {
                                  if (currentImageIndex <= 0) {
                                    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                                  } else {
                                    container.scrollTo({ top: prevIndex * 92, behavior: 'smooth' });
                                  }
                                }
                              }}
                              className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 z-10 hover:bg-white cursor-pointer"
                            >
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                const nextIndex = currentImageIndex >= allImageUrls.length - 1 ? 0 : currentImageIndex + 1;
                                const container = document.getElementById('thumbnail-container');
                                if (container) {
                                  if (currentImageIndex >= combo.imageUrls.length - 1) {
                                    container.scrollTo({ top: 0, behavior: 'smooth' });
                                  } else if (nextIndex === combo.imageUrls.length - 1) {
                                    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                                  } else {
                                    container.scrollTo({ top: nextIndex * 92, behavior: 'smooth' });
                                  }
                                  setTimeout(() => setCurrentImageIndex(nextIndex), 100);
                                } else {
                                  setCurrentImageIndex(nextIndex);
                                }
                              }}
                              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 z-10 hover:bg-white cursor-pointer"
                            >
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </>
                        )}

                        {/* Scroll Indicator */}
                        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-1 h-16 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="w-full bg-purple-500 rounded-full transition-all duration-300"
                            style={{
                              height: `${Math.min(100, (3 / allImageUrls.length) * 100)}%`,
                              transform: `translateY(${(currentImageIndex / Math.max(1, allImageUrls.length - 3)) * (64 - Math.min(64, (3 / allImageUrls.length) * 64))}px)`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Main Image with Zoom */}
                    <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-lg relative group cursor-zoom-in" style={{ aspectRatio: '1/1', minHeight: '300px', height: '400px' }}>
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <img
                          src={allImageUrls.length > 0 ? allImageUrls[currentImageIndex] : 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600&q=80'}
                          alt={combo.name}
                          className="w-full h-full object-contain rounded-2xl group-hover:scale-110"
                          onClick={(e) => {
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4';
                            modal.onclick = () => modal.remove();

                            const img = document.createElement('img');
                            img.src = allImageUrls.length > 0 ? allImageUrls[currentImageIndex] : combo.imageUrl;
                            img.className = 'max-w-full max-h-full object-contain rounded-lg';
                            img.onclick = (e) => e.stopPropagation();

                            const closeBtn = document.createElement('button');
                            closeBtn.innerHTML = '×';
                            closeBtn.className = 'absolute top-4 right-4 text-white text-4xl font-bold hover:text-gray-300 transition-colors';
                            closeBtn.onclick = () => modal.remove();

                            modal.appendChild(img);
                            modal.appendChild(closeBtn);
                            document.body.appendChild(modal);
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600&q=80';
                          }}
                        />
                      </div>

                      {/* Zoom Hint */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to zoom
                      </div>
                    </div>
                  </div>

                  {/* Image Count Indicator */}
                  {allImageUrls.length > 1 && (
                    <div className="text-center text-sm text-gray-500">
                      {currentImageIndex + 1} of {allImageUrls.length} images
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                {combo.name}
              </h1>

              <p className="text-lg text-gray-600 mb-6">{combo.description}</p>

              {/* Rating */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex">
                  {renderStars(rating)}
                </div>
                <span className="text-xl font-bold text-gray-900">{rating}</span>
                <span className="text-base text-gray-600 font-medium">({combo.reviewCount.toLocaleString()} reviews)</span>
              </div>

              {/* Products Included */}
              {Array.isArray(products) && products.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Includes:</h3>
                  <div className="flex flex-wrap gap-2">
                    {products.map((product: any, index: number) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-sm px-3 py-1 border-2"
                      >
                        {typeof product === 'string' ? product : product.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center space-x-4 mb-8">
                <span className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  ₹{price.toLocaleString()}
                </span>
                {originalPrice > price && (
                  <>
                    <span className="text-2xl text-gray-500 line-through">
                      ₹{originalPrice.toLocaleString()}
                    </span>
                    <span className="text-lg font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
              </div>

              <p className="text-lg text-green-600 font-medium mb-6">
                You save ₹{(originalPrice - price).toLocaleString()}
              </p>

              {/* Actions */}
              <div className="flex space-x-4 mb-6">
                <Button 
                  size="lg" 
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200" 
                  onClick={addToCart}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-purple-200 hover:border-purple-400 rounded-xl p-4 transform hover:scale-105 transition-all duration-200" 
                  onClick={toggleWishlist}
                >
                  <Heart className={`w-6 h-6 ${isInWishlist ? "fill-red-600 text-red-600" : "text-purple-500"}`} />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-purple-200 hover:border-purple-400 rounded-xl p-4 transform hover:scale-105 transition-all duration-200" 
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share2 className="w-6 h-6 text-purple-500" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 mb-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="description" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
                Description
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
                Products Included
              </TabsTrigger>
              <TabsTrigger value="benefits" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
                Benefits
              </TabsTrigger>
              <TabsTrigger value="howto" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
                How to Use
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">📝</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Combo Description</h3>
              </div>
              <div className="text-gray-700 leading-relaxed text-lg">
                <p>{combo.detailedDescription || combo.description}</p>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">📦</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Products Included</h3>
              </div>
              <div className="space-y-3">
                {combo.productsIncluded ? (
                  <div className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                    {combo.productsIncluded}
                  </div>
                ) : Array.isArray(products) && products.length > 0 ? (
                  <ul className="space-y-3 text-gray-700 text-lg">
                    {products.map((product: any, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-purple-500 mr-3 mt-1">✓</span>
                        <span>{typeof product === 'string' ? product : product.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700 leading-relaxed text-lg">
                    This combo contains carefully selected premium beauty products.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="benefits" className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">✨</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Benefits</h3>
              </div>
              {combo.benefits ? (
                <div className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                  {combo.benefits}
                </div>
              ) : (
                <ul className="space-y-3 text-gray-700 text-lg">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Complete beauty routine in one combo</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Save ₹{(originalPrice - price).toLocaleString()} with this bundle</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Get {discountPercentage}% discount on the original price</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Premium quality products at discounted price</span>
                  </li>
                  {Array.isArray(products) && products.length > 0 && (
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Includes {products.length} carefully curated products</span>
                    </li>
                  )}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="howto" className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">💡</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">How to Use</h3>
              </div>
              <div className="text-gray-700 leading-relaxed text-lg space-y-3">
                {combo.howToUse ? (
                  <div className="whitespace-pre-line">
                    {combo.howToUse}
                  </div>
                ) : (
                  <>
                    <p>
                      Follow the individual product instructions included in this combo for best results. 
                      Use as part of your daily beauty routine.
                    </p>
                    {Array.isArray(products) && products.length > 0 && (
                      <div className="mt-4">
                        <p className="font-semibold mb-2">Usage Steps:</p>
                        <ol className="list-decimal list-inside space-y-2">
                          {products.map((product: any, index: number) => (
                            <li key={index}>
                              Use {typeof product === 'string' ? product : product.name} as directed
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    <p className="mt-4 text-sm text-gray-600">
                      For best results, use all products in the combo together as part of your daily routine.
                    </p>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Customer Reviews Section */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold">Customer Reviews</h2>
            <Button
              onClick={() => setShowReviewDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Write a Review
            </Button>
          </div>
          <p className="text-center text-gray-600 mb-8">What our customers are saying</p>

          <div className="bg-yellow-50 rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="flex">
                {renderStars(parseFloat(averageRating))}
              </div>
              <span className="text-4xl font-bold">{averageRating}</span>
            </div>
            <p className="text-center text-gray-600">
              Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </p>

            <div className="mt-6 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const distribution = calculateRatingDistribution();
                const count = distribution[star as keyof typeof distribution];
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                
                return (
                  <div key={star} className="flex items-center space-x-3">
                    <span className="w-8 text-sm font-medium">{star}★</span>
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-16 text-sm text-gray-600 text-right">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-6">
            {reviewsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center">
                <p className="text-gray-600 mb-4">No reviews yet. Be the first to review this combo!</p>
                <Button
                  onClick={() => setShowReviewDialog(true)}
                  variant="outline"
                  className="border-2 border-purple-200 hover:border-purple-400"
                >
                  Write the First Review
                </Button>
              </div>
            ) : (
              reviews.map((review: any) => (
                <Card key={review.id} className="bg-white/80 backdrop-blur-sm border-2 border-purple-100">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{review.userName || "Anonymous"}</span>
                          <Badge variant="outline" className="text-xs">Verified Purchase</Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-gray-600">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <h4 className="font-bold text-lg mb-2">{review.title}</h4>
                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Share Product
            </DialogTitle>
            <p className="text-gray-600">Share this product with your friends and family</p>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start space-x-3 h-12 text-base"
              onClick={() => handleShare('whatsapp')}
            >
              <span className="text-2xl">💬</span>
              <span>WhatsApp</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start space-x-3 h-12 text-base"
              onClick={() => handleShare('facebook')}
            >
              <span className="text-2xl">📘</span>
              <span>Facebook</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start space-x-3 h-12 text-base"
              onClick={() => handleShare('twitter')}
            >
              <span className="text-2xl">🐦</span>
              <span>Twitter</span>
            </Button>

            <div className="pt-3 border-t">
              <p className="text-center text-gray-500 text-sm mb-3">OR</p>
              <Button
                variant="outline"
                className="w-full justify-start space-x-3 h-12 text-base"
                onClick={() => handleShare('copy')}
              >
                <span className="text-2xl">🔗</span>
                <span>Copy Link</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Write Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Write a Review
            </DialogTitle>
            <p className="text-gray-600">Share your experience with {combo?.name}</p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rating" className="text-base font-semibold mb-2 block">Rating</Label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    className="focus:outline-none transform hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= newReview.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="userName" className="text-base font-semibold mb-2 block">Your Name</Label>
              <Input
                id="userName"
                placeholder="Enter your name"
                value={newReview.userName}
                onChange={(e) => setNewReview({ ...newReview, userName: e.target.value })}
                className="border-2 border-gray-200 focus:border-purple-400"
              />
            </div>

            <div>
              <Label htmlFor="title" className="text-base font-semibold mb-2 block">Review Title</Label>
              <Input
                id="title"
                placeholder="Sum up your experience"
                value={newReview.title}
                onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                className="border-2 border-gray-200 focus:border-purple-400"
              />
            </div>

            <div>
              <Label htmlFor="comment" className="text-base font-semibold mb-2 block">Your Review</Label>
              <Textarea
                id="comment"
                placeholder="Tell us about your experience with this combo"
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                rows={4}
                className="border-2 border-gray-200 focus:border-purple-400"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => setShowReviewDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Submit Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}