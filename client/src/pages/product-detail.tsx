import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ChevronRight, Star, ShoppingCart, Heart, ChevronDown, ChevronUp, CheckCircle, Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from "@/components/product-card";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import OptimizedImage from "@/components/OptimizedImage"; // Assuming OptimizedImage is available

interface Review {
  id: number;
  userId: number;
  productId: number;
  orderId: number;
  rating: number;
  reviewText?: string;
  imageUrl?: string;
  isVerified: boolean;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

interface Shade {
  id: number;
  name: string;
  colorCode: string;
  value: string;
  isActive: boolean;
  sortOrder: number;
  imageUrl?: string;
}

// Mock Category type for query
interface Category {
  id: number;
  name: string;
}

export default function ProductDetail() {
  const [, params] = useRoute("/product/:slug");
  const productSlug = params?.slug || "";
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showAllShades, setShowAllShades] = useState(false);
  const [selectedShade, setSelectedShade] = useState<Shade | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState<{ canReview: boolean; orderId?: number; message: string }>({ canReview: false, message: "" });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [shades, setShades] = useState<Shade[]>([]);
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: [`/api/products/${productSlug}`],
    enabled: !!productSlug,
  });

  // Fetch product images from database
  const { data: productImages = [] } = useQuery({
    queryKey: [`/api/products/${product?.id}/images`],
    queryFn: async () => {
      if (!product?.id) return [];

      const response = await fetch(`/api/products/${product.id}/images`);
      if (!response.ok) {
        // Fallback to legacy imageUrl if images API fails
        return product?.imageUrl ? [{ url: product.imageUrl, sortOrder: 0 }] : [];
      }
      return response.json();
    },
    enabled: !!product?.id,
  });

  // Get image URLs sorted by sortOrder
  const imageUrls = useMemo(() => {
    if (productImages && productImages.length > 0) {
      return productImages
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(img => img.url || img.imageUrl)
        .filter(Boolean);
    } else if (product?.imageUrl) {
      return [product.imageUrl];
    }
    return [];
  }, [productImages?.length, product?.imageUrl]); // Stable dependencies

  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  useEffect(() => {
    if (imageUrls.length > 0 && !selectedImageUrl) {
      setSelectedImageUrl(imageUrls[0]);
    }
  }, [imageUrls.length, selectedImageUrl]); // Only depend on length and current selection

  const { data: relatedProducts } = useQuery<Product[]>({
    queryKey: [`/api/products/category/${product?.category}`],
    enabled: !!product?.category,
  });

  // Mock category and subcategory data (replace with actual data fetching)
  const categories = [{ id: 1, name: 'skincare' }, { id: 2, name: 'haircare' }];
  const subcategories = [{ id: 3, name: 'face wash' }, { id: 4, name: 'shampoo' }];

  // Fetch shades specifically assigned to this product
  const { data: shadesFromAPI = [] } = useQuery<Shade[]>({
    queryKey: [`/api/products/${product?.id}/shades`],
    queryFn: async () => {
      if (!product?.id) return [];

      const response = await fetch(`/api/products/${product.id}/shades`);
      if (!response.ok) {
        return [];
      }
      const shades = await response.json();

      // Only return shades that are specifically assigned to this product
      // Filter out shades that are only category-based and don't include this product
      return shades.filter((shade: Shade) => {
        // If shade has productIds array and this product is in it, include it
        if (shade.productIds && Array.isArray(shade.productIds) && shade.productIds.includes(product.id)) {
          return true;
        }

        // If shade doesn't have specific product IDs but matches category/subcategory
        // Only include if no specific products are selected (meaning it applies to all in category)
        if (!shade.productIds || shade.productIds.length === 0) {
          return true;
        }

        return false;
      });
    },
    enabled: !!product?.id,
  });

  // Fetch product reviews
  const { data: productReviews = [], refetch: refetchReviews } = useQuery({
    queryKey: [`/api/products/${product?.id}/reviews`],
    queryFn: async () => {
      if (!product?.id) return [];

      const response = await fetch(`/api/products/${product.id}/reviews`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!product?.id,
  });

  // Check if user can review this product
  const { data: reviewEligibility } = useQuery({
    queryKey: [`/api/products/${product?.id}/can-review`],
    queryFn: async () => {
      if (!product?.id) return { canReview: false, message: "" };

      const user = localStorage.getItem("user");
      if (!user) return { canReview: false, message: "Please login to review" };

      const userData = JSON.parse(user);
      const response = await fetch(`/api/products/${product.id}/can-review?userId=${userData.id}`);
      if (!response.ok) {
        return { canReview: false, message: "Unable to check review eligibility" };
      }
      return response.json();
    },
    enabled: !!product?.id,
  });

  useEffect(() => {
    if (productReviews && Array.isArray(productReviews)) {
      setReviews(productReviews);
    }
  }, [productReviews?.length]); // Only depend on length

  useEffect(() => {
    if (reviewEligibility && typeof reviewEligibility === 'object') {
      setCanReview(reviewEligibility);
    }
  }, [reviewEligibility?.canReview, reviewEligibility?.message]); // Specific properties

  useEffect(() => {
    if (product?.id) {
      const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setIsInWishlist(wishlist.some((item: any) => item.id === product.id));
    }
  }, [product?.id]); // Only depend on product ID

  // Set shades when data is available - Fixed dependencies
  useEffect(() => {
    if (shadesFromAPI && shadesFromAPI.length > 0) {
      setShades(shadesFromAPI);
    }
  }, [shadesFromAPI?.length]); // Only depend on length to avoid object reference changes

  const toggleWishlist = () => {
    if (!product) return;

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

    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    const existingIndex = wishlist.findIndex((item: any) => item.id === product.id);

    if (existingIndex >= 0) {
      wishlist.splice(existingIndex, 1);
      setIsInWishlist(false);
      toast({
        title: "Removed from Wishlist",
        description: `${product.name} has been removed from your wishlist`,
      });
    } else {
      const wishlistItem = {
        id: product.id,
        name: product.name,
        price: `₹${product.price}`,
        originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
        image: product.imageUrl,
        inStock: true,
        category: product.category,
        rating: product.rating,
      };
      wishlist.push(wishlistItem);
      setIsInWishlist(true);
      toast({
        title: "Added to Wishlist",
        description: `${product.name} has been added to your wishlist`,
      });
    }

    localStorage.setItem("wishlist", JSON.JSON.stringify(wishlist));
    window.dispatchEvent(new Event("wishlistUpdated"));
  };

  const addToCart = () => {
    if (!product) return;

    // Check if user is logged in
    const user = localStorage.getItem("user");
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your cart",
        variant: "destructive",
      });
      window.location.href = "/auth/login";
      return;
    }

    // Allow adding to cart without selecting a shade (None option available)

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    // Create unique item ID based on product and shade
    const itemKey = selectedShade ? `${product.id}-${selectedShade.id}` : `${product.id}`;
    const existingItem = cart.find((cartItem: any) => cartItem.itemKey === itemKey);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      const cartItem = {
        id: product.id,
        itemKey,
        name: product.name,
        price: `₹${product.price}`,
        originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
        image: selectedShade?.imageUrl || selectedImageUrl || imageUrls[0] || product.imageUrl,
        quantity: 1,
        inStock: true,
        selectedShade: selectedShade ? {
          id: selectedShade.id,
          name: selectedShade.name,
          colorCode: selectedShade.colorCode,
          imageUrl: selectedShade.imageUrl
        } : null
      };
      cart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.JSON.stringify(cart));
    localStorage.setItem("cartCount", cart.reduce((total: number, item: any) => total + item.quantity, 0).toString());
    window.dispatchEvent(new Event("cartUpdated"));

    const shadeText = selectedShade ? ` in ${selectedShade.name} shade` : '';
    toast({
      title: "Added to Cart",
      description: `${product.name}${shadeText} has been added to your cart`,
    });
  };

  const handleShadeSelect = (shade: Shade) => {
    setSelectedShade(shade);

    // If shade has an image, set it as the selected image
    if (shade.imageUrl) {
      setSelectedImageUrl(shade.imageUrl);
    } else {
      // If the selected shade doesn't have an image, revert to the product's main image
      if (imageUrls.length > 0) {
        setSelectedImageUrl(imageUrls[0]);
      }
    }

    toast({
      title: "Shade Selected",
      description: `You selected ${shade.name}`,
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    const user = localStorage.getItem("user");
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to submit a review",
        variant: "destructive",
      });
      return;
    }

    if (reviewRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    setSubmittingReview(true);

    try {
      const userData = JSON.parse(user);
      const formData = new FormData();

      formData.append('userId', userData.id.toString());
      formData.append('rating', reviewRating.toString());
      formData.append('orderId', canReview.orderId?.toString() || '');

      if (reviewText.trim()) {
        formData.append('reviewText', reviewText.trim());
      }

      if (reviewImage) {
        formData.append('image', reviewImage);
      }

      const response = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Review Submitted",
          description: "Thank you for your review!",
        });

        // Reset form
        setReviewRating(0);
        setReviewText("");
        setReviewImage(null);
        setShowReviewForm(false);

        // Refresh reviews
        refetchReviews();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to submit review",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleStarClick = (rating: number) => {
    setReviewRating(rating);
  };

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

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-400 rounded-full"></div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-8">The product you're looking for doesn't exist.</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 rounded-xl font-semibold">
                ← Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredRelatedProducts = relatedProducts?.filter(p => p.id !== product.id).slice(0, 4) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-8 sm:py-16">
      <div className="max-w-7xl mx-auto product-detail-container lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm mb-6 sm:mb-8 bg-white/60 backdrop-blur-md rounded-xl sm:rounded-2xl breadcrumb-mobile sm:px-6 sm:py-4 shadow-lg border border-white/20">
          <Link href="/" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-purple-400" />
          <Link href={`/category/${product.category}`} className="text-purple-600 hover:text-purple-700 capitalize font-medium transition-colors">
            {product.category}
          </Link>
          <ChevronRight className="h-4 w-4 text-purple-400" />
          <span className="text-gray-900 font-semibold">{product.name}</span>
        </nav>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-16">
          {/* Product Images - Expanded */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white/70 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border border-white/20">
                <div className="space-y-4">
                  {/* Vertical Layout: Thumbnails on Left, Main Image on Right */}
                  <div className="flex gap-4">
                    {/* Thumbnail Column - Vertical Slider for 4+ images */}
                    {imageUrls.length > 1 && (
                      <div className="w-20 flex-shrink-0">
                        {imageUrls.length <= 4 ? (
                          // Show all thumbnails if 4 or less
                          <div className="flex flex-col gap-3">
                            {imageUrls.map((imageUrl, index) => (
                              <button
                                key={`thumb-${index}`}
                                onClick={() => setSelectedImageUrl(imageUrl)}
                                className={`w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:border-purple-300 flex-shrink-0 ${
                                  selectedImageUrl === imageUrl
                                    ? 'border-purple-500 ring-2 ring-purple-200'
                                    : 'border-gray-200'
                                }`}
                              >
                                <img
                                  src={imageUrl}
                                  alt={`${product.name} view ${index + 1}`}
                                  className="w-full h-full object-contain rounded-xl sm:rounded-2xl group-hover:scale-105 sm:group-hover:scale-110"
                          
                                />
                              </button>
                            ))}
                          </div>
                        ) : (
                          // Use slider for more than 4 images
                          <div className="relative h-80 overflow-hidden w-20">
                            <div 
                              className="flex flex-col gap-3 transition-transform duration-300 ease-in-out"
                              style={{
                                transform: `translateY(-${Math.max(0, Math.min(imageUrls.findIndex(img => img === selectedImageUrl) - 1, imageUrls.length - 4)) * 108}px)`
                              }}
                            >
                              {imageUrls.map((imageUrl, index) => (
                                <button
                                  key={`thumb-${index}`}
                                  onClick={() => setSelectedImageUrl(imageUrl)}
                                  className={`w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:border-purple-300 flex-shrink-0 ${
                                    selectedImageUrl === imageUrl
                                      ? 'border-purple-500 ring-2 ring-purple-200'
                                      : 'border-gray-200'
                                  }`}
                                >
                                  <div className="w-full h-full flex items-center justify-center p-1 bg-white rounded-lg">
                                  <OptimizedImage
                                    src={imageUrl}
                                    alt={`${product.name} view ${index + 1}`}
                                    className="w-full h-full"
                                    width={80}
                                    height={80}
                                    style={{ 
                                      objectFit: 'contain',
                                      width: '100%',
                                      height: '100%',
                                      borderRadius: '6px'
                                    }}
                                  />
                                </div>
                                </button>
                              ))}
                            </div>

                            {/* Slider Indicators */}
                            {imageUrls.length > 4 && (
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col gap-1">
                                <div className="w-1 bg-gray-300 rounded-full h-4 relative">
                                  <div 
                                    className="w-1 bg-purple-500 rounded-full transition-all duration-300"
                                    style={{
                                      height: `${(4 / imageUrls.length) * 100}%`,
                                      transform: `translateY(${(Math.max(0, Math.min(imageUrls.findIndex(img => img === selectedImageUrl) - 1, imageUrls.length - 4)) / (imageUrls.length - 4)) * (16 - (4 / imageUrls.length) * 16)}px)`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Image with Zoom */}
                    <div className="flex-1 bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg relative group cursor-zoom-in" style={{ aspectRatio: '1/1', minHeight: '300px', height: '400px' }}>
                      {selectedImageUrl || imageUrls[0] ? (
                        <div className="w-full h-full flex items-center justify-center p-2">
                          <img
                            src={selectedImageUrl || imageUrls[0] || product.imageUrl}
                            alt={product.name}
                             className="w-full h-full object-contain rounded-xl sm:rounded-2xl group-hover:scale-105 sm:group-hover:scale-110"
                            width={400}
                            height={400}
                     
                            onClick={() => {
                              // Create zoom modal
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4';
                              modal.onclick = () => modal.remove();

                              const img = document.createElement('img');
                              img.src = selectedImageUrl || imageUrls[0] || product.imageUrl;
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
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-xl sm:rounded-2xl flex items-center justify-center">
                          <span className="text-gray-500">No image available</span>
                        </div>
                      )}

                      {/* Zoom Hint */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to zoom
                      </div>
                    </div>
                  </div>

                  {/* Image Count Indicator */}
                  {imageUrls.length > 1 && (
                    <div className="text-center text-sm text-gray-500">
                      {imageUrls.findIndex(img => img === selectedImageUrl) + 1} of {imageUrls.length} images
                    </div>
                  )}
                </div>

                {/* Product Benefits */}
                {product.benefits && (
                  <div className="mt-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 border border-pink-100">
                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                      <div className="w-5 h-5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mr-2"></div>
                      Key Benefits
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(product.benefits) 
                        ? product.benefits.slice(0, 4)
                        : product.benefits.split('\n').filter(benefit => benefit.trim()).slice(0, 4)
                      ).map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{benefit.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="bg-white/70 backdrop-blur-md rounded-xl sm:rounded-3xl p-4 sm:p-8 shadow-xl sm:shadow-2xl border border-white/20">
              {/* Product badges */}
              <div className="flex gap-3 mb-6">
                {product.bestseller && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    #{product.category === 'skincare' ? '1' : product.category === 'haircare' ? '2' : '1'} in {product.category}
                  </Badge>
                )}
                {product.newLaunch && (
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    NEW LAUNCH
                  </Badge>
                )}
              </div>

              <h1 className="product-detail-title sm:text-4xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3 sm:mb-4">{product.name}</h1>

              <p className="product-detail-description sm:text-lg text-gray-600 mb-4 sm:mb-6">{product.shortDescription}</p>

              {/* Rating */}
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className="flex">
                  {renderStars(parseFloat(product.rating))}
                </div>
                <span className="product-detail-rating sm:text-xl font-bold text-gray-900">{product.rating}</span>
                <span className="text-sm sm:text-base text-gray-600 font-medium">({product.reviewCount.toLocaleString()} reviews)</span>
              </div>

              {/* Size */}
              {product.size && (
                <div className="mb-6">
                  <span className="text-gray-700 font-bold">Size: </span>
                  <span className="text-gray-900 font-semibold bg-gray-100 px-3 py-1 rounded-lg">{product.size}</span>
                </div>
              )}

              {/* Shades Selection - Only show if product has shades */}
              {shades.length > 0 && (
                <div className="space-y-4 mb-6">
                  <label className="text-gray-700 font-bold text-lg">
                    Select Shade: {selectedShade ? (
                      <span className="text-purple-600 font-normal">
                        {selectedShade.name}
                      </span>
                    ) : (
                      <span className="text-gray-500 font-normal">
                        No shade selected
                      </span>
                    )}
                  </label>
                <div className="grid grid-cols-4 gap-3">
                  {/* None/No Shade Option */}
                  <div 
                    className="flex flex-col items-center group cursor-pointer"
                    onClick={() => {
                      setSelectedShade(null);
                      // Reset to original image when no shade is selected
                      if (imageUrls.length > 0) {
                        setSelectedImageUrl(imageUrls[0]);
                      }
                    }}
                  >
                    <div className="relative">
                      {!selectedShade && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center z-10">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                      <div 
                        className={`w-12 h-12 rounded-full border-3 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl flex items-center justify-center ${
                          !selectedShade
                            ? 'border-purple-500 ring-2 ring-purple-300 ring-offset-2 scale-105 bg-gray-100' 
                            : 'border-gray-300 hover:border-purple-400 bg-gray-50'
                        }`}
                        title="No specific shade"
                      >
                        <span className="text-xs font-bold text-gray-600">None</span>
                      </div>
                    </div>
                    <span className={`text-xs mt-2 text-center leading-tight transition-colors ${
                      !selectedShade
                        ? 'text-purple-700 font-semibold' 
                        : 'text-gray-600 group-hover:text-purple-600'
                    }`}>
                      No Shade
                    </span>
                  </div>

                  {(() => {
                    const shadesToShow = showAllShades ? shades : shades.slice(0, 3);

                    return shadesToShow.map((shade) => (
                      <div 
                        key={shade.value} 
                        className="flex flex-col items-center group cursor-pointer"
                        onClick={() => handleShadeSelect(shade)}
                      >
                        <div className="relative">
                          {selectedShade?.id === shade.id && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center z-10">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                          <div 
                            className={`w-12 h-12 rounded-full border-3 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl ${
                              selectedShade?.id === shade.id 
                                ? 'border-purple-500 ring-2 ring-purple-300 ring-offset-2 scale-105' 
                                : 'border-gray-300 hover:border-purple-400'
                            }`}
                            style={{ backgroundColor: shade.colorCode }}
                            title={shade.name}
                          ></div>
                        </div>
                        <span className={`text-xs mt-2 text-center leading-tight transition-colors ${
                          selectedShade?.id === shade.id 
                            ? 'text-purple-700 font-semibold' 
                            : 'text-gray-600 group-hover:text-purple-600'
                        }`}>
                          {shade.name.split(' ')[0]}
                        </span>
                      </div>
                    ));
                  })()}
                </div>

                {/* View All Button */}
                {!showAllShades && shades.length > 3 && (
                  <div className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllShades(true)}
                      className="border-2 border-purple-200 hover:border-purple-400 rounded-xl px-6 py-2 font-semibold text-purple-600 hover:text-purple-700 transition-all duration-200"
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      View All Shades ({shades.length})
                    </Button>
                  </div>
                )}

                {/* Show Less Button */}
                {showAllShades && shades.length > 3 && (
                  <div className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllShades(false)}
                      className="border-2 border-purple-200 hover:border-purple-400 rounded-xl px-6 py-2 font-semibold text-purple-600 hover:text-purple-700 transition-all duration-200"
                    >
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Show Less
                    </Button>
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-3">
                    💡 Click on a shade to select it. Not sure about your shade? Our beauty experts can help you find the perfect match!
                  </p>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
                <span className="product-detail-price sm:text-4xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">₹{product.price}</span>
                {product.originalPrice && (
                  <span className="text-lg sm:text-2xl text-gray-500 line-through">₹{product.originalPrice}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex product-detail-buttons sm:flex-row sm:space-x-4 sm:space-y-0 mb-4 sm:mb-6">
                <Button size="lg" className="product-detail-button bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg sm:rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200" onClick={addToCart}>
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button size="lg" variant="outline" className="border-2 border-purple-200 hover:border-purple-400 rounded-lg sm:rounded-xl p-3 sm:p-4 transform hover:scale-105 transition-all duration-200" onClick={toggleWishlist}>
                  <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isInWishlist ? "fill-red-600 text-red-600" : "text-purple-500"}`} />
                </Button>
              </div>

              {/* Stock status */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-bold text-lg">In Stock</span>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Product Information Tabs */}
        <div className="product-detail-tabs sm:mb-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="product-detail-tab-list grid w-full grid-cols-2 lg:grid-cols-4 bg-white/70 backdrop-blur-md rounded-xl sm:rounded-2xl p-1 sm:p-2 shadow-lg border border-white/20">
              <TabsTrigger 
                value="description" 
                className="product-detail-tab-trigger sm:py-4 sm:px-6 sm:text-sm rounded-lg sm:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                Description
              </TabsTrigger>
              <TabsTrigger 
                value="ingredients" 
                className="product-detail-tab-trigger sm:py-4 sm:px-6 sm:text-sm rounded-lg sm:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                Ingredients
              </TabsTrigger>
              <TabsTrigger 
                value="benefits" 
                className="product-detail-tab-trigger sm:py-4 sm:px-6 sm:text-sm rounded-lg sm:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                Benefits
              </TabsTrigger>
              <TabsTrigger 
                value="how-to-use" 
                className="product-detail-tab-trigger sm:py-4 sm:px-6 sm:text-sm rounded-lg sm:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                How to Use
              </TabsTrigger>
            </TabsList>

            <div className="product-detail-tab-content sm:mt-8">
              <TabsContent value="description" className="m-0">
                <Card className="product-detail-card border-0 shadow-xl sm:shadow-2xl bg-gradient-to-br from-blue-50/80 to-white/80 backdrop-blur-md rounded-xl sm:rounded-3xl border border-white/20">
                  <CardHeader className="pb-4 sm:pb-6">
                    <CardTitle className="product-detail-card-title sm:text-3xl text-gray-900 flex items-center">
                      <div className="product-detail-card-icon sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                        <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white rounded-full"></div>
                      </div>
                      Product Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed text-sm sm:text-lg font-medium">{product.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ingredients" className="m-0">
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-red-50/80 to-white/80 backdrop-blur-md rounded-3xl border border-white/20">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-3xl font-bold text-gray-900 flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                      </div>
                      Key Ingredients
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {product.ingredients ? (
                      <div className="grid gap-4">
                        {(Array.isArray(product.ingredients) 
                          ? product.ingredients 
                          : product.ingredients.split('\n').filter(ingredient => ingredient.trim())
                        ).map((ingredient, index) => (
                          <div key={index} className="flex items-start p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-red-100/50 transform hover:scale-105 transition-all duration-200">
                            <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-pink-400 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                            <span className="text-gray-700 font-semibold text-lg">{ingredient.trim()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-300 to-pink-300 rounded-2xl"></div>
                        </div>
                        <p className="text-gray-500 text-xl font-medium">Ingredient information not available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="benefits" className="m-0">
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-50/80 to-white/80 backdrop-blur-md rounded-3xl border border-white/20">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-3xl font-bold text-gray-900 flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                      </div>
                      Key Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {product.benefits ? (
                      <div className="grid gap-4">
                        {(Array.isArray(product.benefits) 
                          ? product.benefits 
                          : product.benefits.split('\n').filter(benefit => benefit.trim())
                        ).map((benefit, index) => (
                          <div key={index} className="flex items-start p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-green-100/50 transform hover:scale-105 transition-all duration-200">
                            <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                            <span className="text-gray-700 font-semibold text-lg">{benefit.trim()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-300 to-emerald-300 rounded-2xl"></div>
                        </div>
                        <p className="text-gray-500 text-xl font-medium">Benefit information not available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="how-to-use" className="m-0">
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-purple-50/80 to-white/80 backdrop-blur-md rounded-3xl border border-white/20">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-3xl font-bold text-gray-900 flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                      </div>
                      How to Use
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {product.howToUse ? (
                      <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-purple-100/50">
                        <div className="prose prose-gray max-w-none">
                          <p className="text-gray-700 leading-relaxed text-lg font-medium mb-0">
                            {product.howToUse}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-300 to-indigo-300 rounded-2xl"></div>
                        </div>
                        <p className="text-gray-500 text-xl font-medium">Usage instructions not available for this product.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Customer Reviews Section */}
        <section className="bg-white/60 backdrop-blur-md rounded-xl sm:rounded-3xl p-4 sm:p-8 shadow-xl sm:shadow-2xl border border-white/20 mb-8 sm:mb-16">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2 sm:mb-4">Customer Reviews</h2>
            <p className="text-gray-600 text-sm sm:text-lg font-medium">What our customers are saying</p>
          </div>

          {/* Review Form for Eligible Users */}
          {canReview.canReview && (
            <div className="mb-8">
              {!showReviewForm ? (
                <div className="text-center">
                  <Button 
                    onClick={() => setShowReviewForm(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-xl font-semibold"
                  >
                    Write a Review
                  </Button>
                </div>
              ) : (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-100/50 mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Write Your Review</h3>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    {/* Rating Stars */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating *
                      </label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleStarClick(star)}
                            className={`w-8 h-8 ${
                              star <= reviewRating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            } hover:text-yellow-400 transition-colors`}
                          >
                            <Star className="w-full h-full" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Review Text */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Review (Optional)
                      </label>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Share your experience with this product..."
                      />
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Photo (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReviewImage(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex space-x-3">
                      <Button
                        type="submit"
                        disabled={submittingReview || reviewRating === 0}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowReviewForm(false);
                          setReviewRating(0);
                          setReviewText("");
                          setReviewImage(null);
                        }}
                        className="px-6 py-2 rounded-lg font-semibold"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Message for users who cannot review */}
          {!canReview.canReview && canReview.message && (
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-8 text-center">
              <p className="text-gray-600">{canReview.message}</p>
            </div>
          )}

          {/* Reviews Summary */}
          <div className="bg-gradient-to-br from-yellow-50/80 to-orange-50/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-yellow-200/50">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                  <div className="flex">
                    {renderStars(parseFloat(product.rating))}
                  </div>
                  <span className="text-3xl font-bold text-gray-900">{product.rating}</span>
                </div>
                <p className="text-gray-600 font-medium">Based on {reviews.length > 0 ? reviews.length : product.reviewCount.toLocaleString()} reviews</p>
              </div>
              <div className="space-y-2 w-full md:w-64">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const totalReviews = reviews.length || 1; // Prevent division by zero
                  const starCount = reviews.filter(review => review.rating === stars).length;
                  const percentage = Math.round((starCount / totalReviews) * 100);

                  return (
                    <div key={stars} className="flex items-center space-x-2">
                      <span className="text-sm font-medium w-8">{stars}★</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${percentage}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 w-8">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dynamic Reviews */}
          <div className="space-y-6">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100/50">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {review.userName ? review.userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            {review.userName || 'Anonymous User'}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Verified Purchase • {new Date(review.createdAt).toLocaleDateString('en-IN', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      {review.reviewText && (
                        <p className="text-gray-700 leading-relaxed">
                          "{review.reviewText}"
                        </p>
                      )}
                      {review.imageUrl && (
                        <div className="mt-3">
                          <img 
                            src={review.imageUrl} 
                            alt="Review" 
                            className="max-w-xs rounded-lg shadow-md"
                          />
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                          Verified Purchase
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Star className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 text-xl font-medium">No reviews yet</p>
                <p className="text-gray-400">Be the first to review this product!</p>
              </div>
            )}
          </div>

          {/* Load More Reviews Button */}
          <div className="text-center mt-8">
            <Button variant="outline" className="border-2 border-purple-200 hover:border-purple-400 rounded-xl px-8 py-3 font-semibold">
              Load More Reviews
            </Button>
          </div>
        </section>

        {/* You May Also Like - Horizontal Scroll */}
        {filteredRelatedProducts.length > 0 && (
          <section className="bg-white/60 backdrop-blur-md rounded-xl sm:rounded-3xl p-4 sm:p-8 shadow-xl sm:shadow-2xl border border-white/20">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">You May Also Like</h2>
              <p className="text-gray-600 text-sm sm:text-lg font-medium">More products from {product.category}</p>
            </div>

            <div className="flex space-x-4 overflow-x-auto pb-4 snap-x snap-mandatory">
              {filteredRelatedProducts.map((relatedProduct) => (
                <div key={relatedProduct.id} className="flex-none w-64 snap-start">
                  <ProductCard product={relatedProduct} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

  );
}