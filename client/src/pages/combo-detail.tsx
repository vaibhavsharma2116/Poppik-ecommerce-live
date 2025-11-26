import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ChevronRight, Star, ShoppingCart, Heart, ArrowLeft, Share2, Package, ChevronLeft, Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Helper to get shade color
function getShadeColor(shadeName: string): string {
  const name = shadeName.toLowerCase();
  if (name.includes('red')) return '#ef4444';
  if (name.includes('pink')) return '#ec4899';
  if (name.includes('orange')) return '#f97316';
  if (name.includes('brown')) return '#92400e';
  if (name.includes('nude')) return '#fbbf24';
  if (name.includes('purple')) return '#a855f7';
  if (name.includes('coral')) return '#fb923c';
  if (name.includes('peach')) return '#fdba74';
  if (name.includes('mauve')) return '#c084fc';
  if (name.includes('berry')) return '#be123c';
  return '#9333ea';
}

// Shade Selector Sheet Component (copied/adapted from offer-detail)
function ShadeSelectorSheet({
  product,
  shades,
  selectedShade,
  isOpen,
  onClose,
  onShadeSelect,
}: {
  product: any;
  shades: any[];
  selectedShade: string | null;
  isOpen: boolean;
  onClose: () => void;
  onShadeSelect: (shade: string) => void;
}) {
  const [selectedShades, setSelectedShades] = useState<Set<string>>(new Set(selectedShade ? [selectedShade] : []));

  useEffect(() => {
    setSelectedShades(new Set(selectedShade ? [selectedShade] : []));
  }, [selectedShade, isOpen]);

  const handleClearAll = () => {
    setSelectedShades(new Set());
  };

  const handleShadeToggle = (shadeName: string) => {
    const newSelection = new Set<string>();
    if (!selectedShades.has(shadeName)) {
      newSelection.add(shadeName);
    }
    setSelectedShades(newSelection);
  };

  const handleConfirm = () => {
    if (selectedShades.size > 0) {
      onShadeSelect(Array.from(selectedShades).join(', '));
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] sm:h-[75vh]">
        <SheetHeader className="border-b pb-4 mb-4 bg-gradient-to-r from-purple-50 to-pink-50 -mx-6 px-6 -mt-6 pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl font-bold text-gray-900">Select Your Shade</SheetTitle>
              <SheetDescription className="text-gray-600 mt-1">
                Choose 1 shade from {shades.length} options for {product?.name}
              </SheetDescription>
              {selectedShades.size > 0 && (
                <div className="mt-2 text-sm font-semibold text-purple-600">{selectedShades.size} shade selected</div>
              )}
              <div className="mt-2 text-xs font-medium text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                ⚠️ Only 1 shade can be selected
              </div>
            </div>
            <Palette className="w-8 h-8 text-purple-600 flex-shrink-0" />
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleClearAll} variant="outline" size="sm" className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50" disabled={selectedShades.size === 0}>
              Clear Selection
            </Button>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-180px)] pb-4 -mx-6 px-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {shades.map((shade: any) => {
              const isSelected = selectedShades.has(shade.name);
              return (
                <button key={shade.id} onClick={() => handleShadeToggle(shade.name)} className={`group flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${isSelected ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg scale-105 ring-2 ring-purple-300' : 'border-gray-200 hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 hover:shadow-md hover:scale-102'}`}>
                  <div className="relative">
                    {shade.imageUrl ? (
                      <img src={shade.imageUrl} alt={shade.name} className={`w-16 h-16 rounded-xl shadow-md border-4 border-white object-cover transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`} />
                    ) : (
                      <div className={`w-16 h-16 rounded-xl shadow-md border-4 border-white transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`} style={{ backgroundColor: shade.colorCode || getShadeColor(shade.name) }} />
                    )}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-semibold text-center line-clamp-2 capitalize transition-colors ${isSelected ? 'text-purple-700' : 'text-gray-700 group-hover:text-purple-600'}`}>{shade.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="font-semibold">{selectedShades.size > 0 ? `${selectedShades.size} shade selected` : 'Select 1 shade'}</span>
          </div>
          <Button onClick={handleConfirm} variant="secondary" size="sm" disabled={selectedShades.size === 0} className="bg-white text-purple-700 hover:bg-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {selectedShades.size > 0 ? 'Confirm Selection' : 'Select Shade'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

async function fetchProductDetailsAndShades(productIds: number[]) {
  const productShadesPromises = productIds.map(id =>
    fetch(`/api/products/${id}/shades`)
      .then(res => res.ok ? res.json().then(shades => ({ id, shades })) : Promise.resolve({ id, shades: [] }))
  );
  const shadesData = await Promise.all(productShadesPromises);

  const productShadesMap: Record<number, any[]> = {};
  shadesData.forEach(({ id, shades }) => {
    productShadesMap[id] = shades || [];
  });

  return productShadesMap;
}

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
  const [canReview, setCanReview] = useState<{ canReview: boolean; orderId?: number; message: string }>({ canReview: false, message: "" });
  const { toast } = useToast();

  const { data: combo, isLoading, error } = useQuery<any>({
    queryKey: [`/api/combos/${comboId}`],
    enabled: !!comboId,
  });


  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: [`/api/combos/${comboId}/reviews`],
    enabled: !!comboId,
  });
  // Shade data for products (fetched when combo products are available)
  const [productShadesData, setProductShadesData] = useState<Record<number, any[]>>({});
  const [selectedShades, setSelectedShades] = useState<Record<number, string | null>>({});
  const [shadeSelectorOpen, setShadeSelectorOpen] = useState<number | null>(null);

  // Check if user can review this combo
  const { data: reviewEligibility } = useQuery({
    queryKey: [`/api/combos/${comboId}/can-review`],
    queryFn: async () => {
      if (!comboId) return { canReview: false, message: "" };

      const user = localStorage.getItem("user");
      if (!user) return { canReview: false, message: "Please login to review" };

      const userData = JSON.parse(user);
      const response = await fetch(`/api/combos/${comboId}/can-review?userId=${userData.id}`);
      if (!response.ok) {
        return { canReview: false, message: "Unable to check review eligibility" };
      }
      return response.json();
    },
    enabled: !!comboId,
  });

  console.log("Combo data:", combo);
  console.log("Loading:", isLoading);
  console.log("Error:", error);

  // Update canReview state when eligibility data changes
  useEffect(() => {
    if (reviewEligibility && typeof reviewEligibility === 'object') {
      setCanReview(reviewEligibility);
    }
  }, [reviewEligibility]);

  useEffect(() => {
    // Track affiliate click if ref parameter exists
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateRef = urlParams.get('ref');

    if (affiliateRef && combo?.id) {
      // Track the click
      fetch('/api/affiliate/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliateCode: affiliateRef,
          comboId: combo.id,
        }),
      }).catch(err => console.error('Error tracking affiliate click:', err));

      // Store in localStorage for checkout
      localStorage.setItem('affiliateRef', affiliateRef);
    }
  }, [combo?.id]);

  // Prepare products (safe parse) and load shades for products before any early returns
  const products = combo
    ? (typeof combo.products === 'string' ? (() => { try { return JSON.parse(combo.products); } catch { return []; } })() : combo.products)
    : [];

  useEffect(() => {
    try {
      const productIds: number[] = Array.isArray(products)
        ? products.map((p: any) => (typeof p === 'string' ? null : p.id)).filter(Boolean)
        : [];

      if (productIds.length > 0) {
        fetchProductDetailsAndShades(productIds)
          .then((map) => setProductShadesData(map))
          .catch((err) => console.error('Error fetching product shades:', err));
      }
    } catch (err) {
      console.error('Error parsing products for shades:', err);
    }
  }, [products]);

  // Get all image URLs (from imageUrls array or fallback to imageUrl)
  const allImageUrls = combo?.imageUrls && combo.imageUrls.length > 0 
    ? combo.imageUrls 
    : combo?.imageUrl 
      ? [combo.imageUrl] 
      : [];

  // Combine images and video for carousel
  const mediaItems = [
    ...allImageUrls.map((url: string) => ({ type: 'image', url })),
    ...(combo?.videoUrl ? [{ type: 'video', url: combo.videoUrl }] : [])
  ];

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
      const wishlistItem = {
        id: combo.id,
        name: combo.name.substring(0, 100), // Limit name length
        price: `₹${combo.price}`,
        originalPrice: combo.originalPrice ? `₹${combo.originalPrice}` : undefined,
        image: combo.imageUrl?.substring(0, 200) || '', // Limit image URL length
        inStock: true,
        category: 'combo',
        rating: '5.0',
      };
      wishlist.push(wishlistItem);
      setIsInWishlist(true);
    }

    try {
      localStorage.setItem("wishlist", JSON.stringify(wishlist));
    } catch (error) {
      console.error("Wishlist storage error:", error);
      toast({
        title: "Storage Error",
        description: "Your wishlist is full. Please remove some items to add new ones.",
        variant: "destructive",
      });
      // Revert the change if storage failed
      if (existingIndex < 0) {
        wishlist.pop();
        setIsInWishlist(false);
      }
      return;
    }
    window.dispatchEvent(new Event("wishlistUpdated"));
  };

  const addToCart = () => {
    if (!combo) return;

    // Check if all products with shades have at least one shade selected
    const productsWithShades = products.filter((product: any) => {
      const productShades = productShadesData[product.id] || [];
      return productShades.length > 0;
    });

    const unselectedProducts = productsWithShades.filter((product: any) => {
      return !selectedShades[product.id] || selectedShades[product.id].trim() === '';
    });

    if (unselectedProducts.length > 0) {
      toast({
        title: "Shade Selection Required",
        description: `Please select shade(s) for all products: ${unselectedProducts.map((p: any) => p.name).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find((cartItem: any) => cartItem.id === combo.id && cartItem.isCombo);

    if (existingItem) {
      existingItem.quantity += 1;
      // Update selected shades if any
      if (Object.keys(selectedShades).length > 0) {
        existingItem.selectedShades = selectedShades;
      }
    } else {
      const cartItem = {
        id: combo.id,
        comboId: combo.id, // Use comboId instead of productId
        name: combo.name,
        price: `₹${combo.price}`,
        originalPrice: combo.originalPrice ? `₹${combo.originalPrice}` : undefined,
        image: combo.imageUrl,
        quantity: 1,
        inStock: true,
        isCombo: true,
        cashbackPercentage: combo.cashbackPercentage,
        cashbackPrice: combo.cashbackPrice,
        selectedShades: Object.keys(selectedShades).length > 0 ? selectedShades : undefined,
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

    if (!canReview.canReview) {
      toast({
        title: "Cannot Review",
        description: canReview.message || "You must purchase this combo to leave a review",
        variant: "destructive",
      });
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
      const userData = JSON.parse(user);
      const response = await fetch(`/api/combos/${comboId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newReview,
          userName: newReview.userName || userData.username || "Anonymous",
          orderId: canReview.orderId,
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
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to submit review",
          variant: "destructive",
        });
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
    const distribution = [0, 0, 0, 0, 0];
    const reviewsArray = Array.isArray(reviews) ? reviews : [];
    reviewsArray.forEach((review) => {
      const rating = Math.round(review.rating);
      if (rating >= 1 && rating <= 5) {
        distribution[rating - 1]++;
      }
    });
    return distribution;
  };

  const ratingDistribution = calculateRatingDistribution();

  const averageRating = reviews && Array.isArray(reviews) && reviews.length > 0
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
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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

  const handleShadeChange = (productId: number, shade: string | null) => {
    setSelectedShades((prev) => ({ ...prev, [productId]: shade }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-8 sm:py-16">
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    {mediaItems.length > 1 && (
                      <div className="w-14 sm:w-16 md:w-20 flex-shrink-0 relative">
                        <div 
                          className="h-64 sm:h-72 md:h-80 overflow-hidden scroll-smooth"
                          style={{ scrollBehavior: 'smooth' }}
                        >
                          <div 
                            id="thumbnail-container"
                            className="flex flex-col gap-2 sm:gap-2.5 md:gap-3 h-full overflow-y-auto scrollbar-hide touch-pan-y"
                            style={{
                              scrollSnapType: 'y mandatory',
                              scrollBehavior: 'smooth',
                              WebkitOverflowScrolling: 'touch'
                            }}
                            onScroll={(e) => {
                              // Skip auto-selection if user is manually scrolling after a click
                              if ((window as any).thumbnailClickInProgress) {
                                return;
                              }

                              // Capture container reference before setTimeout
                              const container = e.currentTarget;
                              if (!container) return;

                              // Debounce scroll handler to avoid conflicts with click
                              clearTimeout((window as any).thumbnailScrollTimeout);
                              (window as any).thumbnailScrollTimeout = setTimeout(() => {
                                // Double check click is not in progress
                                if ((window as any).thumbnailClickInProgress) {
                                  return;
                                }

                                const scrollTop = container.scrollTop;
                                const scrollHeight = container.scrollHeight;
                                const clientHeight = container.clientHeight;
                                const itemHeight = 92; // 80px height + 12px gap

                                // Check if scrolled to bottom
                                const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;

                                // Check if scrolled to top
                                const isAtTop = scrollTop < 5;

                                let visibleIndex;
                                if (isAtTop) {
                                  // If at top, select first item
                                  visibleIndex = 0;
                                } else if (isAtBottom) {
                                  // If at bottom, select last item
                                  visibleIndex = mediaItems.length - 1;
                                } else {
                                  // Calculate middle visible item with better accuracy
                                  const scrollCenter = scrollTop + (clientHeight / 2);
                                  visibleIndex = Math.min(
                                    Math.max(0, Math.round(scrollCenter / itemHeight)),
                                    mediaItems.length - 1
                                  );
                                }

                                // Auto-select item based on scroll position only if not manually clicked
                                if (mediaItems[visibleIndex] && visibleIndex !== currentImageIndex) {
                                  setCurrentImageIndex(visibleIndex);
                                }
                              }, 150); // 150ms debounce
                            }}
                          >
                            {mediaItems.map((item: any, index: number) => (
                              <button
                                key={`thumb-${index}`}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  // Set flag to prevent scroll handler from interfering
                                  (window as any).thumbnailClickInProgress = true;

                                  // Immediately set the selected item
                                  setCurrentImageIndex(index);

                                  // Center the clicked thumbnail in view
                                  const container = document.getElementById('thumbnail-container');
                                  if (container) {
                                    const itemHeight = 92; // 80px height + 12px gap
                                    const containerHeight = container.clientHeight;
                                    const scrollPosition = (index * itemHeight) - (containerHeight / 2) + (itemHeight / 2);

                                    // Ensure scroll position is within valid range
                                    const maxScroll = container.scrollHeight - container.clientHeight;
                                    const targetScroll = Math.max(0, Math.min(scrollPosition, maxScroll));

                                    // Use setTimeout to ensure state update happens first
                                    setTimeout(() => {
                                      container.scrollTo({
                                        top: targetScroll,
                                        behavior: 'smooth'
                                      });

                                      // Clear the flag after scroll animation completes
                                      setTimeout(() => {
                                        (window as any).thumbnailClickInProgress = false;
                                      }, 500);
                                    }, 0);
                                  } else {
                                    // Clear flag if no container found
                                    setTimeout(() => {
                                      (window as any).thumbnailClickInProgress = false;
                                    }, 100);
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
                                  {item.type === 'video' ? (
                                    <div className="relative w-full h-full">
                                      <video
                                        src={item.url}
                                        className="w-full h-full object-cover rounded-lg"
                                        muted
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                        </svg>
                                      </div>
                                    </div>
                                  ) : (
                                    <img
                                      src={item.url}
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
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Navigation Arrows */}
                        {mediaItems.length > 3 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();

                                // Set flag to prevent scroll handler interference
                                (window as any).thumbnailClickInProgress = true;

                                // Circular navigation - if on first item, go to last
                                const prevIndex = currentImageIndex <= 0 ? mediaItems.length - 1 : currentImageIndex - 1;
                                setCurrentImageIndex(prevIndex);

                                const container = document.getElementById('thumbnail-container');
                                if (container) {
                                  if (currentImageIndex <= 0) {
                                    // Going to last item - scroll to bottom
                                    container.scrollTo({
                                      top: container.scrollHeight,
                                      behavior: 'smooth'
                                    });
                                  } else {
                                    container.scrollTo({
                                      top: prevIndex * 92,
                                      behavior: 'smooth'
                                    });
                                  }

                                  // Clear flag after animation
                                  setTimeout(() => {
                                    (window as any).thumbnailClickInProgress = false;
                                  }, 500);
                                } else {
                                  setTimeout(() => {
                                    (window as any).thumbnailClickInProgress = false;
                                  }, 100);
                                }
                              }}
                              className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 z-10 hover:bg-white cursor-pointer"
                            >
                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7-7" />
                              </svg>
                            </button>

                            <button
                              onClick={(e) => {
                                e.preventDefault();

                                // Set flag to prevent scroll handler interference
                                (window as any).thumbnailClickInProgress = true;

                                // Circular navigation - if on last item, go to first
                                const nextIndex = currentImageIndex >= mediaItems.length - 1 ? 0 : currentImageIndex + 1;
                                const container = document.getElementById('thumbnail-container');

                                if (container) {
                                  if (currentImageIndex >= mediaItems.length - 1) {
                                    // Going to first item - scroll to top
                                    container.scrollTo({
                                      top: 0,
                                      behavior: 'smooth'
                                    });
                                  } else if (nextIndex === mediaItems.length - 1) {
                                    // Going to last item - scroll to bottom
                                    container.scrollTo({
                                      top: container.scrollHeight,
                                      behavior: 'smooth'
                                    });
                                  } else {
                                    container.scrollTo({
                                      top: nextIndex * 92,
                                      behavior: 'smooth'
                                    });
                                  }

                                  // Set item after a small delay to sync with scroll
                                  setTimeout(() => {
                                    setCurrentImageIndex(nextIndex);

                                    // Clear flag after complete
                                    setTimeout(() => {
                                      (window as any).thumbnailClickInProgress = false;
                                    }, 400);
                                  }, 100);
                                } else {
                                  setCurrentImageIndex(nextIndex);
                                  setTimeout(() => {
                                    (window as any).thumbnailClickInProgress = false;
                                  }, 100);
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
                              height: `${Math.min(100, (3 / mediaItems.length) * 100)}%`,
                              transform: `translateY(${(currentImageIndex / Math.max(1, mediaItems.length - 3)) * (64 - Math.min(64, (3 / mediaItems.length) * 64))}px)`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Main Display - Image or Video */}
                    <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-lg relative group" style={{ aspectRatio: '1/1', minHeight: '300px', height: '400px' }}>
                      <div className="w-full h-full flex items-center justify-center p-2">
                        {mediaItems.length > 0 && mediaItems[currentImageIndex]?.type === 'video' ? (
                          <video
                            src={mediaItems[currentImageIndex].url}
                            controls
                            preload="metadata"
                            className="w-full h-full object-contain rounded-2xl"
                            style={{ maxHeight: '100%' }}
                          >
                            <source src={mediaItems[currentImageIndex].url} type="video/mp4" />
                            <source src={mediaItems[currentImageIndex].url} type="video/webm" />
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <img
                            src={mediaItems.length > 0 ? mediaItems[currentImageIndex]?.url : 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600&q=80'}
                            alt={combo.name}
                            className="w-full h-full object-contain rounded-2xl group-hover:scale-110 cursor-zoom-in"
                            onClick={(e) => {
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4';
                              modal.onclick = () => modal.remove();

                              const img = document.createElement('img');
                              img.src = mediaItems.length > 0 ? mediaItems[currentImageIndex]?.url : combo.imageUrl;
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
                        )}
                      </div>

                      {/* Zoom Hint - Only for images */}
                      {mediaItems.length > 0 && mediaItems[currentImageIndex]?.type !== 'video' && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to zoom
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Media Count Indicator */}
                  {mediaItems.length > 1 && (
                    <div className="text-center text-sm text-gray-500">
                      {currentImageIndex + 1} of {mediaItems.length} {mediaItems[currentImageIndex]?.type === 'video' ? 'video' : 'image'}
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
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 mb-6">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-purple-900 mb-1">Included Products</p>
                    <h3 className="text-2xl font-bold text-purple-700">
                      {products.length} Product{products.length !== 1 ? 's' : ''} in this Combo
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {products.map((product: any, index: number) => {
                      const productImage = (() => {
                        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                          return product.images[0].url || product.images[0].imageUrl || product.imageUrl;
                        }
                        return product.imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80';
                      })();

                      const productShades = productShadesData[product.id] || [];
                      const hasShades = productShades.length > 0;
                      const selectedCount = selectedShades[product.id]?.split(', ').length || 0;

                      return (
                        <div key={index} className="flex items-center gap-2 bg-white rounded-lg border border-purple-100 hover:border-purple-300 p-2 transition-all group">
                          {/* Product Image */}
                          <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden">
                            <img src={productImage} alt={product.name} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" />
                          </div>

                          {/* Product Info and Shade Button in Same Row */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{product.name}</h4>
                              {hasShades && (
                                <div className="mt-1 flex gap-1 items-center">
                                  <span className="text-xs text-gray-500">{productShades.length} shades</span>
                                  <div className="flex gap-0.5">
                                    {productShades.slice(0, 4).map((shade: any) => (
                                      <div key={shade.id} className="relative" title={shade.name}>
                                        {shade.imageUrl ? (
                                          <img src={shade.imageUrl} alt={shade.name} className="w-4 h-4 rounded-full border border-gray-300 object-cover" />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: shade.colorCode || getShadeColor(shade.name) }} />
                                        )}
                                      </div>
                                    ))}
                                    {productShades.length > 4 && (
                                      <div className="w-4 h-4 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-[7px] font-bold text-purple-700">+{productShades.length - 4}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Shade Selection Button - Inline with Product Name */}
                            {hasShades && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShadeSelectorOpen(product.id);
                                }}
                                className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all flex flex-col items-center gap-1 shadow-md hover:shadow-lg ${
                                  selectedShades[product.id]
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                                    : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600'
                                }`}
                              >
                                <Palette className="w-4 h-4" />
                                {selectedShades[product.id] ? (
                                  <>
                                    <span className="text-[9px] whitespace-nowrap">{selectedCount} selected</span>
                                    <Check className="w-3 h-3" />
                                  </>
                                ) : (
                                  <span className="text-[9px] whitespace-nowrap">Select</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {products.map((product: any) => {
                    const productShades = productShadesData[product.id] || [];
                    if (productShades.length === 0) return null;

                    return (
                      <ShadeSelectorSheet key={`shade-sheet-${product.id}`} product={product} shades={productShades} selectedShade={selectedShades[product.id] || null} isOpen={shadeSelectorOpen === product.id} onClose={() => setShadeSelectorOpen(null)} onShadeSelect={(shade) => handleShadeChange(product.id, shade)} />
                    );
                  })}
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

             

              {/* Cashback Badge */}
              {combo.cashbackPercentage && combo.cashbackPrice && (
                <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-orange-700">Get Cashback</span>
                      <p className="text-xs text-orange-600 mt-1">Earn on this purchase</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-orange-600">
                        ₹{Number(combo.cashbackPrice).toFixed(2)}
                      </span>
                      <span className="text-sm bg-orange-200 text-orange-800 px-3 py-1 rounded-full font-semibold">
                        {combo.cashbackPercentage}% Cashback
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Shade Selection Warning */}
              {(() => {
                const productsWithShades = products.filter((product: any) => {
                  const productShades = productShadesData[product.id] || [];
                  return productShades.length > 0;
                });

                const unselectedProducts = productsWithShades.filter((product: any) => {
                  return !selectedShades[product.id] || selectedShades[product.id].trim() === '';
                });

                if (unselectedProducts.length > 0) {
                  return (
                    <div className="mb-4 bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-sm font-bold">!</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-orange-800 mb-1">Shade Selection Required</p>
                          <p className="text-xs text-orange-700">
                            Please select shades for: {unselectedProducts.map((p: any) => p.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Actions */}
              <div className="flex space-x-4 mb-6">
                <Button 
                  size="lg" 
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" 
                  onClick={addToCart}
                  disabled={(() => {
                    const productsWithShades = products.filter((product: any) => {
                      const productShades = productShadesData[product.id] || [];
                      return productShades.length > 0;
                    });
                    const unselectedProducts = productsWithShades.filter((product: any) => {
                      return !selectedShades[product.id] || selectedShades[product.id].trim() === '';
                    });
                    return unselectedProducts.length > 0;
                  })()}
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
        <div className="mb-8 sm:mb-12 md:mb-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/70 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-1 sm:p-1.5 md:p-2 shadow-lg border border-white/20 mb-6 sm:mb-8 gap-0.5 sm:gap-1">
              <TabsTrigger 
                value="description" 
                className="py-2.5 px-1 sm:py-3 sm:px-2 md:py-4 md:px-6 text-[10px] sm:text-xs md:text-sm font-medium rounded-md sm:rounded-lg md:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                Description
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="py-2.5 px-1 sm:py-3 sm:px-2 md:py-4 md:px-6 text-[10px] sm:text-xs md:text-sm font-medium rounded-md sm:rounded-lg md:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                Products
              </TabsTrigger>
              <TabsTrigger 
                value="benefits" 
                className="py-2.5 px-1 sm:py-3 sm:px-2 md:py-4 md:px-6 text-[10px] sm:text-xs md:text-sm font-medium rounded-md sm:rounded-lg md:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                Benefits
              </TabsTrigger>
              <TabsTrigger 
                value="howto" 
                className="py-2.5 px-1 sm:py-3 sm:px-2 md:py-4 md:px-6 text-[10px] sm:text-xs md:text-sm font-medium rounded-md sm:rounded-lg md:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                How to Use
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="m-0">
              <Card className="border-0 shadow-xl sm:shadow-2xl bg-gradient-to-br from-blue-50/80 to-white/80 backdrop-blur-md rounded-xl sm:rounded-3xl border border-white/20">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full"></div>
                    </div>
                    Product Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="prose prose-gray max-w-none">
                    { (combo.detailedDescription || combo.description) ? (
                      typeof (combo.detailedDescription || combo.description) === 'string' && (combo.detailedDescription || combo.description).includes('<') ? (
                        <div
                          className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                          dangerouslySetInnerHTML={{ __html: combo.detailedDescription || combo.description }}
                        />
                      ) : (
                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal whitespace-pre-line">{combo.detailedDescription || combo.description}</p>
                      )
                    ) : (
                      <div className="text-center py-8 sm:py-12">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-300 to-indigo-300 rounded-xl sm:rounded-2xl"></div>
                        </div>
                        <p className="text-gray-500 text-lg sm:text-xl font-normal">No detailed description available.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="m-0">
              <Card className="border-0 shadow-xl sm:shadow-2xl bg-gradient-to-br from-green-50/80 to-white/80 backdrop-blur-md rounded-xl sm:rounded-3xl border border-white/20">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full"></div>
                    </div>
                    Products Included
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {combo.productsIncluded ? (
                    typeof combo.productsIncluded === 'string' && combo.productsIncluded.includes('<') ? (
                      <div
                        className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ __html: combo.productsIncluded }}
                      />
                    ) : (
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal">{combo.productsIncluded}</p>
                      </div>
                    )
                  ) : Array.isArray(products) && products.length > 0 ? (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-purple-900 mb-1">Included Products</p>
                        <h3 className="text-2xl font-bold text-purple-700">
                          {products.length} Product{products.length !== 1 ? 's' : ''} in this Combo
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {products.map((product: any, index: number) => {
                          const productImage = (() => {
                            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                              return product.images[0].url || product.images[0].imageUrl || product.imageUrl;
                            }
                            return product.imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80';
                          })();

                          const productShades = productShadesData[product.id] || [];
                          const hasShades = productShades.length > 0;
                          const selectedCount = selectedShades[product.id]?.split(', ').length || 0;

                          return (
                            <div key={index} className="flex items-center gap-2 bg-white rounded-lg border border-purple-100 hover:border-purple-300 p-2 transition-all group">
                              <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden">
                                <img src={productImage} alt={product.name} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" />
                              </div>

                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{product.name}</h4>
                                  {hasShades && (
                                    <div className="mt-1 flex gap-1 items-center">
                                      <span className="text-xs text-gray-500">{productShades.length} shades</span>
                                      <div className="flex gap-0.5">
                                        {productShades.slice(0, 4).map((shade: any) => (
                                          <div key={shade.id} className="relative" title={shade.name}>
                                            {shade.imageUrl ? (
                                              <img src={shade.imageUrl} alt={shade.name} className="w-4 h-4 rounded-full border border-gray-300 object-cover" />
                                            ) : (
                                              <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: shade.colorCode || getShadeColor(shade.name) }} />
                                            )}
                                          </div>
                                        ))}
                                        {productShades.length > 4 && (
                                          <div className="w-4 h-4 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-[7px] font-bold text-purple-700">+{productShades.length - 4}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {hasShades && (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShadeSelectorOpen(product.id); }} className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all flex flex-col items-center gap-1 shadow-md hover:shadow-lg ${selectedShades[product.id] ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'}`}>
                                    <Palette className="w-4 h-4" />
                                    {selectedShades[product.id] ? (<><span className="text-[9px] whitespace-nowrap">{selectedCount} selected</span><Check className="w-3 h-3" /></>) : (<span className="text-[9px] whitespace-nowrap">Select</span>)}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {products.map((product: any) => {
                        const productShades = productShadesData[product.id] || [];
                        if (productShades.length === 0) return null;

                        return (
                          <ShadeSelectorSheet key={`shade-sheet-${product.id}`} product={product} shades={productShades} selectedShade={selectedShades[product.id] || null} isOpen={shadeSelectorOpen === product.id} onClose={() => setShadeSelectorOpen(null)} onShadeSelect={(shade) => handleShadeChange(product.id, shade)} />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-300 to-emerald-300 rounded-xl sm:rounded-2xl"></div>
                      </div>
                      <p className="text-gray-500 text-lg sm:text-xl font-normal">This combo contains carefully selected premium beauty products.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="benefits" className="m-0">
              <Card className="border-0 shadow-xl sm:shadow-2xl bg-gradient-to-br from-yellow-50/80 to-white/80 backdrop-blur-md rounded-xl sm:rounded-3xl border border-white/20">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full"></div>
                    </div>
                    Key Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {combo.benefits ? (
                    typeof combo.benefits === 'string' && combo.benefits.includes('<') ? (
                      <div
                        className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ __html: combo.benefits }}
                      />
                    ) : (
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal">{combo.benefits}</p>
                      </div>
                    )
                  ) : (
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal">Complete beauty routine in one combo. Save ₹{(originalPrice - price).toLocaleString()} with this bundle. Get {discountPercentage}% discount on the original price. Premium quality products at discounted price. {Array.isArray(products) ? `Includes ${products.length} carefully curated products` : ''}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="howto" className="m-0">
              <Card className="border-0 shadow-xl sm:shadow-2xl bg-gradient-to-br from-purple-50/80 to-white/80 backdrop-blur-md rounded-xl sm:rounded-3xl border border-white/20">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full"></div>
                    </div>
                    How to Use
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {combo.howToUse ? (
                    typeof combo.howToUse === 'string' && combo.howToUse.includes('<') ? (
                      <div
                        className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ __html: combo.howToUse }}
                      />
                    ) : (
                      <div className="prose prose-gray max-w-none bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border border-purple-100/50">
                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal mb-0 whitespace-pre-line">{combo.howToUse}</p>
                      </div>
                    )
                  ) : (
                    <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border border-purple-100/50">
                      <div className="text-gray-700 leading-relaxed text-base sm:text-lg space-y-3 sm:space-y-4">
                        <p className="font-normal">
                          Follow the individual product instructions included in this combo for best results.
                          Use as part of your daily beauty routine.
                        </p>
                        {Array.isArray(products) && products.length > 0 && (
                          <div className="mt-4">
                            <p className="font-semibold text-lg mb-3">Usage Steps:</p>
                            <ol className="list-decimal list-inside space-y-2.5">
                              {products.map((product: any, index: number) => (
                                <li key={index} className="font-normal">
                                  Use {typeof product === 'string' ? product : product.name} as directed
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        <p className="mt-4 text-sm text-gray-600 font-normal">
                          For best results, use all products in the combo together as part of your daily routine.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Customer Reviews Section */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold">Customer Reviews</h2>
            {canReview.canReview && (
              <Button
                onClick={() => setShowReviewDialog(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Write a Review
              </Button>
            )}
          </div>
          {!canReview.canReview && canReview.message && (
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-4 text-center">
              <p className="text-gray-600">{canReview.message}</p>
            </div>
          )}
          <p className="text-center text-gray-600 mb-8">What our customers are saying</p>

          <div className="bg-yellow-50 rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="flex">
                {renderStars(parseFloat(averageRating))}
              </div>
              <span className="text-4xl font-bold">{averageRating}</span>
            </div>
            <p className="text-center text-gray-600">
              Based on {Array.isArray(reviews) ? reviews.length : 0} {Array.isArray(reviews) && reviews.length === 1 ? 'review' : 'reviews'}
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
            ) : !Array.isArray(reviews) || reviews.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center">
                <p className="text-gray-600 mb-4">No reviews yet. Be the first to review this combo!</p>
                {canReview.canReview && (
                  <Button
                    onClick={() => setShowReviewDialog(true)}
                    variant="outline"
                    className="border-2 border-purple-200 hover:border-purple-400"
                  >
                    Write the First Review
                  </Button>
                )}
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