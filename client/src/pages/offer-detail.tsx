import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ChevronRight, ShoppingCart, ArrowLeft, Share2, Tag, Clock, Check, Sparkles, Palette, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Offer {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  bannerImageUrl?: string;
  price?: number;
  originalPrice?: number;
  discountType?: 'percentage' | 'flat' | 'none';
  discountValue?: number;
  discountPercentage?: number;
  discountText?: string;
  cashbackPercentage?: number;
  cashbackPrice?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  linkUrl?: string;
  buttonText?: string;
  productId?: number;
  productIds?: number[];
  products?: any[];
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  originalPrice?: string;
  imageUrl: string;
}

interface Shade {
  id: number;
  name: string;
  colorCode?: string;
  imageUrl?: string;
}

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

// Product List Item Component
function ProductListItem({
  product,
  productShades,
  selectedShade,
  onShadeChange,
  onOpenShadeSelector,
}: {
  product: any;
  productShades: Shade[];
  selectedShade: string | null;
  onShadeChange: (shade: string | null) => void;
  onOpenShadeSelector: () => void;
}) {
  const hasShades = productShades.length > 0;

  // Get product image - handle both images array and imageUrl
  const productImage = (() => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0].url || product.images[0].imageUrl || product.imageUrl;
    }
    return product.imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80';
  })();

  return (
    <div className="bg-white rounded-xl border-2 border-purple-100 overflow-hidden hover:shadow-lg hover:border-purple-300 transition-all duration-300">
      <div className="flex flex-col gap-4 p-4">
        {/* Product Image and Name Section */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Product Image */}
          <div className="w-full sm:w-32 h-32 flex-shrink-0">
            <div className="relative w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden">
              <img
                src={productImage}
                alt={product.name}
                className="w-full h-full object-contain hover:scale-110 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="text-base font-bold text-gray-900 line-clamp-2">{product.name}</h3>

            {/* Price Display */}
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-green-600">₹{product.price}</span>
              {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                <>
                  <span className="text-sm text-gray-500 line-through">₹{product.originalPrice}</span>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    {Math.round(((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100)}% OFF
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Shade Selection Button - Below Image */}
        {hasShades ? (
          <div className="space-y-3">
            {/* Available Shades Preview */}
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Available Shades ({productShades.length}):
              </p>
              <div className="grid grid-cols-6 gap-2">
                {productShades.slice(0, 6).map((shade) => (
                  <div
                    key={shade.id}
                    className="group relative cursor-pointer"
                    title={shade.name}
                  >
                    {shade.imageUrl ? (
                      <img
                        src={shade.imageUrl}
                        alt={shade.name}
                        className="w-full aspect-square rounded-lg object-cover border-2 border-gray-200 hover:border-purple-400 hover:scale-105 transition-all shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:scale-105 transition-all shadow-sm"
                        style={{ backgroundColor: shade.colorCode || getShadeColor(shade.name) }}
                      />
                    )}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {shade.name}
                    </div>
                  </div>
                ))}
                {productShades.length > 6 && (
                  <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-200 flex items-center justify-center text-xs font-bold text-purple-700">
                    +{productShades.length - 6}
                  </div>
                )}
              </div>
            </div>

            {/* Select Shades Button */}
            <button
              onClick={onOpenShadeSelector}
              className={`w-full rounded-xl px-6 py-3 text-center font-bold text-base transition-all flex items-center justify-center gap-2 ${
                selectedShade
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-pink-700'
                  : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-600'
              }`}
            >
              <Palette className="w-5 h-5" />
              {selectedShade ? (
                <span>{selectedShade.split(', ').length} Shade{selectedShade.split(', ').length !== 1 ? 's' : ''} Selected</span>
              ) : (
                <span>Select Shades</span>
              )}
              {selectedShade && <Check className="w-5 h-5" />}
            </button>
          </div>
        ) : (
          <Button
            className="w-full rounded-xl px-6 py-3 text-center font-bold text-base bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>No Shades Required</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// Shade Selector Sheet Component
function ShadeSelectorSheet({
  product,
  shades,
  selectedShade,
  isOpen,
  onClose,
  onShadeSelect,
}: {
  product: Product;
  shades: Shade[];
  selectedShade: string | null;
  isOpen: boolean;
  onClose: () => void;
  onShadeSelect: (shade: string) => void;
}) {
  const [selectedShades, setSelectedShades] = React.useState<Set<string>>(new Set(selectedShade ? [selectedShade] : []));

  React.useEffect(() => {
    setSelectedShades(new Set(selectedShade ? [selectedShade] : []));
  }, [selectedShade, isOpen]);

  const handleSelectAll = () => {
    setSelectedShades(new Set(shades.map(s => s.name)));
  };

  const handleClearAll = () => {
    setSelectedShades(new Set());
  };

  const handleShadeToggle = (shadeName: string) => {
    const newSelection = new Set(selectedShades);
    if (newSelection.has(shadeName)) {
      newSelection.delete(shadeName);
    } else {
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
              <SheetTitle className="text-2xl font-bold text-gray-900">Select Your Shades</SheetTitle>
              <SheetDescription className="text-gray-600 mt-1">
                Choose from {shades.length} beautiful shades for {product.name}
              </SheetDescription>
              {selectedShades.size > 0 && (
                <div className="mt-2 text-sm font-semibold text-purple-600">
                  {selectedShades.size} shade{selectedShades.size !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
            <Palette className="w-8 h-8 text-purple-600 flex-shrink-0" />
          </div>
          
          {/* Select All / Clear All Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              Select All Product Shades
            </Button>
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={selectedShades.size === 0}
            >
              Clear All
            </Button>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-180px)] pb-4 -mx-6 px-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {shades.map((shade) => {
              const isSelected = selectedShades.has(shade.name);
              return (
                <button
                  key={shade.id}
                  onClick={() => handleShadeToggle(shade.name)}
                  className={`group flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg scale-105 ring-2 ring-purple-300'
                      : 'border-gray-200 hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 hover:shadow-md hover:scale-102'
                  }`}
                >
                  <div className="relative">
                    {shade.imageUrl ? (
                      <img
                        src={shade.imageUrl}
                        alt={shade.name}
                        className={`w-16 h-16 rounded-xl shadow-md border-4 border-white object-cover transition-transform ${
                          isSelected ? 'scale-110' : 'group-hover:scale-105'
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-xl shadow-md border-4 border-white transition-transform ${
                          isSelected ? 'scale-110' : 'group-hover:scale-105'
                        }`}
                        style={{
                          backgroundColor: shade.colorCode || getShadeColor(shade.name)
                        }}
                      />
                    )}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-semibold text-center line-clamp-2 capitalize transition-colors ${
                    isSelected ? 'text-purple-700' : 'text-gray-700 group-hover:text-purple-600'
                  }`}>
                    {shade.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Shades Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="font-semibold">
              {selectedShades.size > 0 
                ? `${selectedShades.size} shade${selectedShades.size !== 1 ? 's' : ''} selected`
                : 'Select at least 1 shade'}
            </span>
          </div>
          <Button
            onClick={handleConfirm}
            variant="secondary"
            size="sm"
            disabled={selectedShades.size === 0}
            className="bg-white text-purple-700 hover:bg-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedShades.size > 0 ? 'Confirm Selection' : 'Select Shades'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Products List Component
function ProductsList({
  productIds,
  productShadesData,
  selectedShades,
  onShadeChange,
  offerProducts,
}: {
  productIds: number[];
  productShadesData: Record<number, Shade[]>;
  selectedShades: Record<number, string | null>;
  onShadeChange: (productId: number, shade: string | null) => void;
  offerProducts?: any[];
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shadeSelectorOpen, setShadeSelectorOpen] = useState<number | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        if (offerProducts && offerProducts.length > 0) {
          setProducts(offerProducts);
          setLoading(false);
          return;
        }

        const productPromises = productIds.map(async (productId) => {
          const response = await fetch(`/api/products/${productId}`);
          if (!response.ok) return null;
          return await response.json();
        });

        const loadedProducts = await Promise.all(productPromises);
        setProducts(loadedProducts.filter((p): p is Product => p !== null));
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [productIds, offerProducts]);

  if (loading) {
    return (
      <div className="space-y-3">
        {productIds.map((id) => (
          <Skeleton key={id} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {products.map((product) => (
          <ProductListItem
            key={product.id}
            product={product}
            productShades={productShadesData[product.id] || []}
            selectedShade={selectedShades[product.id] || null}
            onShadeChange={(shade) => onShadeChange(product.id, shade)}
            onOpenShadeSelector={() => setShadeSelectorOpen(product.id)}
          />
        ))}
      </div>

      {products.map((product) => (
        <React.Fragment key={`shade-selector-wrapper-${product.id}`}>
          <button
            id={`shade-selector-${product.id}`}
            onClick={() => setShadeSelectorOpen(product.id)}
            style={{ display: 'none' }}
          />
          <ShadeSelectorSheet
            product={product}
            shades={productShadesData[product.id] || []}
            selectedShade={selectedShades[product.id] || null}
            isOpen={shadeSelectorOpen === product.id}
            onClose={() => setShadeSelectorOpen(null)}
            onShadeSelect={(shade) => onShadeChange(product.id, shade)}
          />
        </React.Fragment>
      ))}
    </>
  );
}

async function fetchProductDetailsAndShades(productIds: number[]) {
  const productShadesPromises = productIds.map(id =>
    fetch(`/api/products/${id}/shades`)
      .then(res => res.ok ? res.json().then(shades => ({ id, shades })) : Promise.resolve({ id, shades: [] }))
  );
  const shadesData = await Promise.all(productShadesPromises);

  const productShadesMap: Record<number, Shade[]> = {};
  shadesData.forEach(({ id, shades }) => {
    productShadesMap[id] = shades || [];
  });

  return productShadesMap;
}

export default function OfferDetail() {
  const [, params] = useRoute("/offer/:id");
  const offerId = params?.id || "";
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [productShadesData, setProductShadesData] = useState<Record<number, Shade[]>>({});
  const [selectedShades, setSelectedShades] = useState<Record<number, string | null>>({});
  const [shadeSelectorOpen, setShadeSelectorOpen] = useState<number | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: "",
    comment: "",
    userName: "",
  });
  const [canReview, setCanReview] = useState<{ canReview: boolean; orderId?: number; message: string }>({ canReview: false, message: "" });
  const { toast } = useToast();

  const { data: offer, isLoading, error } = useQuery<any>({
    queryKey: [`/api/offers/${offerId}`],
    enabled: !!offerId,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: [`/api/offers/${offerId}/reviews`],
    enabled: !!offerId,
  });

  // Check if user can review this offer
  const { data: reviewEligibility } = useQuery({
    queryKey: [`/api/offers/${offerId}/can-review`],
    queryFn: async () => {
      if (!offerId) return { canReview: false, message: "" };

      const user = localStorage.getItem("user");
      if (!user) return { canReview: false, message: "Please login to review" };

      const userData = JSON.parse(user);
      const response = await fetch(`/api/offers/${offerId}/can-review?userId=${userData.id}`);
      if (!response.ok) {
        return { canReview: false, message: "Unable to check review eligibility" };
      }
      return response.json();
    },
    enabled: !!offerId,
  });

  // Update canReview state when eligibility data changes
  useEffect(() => {
    if (reviewEligibility && typeof reviewEligibility === 'object') {
      setCanReview(reviewEligibility);
    }
  }, [reviewEligibility]);

  useEffect(() => {
    if (offer?.productIds && offer.productIds.length > 0) {
      fetchProductDetailsAndShades(offer.productIds)
        .then((productShadesMap) => {
          setProductShadesData(productShadesMap);
        })
        .catch(err => {
          console.error("Error fetching product shades:", err);
        });
    }
  }, [offer?.productIds]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateRef = urlParams.get('ref');

    if (affiliateRef && offer?.id) {
      fetch('/api/affiliate/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliateCode: affiliateRef,
          offerId: offer.id,
        }),
      }).catch(err => console.error('Error tracking affiliate click:', err));

      localStorage.setItem('affiliateRef', affiliateRef);
    }
  }, [offer?.id]);

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out this amazing offer: ${offer?.title}`;

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
          description: "Offer link has been copied to clipboard",
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
        description: canReview.message || "You must purchase this offer to leave a review",
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
      const response = await fetch(`/api/offers/${offerId}/reviews`, {
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

  const handleShadeChange = (productId: number, shade: string | null) => {
    setSelectedShades(prev => ({
      ...prev,
      [productId]: shade
    }));
  };

  const handleAddAllToCart = async () => {
    if (!offer || isExpired) return;

    const productIds = offer.productIds || [];
    const offerProducts = offer.products || [];

    const productsWithShades = productIds.filter(id => productShadesData[id]?.length > 0);
    const missingShades = productsWithShades.filter(id => !selectedShades[id]);

    if (missingShades.length > 0) {
      toast({
        title: "Please Select Shades",
        description: "Please select shades for all products before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");

      let totalOriginalPrice = 0;
      let totalOfferPrice = 0;
      let totalDiscountAmount = 0;
      const productNames: string[] = [];
      const productImages: string[] = [];
      const selectedShadesInfo: any[] = [];

      if (offer.price && offer.originalPrice) {
        totalOfferPrice = parseFloat(offer.price);
        totalOriginalPrice = parseFloat(offer.originalPrice);
        totalDiscountAmount = totalOriginalPrice - totalOfferPrice;
      } else {
        for (const productId of productIds) {
          let product = offerProducts.find((p: any) => p.id === productId);

          if (!product) {
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) continue;
            product = await response.json();
          }

          const originalPrice = parseFloat(product.originalPrice || product.price);

          let finalPrice = originalPrice;
          let discountAmount = 0;

          if (product.offerPrice) {
            finalPrice = parseFloat(product.offerPrice);
            discountAmount = parseFloat(product.discountAmount || '0');
          } else if (offer.discountType === 'percentage' && offer.discountValue) {
            discountAmount = (originalPrice * parseFloat(offer.discountValue)) / 100;
            finalPrice = originalPrice - discountAmount;
          } else if (offer.discountType === 'flat' && offer.discountValue) {
            discountAmount = parseFloat(offer.discountValue);
            finalPrice = Math.max(0, originalPrice - discountAmount);
          }

          totalOriginalPrice += originalPrice;
          totalOfferPrice += finalPrice;
          totalDiscountAmount += discountAmount;
        }
      }

      for (const productId of productIds) {
        let product = offerProducts.find((p: any) => p.id === productId);

        if (!product) {
          const response = await fetch(`/api/products/${productId}`);
          if (!response.ok) continue;
          product = await response.json();
        }

        const selectedShade = selectedShades[productId] || null;

        productNames.push(selectedShade ? `${product.name} (${selectedShade})` : product.name);
        productImages.push(product.imageUrl || offer.imageUrl);

        if (selectedShade) {
          selectedShadesInfo.push({
            productId: product.id,
            productName: product.name,
            shadeName: selectedShade
          });
        }
      }

      const offerItemKey = `offer-${offer.id}-${Object.entries(selectedShades).map(([id, shade]) => `${id}-${shade}`).join('-')}`;
      const existingOfferItem = cart.find((cartItem: any) => cartItem.itemKey === offerItemKey);

      if (existingOfferItem) {
        existingOfferItem.quantity += 1;
      } else {
        cart.push({
          id: offer.id,
          itemKey: offerItemKey,
          name: offer.title,
          price: `₹${totalOfferPrice.toFixed(2)}`,
          originalPrice: `₹${totalOriginalPrice.toFixed(2)}`,
          image: offer.imageUrl,
          quantity: 1,
          inStock: true,
          isOfferItem: true,
          offerId: offer.id,
          offerTitle: offer.title,
          discountType: offer.discountType,
          discountAmount: totalDiscountAmount,
          discountValue: offer.discountValue || 0,
          cashbackPercentage: offer.cashbackPercentage || null,
          cashbackPrice: offer.cashbackPrice || null,
          productIds: productIds,
          productNames: productNames,
          productImages: productImages,
          selectedShades: selectedShadesInfo,
          totalProducts: productIds.length,
        });
      }

      localStorage.setItem("cart", JSON.stringify(cart));
      localStorage.setItem("cartCount", cart.reduce((total: number, item: any) => total + item.quantity, 0).toString());
      window.dispatchEvent(new Event("cartUpdated"));

      toast({
        title: "Added to Cart! 🎉",
        description: `${productIds.length} product(s) from "${offer.title}" added with ₹${totalDiscountAmount.toFixed(2)} discount`,
      });

      setSelectedShades({});
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add products to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!offer || error) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-lg shadow-lg p-12 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Offer Not Found</h1>
            <p className="text-gray-600 mb-8">The offer you're looking for doesn't exist or has expired.</p>
            <Link href="/offers">
              <Button className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Offers
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(offer.validUntil) < new Date();
  const productIds = offer.productIds || [];
  const productsWithShades = productIds.filter(id => productShadesData[id]?.length > 0);
  const allShadesSelected = productsWithShades.every(id => selectedShades[id]);

  const bannerImage = offer.bannerImageUrl || offer.imageUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link href="/offers" className="text-gray-600 hover:text-gray-900">
              Offers
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-900 font-medium line-clamp-1">{offer.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Image */}
          <div>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm sticky top-8">
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={bannerImage}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                />

                {/* Discount Badge */}
                {(offer.discountPercentage || offer.discountText) && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
                    {offer.discountPercentage ? `${offer.discountPercentage}% OFF` : offer.discountText}
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  {isExpired ? (
                    <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Expired
                    </div>
                  ) : (
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Active
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {offer.title}
              </h1>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-sm text-gray-600">(0 reviews)</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">{offer.description}</p>
            </div>

            {/* Product Count - Show product previews */}
            {productIds.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-purple-900 mb-1">Included Products</p>
                  <h3 className="text-2xl font-bold text-purple-700">
                    {productIds.length} Product{productIds.length !== 1 ? 's' : ''} in this Offer
                  </h3>
                </div>

                {/* Product Preview List with Shade Buttons */}
                <div className="space-y-2">
                  {(offer?.products || []).map((product: any, index: number) => {
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
                          <img
                            src={productImage}
                            alt={product.name}
                            className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                          />
                        </div>
                        
                        {/* Product Info and Shade Button in Same Row */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                              {product.name}
                            </h4>
                            {hasShades && (
                              <div className="mt-1 flex gap-1 items-center">
                                <span className="text-xs text-gray-500">{productShades.length} shades</span>
                                <div className="flex gap-0.5">
                                  {productShades.slice(0, 4).map((shade: any) => (
                                    <div
                                      key={shade.id}
                                      className="relative"
                                      title={shade.name}
                                    >
                                      {shade.imageUrl ? (
                                        <img
                                          src={shade.imageUrl}
                                          alt={shade.name}
                                          className="w-4 h-4 rounded-full border border-gray-300 object-cover"
                                        />
                                      ) : (
                                        <div
                                          className="w-4 h-4 rounded-full border border-gray-300"
                                          style={{ backgroundColor: shade.colorCode || getShadeColor(shade.name) }}
                                        />
                                      )}
                                    </div>
                                  ))}
                                  {productShades.length > 4 && (
                                    <div className="w-4 h-4 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-[7px] font-bold text-purple-700">
                                      +{productShades.length - 4}
                                    </div>
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

                {/* Shade Selector Sheets for Products */}
                {(offer?.products || []).map((product: any) => {
                  const productShades = productShadesData[product.id] || [];
                  if (productShades.length === 0) return null;
                  
                  return (
                    <ShadeSelectorSheet
                      key={`shade-sheet-${product.id}`}
                      product={product}
                      shades={productShades}
                      selectedShade={selectedShades[product.id] || null}
                      isOpen={shadeSelectorOpen === product.id}
                      onClose={() => setShadeSelectorOpen(null)}
                      onShadeSelect={(shade) => handleShadeChange(product.id, shade)}
                    />
                  );
                })}
              </div>
            )}

            {/* Price Section */}
            {offer.price && (
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-3xl font-bold text-green-600">
                    ₹{offer.price}
                  </span>
                  {offer.originalPrice && Number(offer.originalPrice) > Number(offer.price) && (
                    <>
                      <span className="text-xl text-gray-500 line-through">₹{offer.originalPrice}</span>
                      <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                        {Math.round(((Number(offer.originalPrice) - Number(offer.price)) / Number(offer.originalPrice)) * 100)}% OFF
                      </span>
                    </>
                  )}
                </div>
                {offer.originalPrice && Number(offer.originalPrice) > Number(offer.price) && (
                  <p className="text-sm text-green-700">
                    You save ₹{(Number(offer.originalPrice) - Number(offer.price)).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Cashback */}
            {offer.cashbackPercentage && offer.cashbackPrice && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-orange-700">Get Cashback</span>
                    <p className="text-xs text-orange-600 mt-1">Earn on this purchase</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-orange-600">
                      ₹{Number(offer.cashbackPrice).toFixed(2)}
                    </span>
                    <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-semibold">
                      {offer.cashbackPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Validity */}
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Valid Until</p>
                <p className="text-sm text-blue-700">
                  {new Date(offer.validUntil).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {/* Add to Cart Button */}
              <Button
                onClick={handleAddAllToCart}
                disabled={isExpired || productsWithShades.some(id => !selectedShades[id])}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {productsWithShades.length > 0 && !allShadesSelected
                  ? 'Select All Shades First'
                  : 'Add All to Cart'}
              </Button>

              {/* Share Button */}
              <Button
                onClick={() => setShowShareDialog(true)}
                variant="outline"
                size="lg"
                className="border-2 border-purple-200 hover:border-purple-400 rounded-xl p-4 transform hover:scale-105 transition-all duration-200"
              >
                <Share2 className="h-5 w-5 text-purple-500" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mb-8 sm:mb-12 md:mb-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-1 sm:p-1.5 md:p-2 shadow-lg border border-white/20 mb-6 sm:mb-8 gap-0.5 sm:gap-1">
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
            </TabsList>

            <TabsContent value="description" className="m-0">
              <Card className="border-0 shadow-xl sm:shadow-2xl bg-gradient-to-br from-blue-50/80 to-white/80 backdrop-blur-md rounded-xl sm:rounded-3xl border border-white/20">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full"></div>
                    </div>
                    Detailed Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="prose prose-gray max-w-none">
                    {offer.detailedDescription ? (
                      <div className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal whitespace-pre-line">
                        {offer.detailedDescription}
                      </div>
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
                  {offer?.productsIncluded ? (
                    <div className="text-gray-700 leading-relaxed text-base sm:text-lg whitespace-pre-line font-normal">
                      {offer.productsIncluded}
                    </div>
                  ) : offer?.products && Array.isArray(offer.products) && offer.products.length > 0 ? (
                    <div className="grid gap-3 sm:gap-4">
                      {offer.products.map((product: any, index: number) => (
                        <div key={index} className="flex items-start p-3 sm:p-4 bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-green-100/50 transform hover:scale-105 transition-all duration-200">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mt-1.5 sm:mt-2 mr-3 sm:mr-4 flex-shrink-0"></div>
                          <span className="text-gray-700 font-normal text-base sm:text-lg">{product.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-300 to-emerald-300 rounded-xl sm:rounded-2xl"></div>
                      </div>
                      <p className="text-gray-500 text-lg sm:text-xl font-normal">This offer contains carefully selected premium products.</p>
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
                  {offer.benefits ? (
                    <div className="grid gap-3 sm:gap-4">
                      {offer.benefits.split('\n').filter(b => b.trim()).map((benefit, index) => (
                        <div key={index} className="flex items-start p-3 sm:p-4 bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-yellow-100/50 transform hover:scale-105 transition-all duration-200">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mt-1.5 sm:mt-2 mr-3 sm:mr-4 flex-shrink-0"></div>
                          <span className="text-gray-700 font-normal text-base sm:text-lg">{benefit.trim()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-300 to-orange-300 rounded-xl sm:rounded-2xl"></div>
                      </div>
                      <p className="text-gray-500 text-lg sm:text-xl font-normal">No benefits information available.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Customer Reviews Section */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 mb-8 sm:mb-12 md:mb-16">
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
                {renderStars(reviews && Array.isArray(reviews) && reviews.length > 0
                  ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
                  : 5)}
              </div>
              <span className="text-4xl font-bold">
                {reviews && Array.isArray(reviews) && reviews.length > 0
                  ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
                  : '5.0'}
              </span>
            </div>
            <p className="text-center text-gray-600">
              Based on {Array.isArray(reviews) ? reviews.length : 0} {Array.isArray(reviews) && reviews.length === 1 ? 'review' : 'reviews'}
            </p>

            <div className="mt-6 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const distribution = calculateRatingDistribution();
                const count = distribution[star - 1];
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
                <p className="text-gray-600 mb-4">No reviews yet. Be the first to review this offer!</p>
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

      {/* Write Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Write a Review
            </DialogTitle>
            <p className="text-gray-600">Share your experience with {offer?.title}</p>
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
                placeholder="Tell us about your experience with this offer"
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