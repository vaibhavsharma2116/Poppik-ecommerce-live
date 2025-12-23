
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ChevronRight, ShoppingCart, ArrowLeft, Share2, Tag, Clock, Check, Sparkles, Palette, Star, Heart } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ProductCard from "@/components/product-card";

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
  bannerImages?: string[];
  detailedDescription?: string;
  productsIncluded?: string;
  benefits?: string;
  affiliateCommission?: number | string;
  affiliate_commission?: number | string;
  affiliateUserDiscount?: number | string;
  affiliate_user_discount?: number | string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  originalPrice?: string;
  imageUrl: string;
  images?: { url?: string; imageUrl?: string }[];
  offerPrice?: string;
  discountAmount?: string;
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

            {/* Select Shade Button */}
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
                <span>Shade Selected: {selectedShade}</span>
              ) : (
                <span>Select Shade</span>
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
    // Disabled for offers - only single shade allowed
    return;
  };

  const handleClearAll = () => {
    setSelectedShades(new Set());
  };

  const handleShadeToggle = (shadeName: string) => {
    // For offers, only allow ONE shade selection
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
                Choose 1 shade from {shades.length} beautiful options for {product.name}
              </SheetDescription>
              {selectedShades.size > 0 && (
                <div className="mt-2 text-sm font-semibold text-purple-600">
                  {selectedShades.size} shade selected
                </div>
              )}
              <div className="mt-2 text-xs font-medium text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                ⚠️ Only 1 shade can be selected per product in this offer
              </div>
            </div>
            <Palette className="w-8 h-8 text-purple-600 flex-shrink-0" />
          </div>

          {/* Clear Selection Button */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={selectedShades.size === 0}
            >
              Clear Selection
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
                ? `1 shade selected`
                : 'Select 1 shade'}
            </span>
          </div>
          <Button
            onClick={handleConfirm}
            variant="secondary"
            size="sm"
            disabled={selectedShades.size === 0}
            className="bg-white text-purple-700 hover:bg-gray-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedShades.size > 0 ? 'Confirm Selection' : 'Select Shade'}
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

async function fetchProductDetailsAndShades(
  productIds: number[],
  allowedShadeIdsByProduct?: Record<string, number[]> | Record<number, number[]> | null
) {
  const allowedMap = (allowedShadeIdsByProduct && typeof allowedShadeIdsByProduct === 'object')
    ? (allowedShadeIdsByProduct as any)
    : null;

  const productShadesPromises = productIds.map((id) =>
    fetch(`/api/products/${id}/shades`)
      .then(res => res.ok ? res.json().then(shades => ({ id, shades })) : Promise.resolve({ id, shades: [] }))
      .then(({ id, shades }) => {
        if (!allowedMap) return { id, shades };

        const allowed = allowedMap[id] ?? allowedMap[String(id)];
        if (!Array.isArray(allowed) || allowed.length === 0) return { id, shades };

        const allowedSet = new Set(allowed.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)));
        const filtered = Array.isArray(shades)
          ? shades.filter((s: any) => allowedSet.has(Number(s?.id)))
          : [];
        return { id, shades: filtered };
      })
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
  const offerId = (params as any)?.id || "";
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [productShadesData, setProductShadesData] = useState<Record<number, Shade[]>>({});
  const [selectedShades, setSelectedShades] = useState<Record<number, string | null>>({});
  const [selectedShadeImages, setSelectedShadeImages] = useState<Record<number, string | null>>({});
  const [shadeSelectorOpen, setShadeSelectorOpen] = useState<number | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: "",
    comment: "",
    userName: "",
  });
  const [canReview, setCanReview] = useState<{ canReview: boolean; orderId?: number; message: string }>({ canReview: false, message: "" });
  const [isInWishlist, setIsInWishlist] = useState(false);

  const { toast } = useToast();

  const { data: offer, isLoading, error } = useQuery<any>({
    queryKey: [`/api/offers/${offerId}`],
    enabled: !!offerId,
  });

  // Set initial selected image to first banner image when offer loads
  useEffect(() => {
    if (!selectedImage) {
      if (offer?.bannerImages && Array.isArray(offer.bannerImages) && offer.bannerImages.length > 0) {
        setSelectedImage(offer.bannerImages[0]);
      } else if (offer?.videoUrl) {
        setSelectedImage(offer.videoUrl);
      } else if (offer?.bannerImageUrl) {
        setSelectedImage(offer.bannerImageUrl);
      } else if (offer?.imageUrl) {
        setSelectedImage(offer.imageUrl);
      }
    }
  }, [offer]);

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
    staleTime: 0,
    refetchOnMount: true,
  });

  // Update canReview state when eligibility data changes
  useEffect(() => {
    if (reviewEligibility && typeof reviewEligibility === 'object') {
      setCanReview(reviewEligibility);
    }
  }, [reviewEligibility]);

  // Validate affiliate code (if present) and track only when applicable to this offer
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    // Support multiple affiliate parameter formats: ref=CODE, CODE (first param as value), or direct parameter
    let affiliateRef = urlParams.get('ref');

    // If no 'ref' parameter, check for direct affiliate code (e.g., ?POPPIKAP12)
    if (!affiliateRef) {
      const searchString = window.location.search.substring(1); // Remove the ?
      if (searchString && /^[A-Z0-9]+/.test(searchString)) {
        affiliateRef = searchString.split('&')[0]; // Get first query param value
      }
    }

    if (!affiliateRef || !offer?.id) return;

    const removeAffiliateRef = () => {
      try {
        localStorage.removeItem('affiliateRef');
      } catch (e) {
        /* ignore */
      }

      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('ref');

        // If the URL used a bare code as the first param (e.g. ?POPPIKAP12), remove it
        const raw = u.search.substring(1); // without '?'
        if (raw && /^[A-Z0-9]+($|&)/.test(raw)) {
          const parts = raw.split('&').slice(1);
          u.search = parts.length ? `?${parts.join('&')}` : '';
        }

        window.history.replaceState({}, '', u.toString());
      } catch (e) {
        // fallback: try to remove query by replacing history with pathname only
        try {
          window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        } catch (err) {
          // ignore
        }
      }
    };

    (async () => {
      try {
        const res = await fetch(`/api/affiliate/validate?code=${encodeURIComponent(affiliateRef)}`);
        if (!res.ok) {
          removeAffiliateRef();
          toast({ title: 'Invalid Affiliate Code', description: 'This affiliate code is invalid or expired.', variant: 'destructive' });
          return;
        }

        const data = await res.json();
        if (!data || !data.valid) {
          removeAffiliateRef();
          toast({ title: 'Invalid Affiliate Code', description: 'This affiliate code is invalid or expired.', variant: 'destructive' });
          return;
        }

        // Determine if this offer/composed products are affiliate-enabled
        const offerCommission = Number(offer?.affiliateCommission ?? offer?.affiliate_commission ?? 0);
        const offerUserDiscount = Number(offer?.affiliateUserDiscount ?? offer?.affiliate_user_discount ?? 0);

        let eligible = offerCommission > 0 && offerUserDiscount > 0;

        // If offer itself doesn't have affiliate fields, check its products
        if (!eligible && Array.isArray(offer?.products) && offer.products.length > 0) {
          eligible = offer.products.some((p: any) => {
            const pc = Number(p?.affiliateCommission ?? p?.affiliate_commission ?? 0);
            const pd = Number(p?.affiliateUserDiscount ?? p?.affiliate_user_discount ?? 0);
            return pc > 0 && pd > 0;
          });
        }

        if (!eligible) {
          removeAffiliateRef();
          toast({ title: 'Not Eligible', description: 'This affiliate code cannot be applied to this offer.', variant: 'destructive' });
          return;
        }

        // Valid and eligible — track and persist
        fetch('/api/affiliate/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ affiliateCode: affiliateRef, offerId: offer.id }),
        }).catch(err => console.error('Error tracking affiliate click:', err));

        try {
          localStorage.setItem('affiliateRef', affiliateRef);
        } catch (e) {
          // ignore localStorage failures
        }
      } catch (err) {
        console.error('Error validating affiliate code:', err);
      }
    })();
  }, [offer?.id, offer?.affiliateCommission, offer?.affiliateUserDiscount, offer?.products, toast]);

  // Load recommended products
  const { data: recommendedProducts = [] } = useQuery<any[]>({
    queryKey: ['/api/products', { limit: 12 }],
  });
  // Check if offer is in wishlist on component mount
  useEffect(() => {
    if (offer?.id) {
      const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      const isInWishlist = wishlist.some((item: any) => item.id === offer.id && item.isOffer);
      setIsInWishlist(isInWishlist);
    }
  }, [offer?.id]);

  const toggleWishlist = () => {
    if (!offer) return;

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
    const existingIndex = wishlist.findIndex((item: any) => item.id === offer.id && item.isOffer);

    if (existingIndex >= 0) {
      wishlist.splice(existingIndex, 1);
      setIsInWishlist(false);
    } else {
      const wishlistItem = {
        id: offer.id,
        name: offer.title.substring(0, 100),
        price: offer.price ? `₹${offer.price}` : undefined,
        originalPrice: offer.originalPrice ? `₹${offer.originalPrice}` : undefined,
        image: offer.imageUrl?.substring(0, 200) || '',
        inStock: true,
        category: 'offer',
        isOffer: true,
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
      if (existingIndex < 0) {
        wishlist.pop();
        setIsInWishlist(false);
      }
      return;
    }
    window.dispatchEvent(new Event("wishlistUpdated"));
  };

  useEffect(() => {
    if (offer?.productIds && offer.productIds.length > 0) {
      const allowed = offer?.productShades || offer?.product_shades || null;
      fetchProductDetailsAndShades(offer.productIds, allowed)
        .then((productShadesMap) => {
          setProductShadesData(productShadesMap);
        })
        .catch(err => {
          console.error("Error fetching product shades:", err);
        });
    }
  }, [offer?.productIds]);

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out this amazing offer: ${offer?.title}`;

    const openExternal = (shareUrl: string) => {
      const w = window.open(shareUrl, '_blank', 'noopener,noreferrer');
      if (!w) {
        window.location.href = shareUrl;
      }
    };

    switch (platform) {
      case 'whatsapp':
        openExternal(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
        break;
      case 'facebook':
        openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'twitter':
        openExternal(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
        break;
      case 'copy':
        (async () => {
          try {
            await navigator.clipboard.writeText(url);
            toast({
              title: "Link Copied",
              description: "Offer link has been copied to clipboard",
            });
            setShowShareDialog(false);
          } catch (e) {
            toast({
              title: "Copy Failed",
              description: "Unable to copy the link. Please copy it manually from the address bar.",
              variant: "destructive",
            });
          }
        })();
        break;
    }
  };

  const openShare = async () => {
    const url = window.location.href;
    const title = offer?.title || "Offer";
    const text = `Check out this amazing offer: ${title}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (e) {
      // ignore and fallback to dialog
    }

    setShowShareDialog(true);
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
    setSelectedShades((prev) => ({ ...prev, [productId]: shade }));
    
    // Find and set the shade image
    if (shade) {
      const shades = productShadesData[productId] || [];
      const selectedShade = shades.find((s) => s.name === shade);
      if (selectedShade?.imageUrl) {
        setSelectedShadeImages((prev) => ({ ...prev, [productId]: selectedShade.imageUrl || null }));
        // Update main image to show the shade image
        setSelectedImage(selectedShade.imageUrl);
      }
    } else {
      setSelectedShadeImages((prev) => ({ ...prev, [productId]: null }));
    }
  };

  const handleAddAllToCart = async () => {
    if (!offer) return;

    const productIds = offer.productIds || [];
    const offerProducts = offer.products || [];

    const productsWithShades = productIds.filter((id: number) => productShadesData[id]?.length > 0);
    const unselectedProducts = productsWithShades.filter((id: number) => {
      return !selectedShades[id] || selectedShades[id].trim() === '';
    });

    if (unselectedProducts.length > 0) {
      toast({
        title: "Shade Selection Required",
        description: `Please select shade(s) for all products`,
        variant: "destructive",
      });
      return;
    }

    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");

      let totalOriginalPrice = 0;
      let totalOfferPrice = 0;
      let totalDiscountAmount = 0;
      let totalAffiliateCommission = 0;
      let totalAffiliateUserDiscount = 0;
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
          totalAffiliateCommission += parseFloat(product.affiliateCommission || '0');
          totalAffiliateUserDiscount += parseFloat(product.affiliateUserDiscount || '0');
        }
      }

      // If the offer has explicit affiliate fields set, prefer those
      if (offer.affiliateCommission && parseFloat(String(offer.affiliateCommission)) > 0) {
        totalAffiliateCommission = parseFloat(String(offer.affiliateCommission));
      }

      if (offer.affiliateUserDiscount && parseFloat(String(offer.affiliateUserDiscount)) > 0) {
        totalAffiliateUserDiscount = parseFloat(String(offer.affiliateUserDiscount));
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
          affiliateCommission: totalAffiliateCommission,
          affiliateUserDiscount: totalAffiliateUserDiscount,
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
  const productsWithShades = productIds.filter((id: number) => productShadesData[id]?.length > 0);
  const allShadesSelected = productsWithShades.length === 0 || productsWithShades.every((id: number) => {
    const shade = selectedShades[id];
    return shade && typeof shade === 'string' && shade.trim() !== '';
  });

  const bannerImage = offer.bannerImageUrl || offer.imageUrl;
  // Products that require shade selection
  const unselectedProducts = productsWithShades.filter((id: number) => {
    return !selectedShades[id] || selectedShades[id].trim() === '';
  });
  const addButtonDisabled = unselectedProducts.length > 0 || isExpired;

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
          {/* Left Column - Image Gallery with Thumbnails */}
          <div>
            <div className="flex gap-4">
              {/* Vertical Thumbnail Gallery - Only Listing Images */}
              <ScrollArea className="h-[500px] w-24">
                <div className="flex flex-col gap-3">
                  {/* Banner Images Thumbnails (Listing Images Only) */}
                  {offer.bannerImages && Array.isArray(offer.bannerImages) && offer.bannerImages.length > 0 && (
                    <>
                      {offer.bannerImages.map((bannerUrl: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(bannerUrl)}
                          className={`relative aspect-square bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImage === bannerUrl ? 'border-purple-500 ring-2 ring-purple-300' : 'border-purple-100 hover:border-purple-300'
                          }`}
                        >
                          <img
                            src={bannerUrl}
                            alt={`Listing ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}

                      {/* Video thumbnail (if a video exists and isn't already in bannerImages) */}
                      {offer.videoUrl && !(offer.bannerImages || []).includes(offer.videoUrl) && (
                        <button
                          key="offer-video-thumb"
                          onClick={() => setSelectedImage(offer.videoUrl)}
                          className={`relative aspect-square bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImage === offer.videoUrl ? 'border-purple-500 ring-2 ring-purple-300' : 'border-purple-100 hover:border-purple-300'
                          }`}
                          title="Play Video"
                        >
                          <img
                            src={offer.imageUrl || bannerImage}
                            alt="Video preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-black bg-opacity-60 flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M5 3v18l15-9L5 3z" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Main Display Area */}
              <div className="flex-1 bg-white rounded-lg overflow-hidden shadow-sm sticky top-8">
                <div className="relative aspect-square bg-gray-100 group cursor-zoom-in">
                  {selectedImage === offer.videoUrl ? (
                    <video
                      src={offer.videoUrl}
                      controls
                      className="w-full h-full"
                      poster={offer.imageUrl}
                      autoPlay
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img
                      src={selectedImage}
                      alt={offer.title}
                      className="w-full h-full object-cover transition-transform duration-300"
                      onClick={() => {
                        // Create zoom modal
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 cursor-zoom-out';
                        modal.onclick = () => modal.remove();
                        
                        const img = document.createElement('img');
                        img.src = selectedImage;
                        img.alt = offer.title;
                        img.className = 'max-w-full max-h-full object-contain';
                        
                        modal.appendChild(img);
                        document.body.appendChild(modal);
                      }}
                    />
                  )}

                  {/* (Removed: Zoom hint and discount badge overlays on image per UI request) */}

                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 z-20">
                    {!isExpired ? (
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        Active
                      </div>
                    ) : (
                      <div className="z-20">
                        <Badge className="bg-gray-600 text-white px-3 py-1 sm:px-3 sm:py-1.5 text-sm font-bold shadow-lg">
                          ENDED
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Expired overlay: keep banner visible but show ended overlay */}
                  {isExpired && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="bg-black bg-opacity-40 backdrop-blur-sm w-full h-full"></div>
                      <div className="absolute text-center z-20">
                        <div className="inline-block bg-white/10 text-white px-4 py-2 rounded-full text-2xl font-bold tracking-wider">
                          OFFER ENDED
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Share overlay button (below discount badge) */}
                  <div className="absolute top-6 right-4 z-30">
                    <button
                      type="button"
                      aria-label="Share offer"
                      onClick={openShare}
                      className="bg-white/90 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-lg border border-gray-100 text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {offer.title}
            </h1>

            {/* Description (Short) */}
            <div className="bg-gray-50 rounded-lg p-4 mb-3">
              <p className="text-gray-700">{offer.description}</p>
            </div>

            {/* Rating (Stars) */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-gray-600">(0 reviews)</span>
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

            {/* Cashback - Only show if cashback amount is greater than 0 */}
            {offer.cashbackPercentage && offer.cashbackPrice && Number(offer.cashbackPrice) > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-orange-700">Get Cashback</span>
                    <p className="text-xs text-orange-600 mt-0.5">Earn on this purchase</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-orange-600">
                      ₹{Number(offer.cashbackPrice).toFixed(2)}
                    </span>
                    <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-semibold">
                      {offer.cashbackPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {/* Add to Cart Button */}
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={handleAddAllToCart}
                disabled={addButtonDisabled}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {isExpired ? 'Offer Ended' : (unselectedProducts.length > 0 ? 'Select All Shades First' : 'Add All to Cart')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-purple-200 hover:border-purple-400 rounded-xl p-4 transform hover:scale-105 transition-all duration-200"
                onClick={toggleWishlist}
                disabled={isExpired}
                title={isExpired ? 'Offer has ended' : undefined}
              >
                <Heart className={`w-6 h-6 ${isInWishlist ? "fill-red-600 text-red-600" : "text-purple-500"}`} />
              </Button>
            </div>
            {/* Small note when offer expired */}
            {isExpired && (
              <div className="mt-3 text-sm text-gray-500">
                Offer ended on {new Date(offer.validUntil).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}.
              </div>
            )}
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
                      typeof offer.detailedDescription === 'string' && offer.detailedDescription.includes('<') ? (
                        <div 
                          className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                          dangerouslySetInnerHTML={{ __html: offer.detailedDescription }}
                        />
                      ) : (
                        <div className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal whitespace-pre-line">
                          {offer.detailedDescription}
                        </div>
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
                  {offer?.productsIncluded ? (
                    typeof offer.productsIncluded === 'string' && offer.productsIncluded.includes('<') ? (
                      <div 
                        className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ __html: offer.productsIncluded }}
                      />
                    ) : (
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal">
                          {offer.productsIncluded}
                        </p>
                      </div>
                    )
                  ) : offer?.products && Array.isArray(offer.products) && offer.products.length > 0 ? (
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal">
                        {offer.products.map((product: any) => product.name).join('\n')}
                      </p>
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
                      typeof offer.benefits === 'string' && offer.benefits.includes('<') ? (
                        <div 
                          className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                          dangerouslySetInnerHTML={{ __html: offer.benefits }}
                        />
                      ) : (
                        <div className="prose prose-gray max-w-none">
                          <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal">
                            {offer.benefits}
                          </p>
                        </div>
                      )
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

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Share</DialogTitle>
            <DialogDescription>Share this offer with your friends</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <div className="text-sm text-gray-700 break-all">{typeof window !== 'undefined' ? window.location.href : ''}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={() => handleShare('whatsapp')}>
                WhatsApp
              </Button>
              <Button type="button" variant="outline" onClick={() => handleShare('facebook')}>
                Facebook
              </Button>
              <Button type="button" variant="outline" onClick={() => handleShare('twitter')}>
                Twitter
              </Button>
              <Button type="button" onClick={() => handleShare('copy')}>
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        <section className="mt-12 sm:mt-16">
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    You May Also Like
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Complete your beauty routine with these products
                  </p>
                </div>
      
                {recommendedProducts.length === 0 ? (
                  <>
                    {/* Mobile: Loading Skeleton */}
                    <div className="block md:hidden">
                      <div className="overflow-x-auto scrollbar-hide pb-4">
                        <div className="flex gap-3 px-2" style={{ width: 'max-content' }}>
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm" style={{ width: '160px', flexShrink: 0 }}>
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
                    </div>
      
                    {/* Desktop: Loading Skeleton */}
                    <div className="hidden md:block">
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 px-4 sm:px-8">
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
                  </>
                ) : (
                  <>
                    {/* Mobile: 2 Column Grid with Horizontal Scroll */}
                    <div className="block md:hidden">
                      <div className="overflow-x-auto scrollbar-hide pb-4">
                        <div className="flex gap-3 px-2" style={{ width: 'max-content' }}>
                          {(Array.isArray(recommendedProducts) ? recommendedProducts : []).map((product: any) => (
                            <div key={product.id} style={{ width: '160px', flexShrink: 0 }}>
                              <ProductCard product={product} className="h-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
      
                    {/* Desktop: Carousel */}
                    <div className="hidden md:block">
                      <div className="relative px-4 sm:px-8">
                        <Carousel
                          opts={{
                            align: "start",
                            loop: true,
                          }}
                          className="w-full"
                        >
                          <CarouselContent className="-ml-2 md:-ml-4">
                            {(Array.isArray(recommendedProducts) ? recommendedProducts : []).map((product: any) => (
                              <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                                <ProductCard product={product} />
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="hidden sm:flex -left-4" />
                          <CarouselNext className="hidden sm:flex -right-4" />
                        </Carousel>
                      </div>
                    </div>
                  </>
                )}
              </section>
    </div>
  );
}
