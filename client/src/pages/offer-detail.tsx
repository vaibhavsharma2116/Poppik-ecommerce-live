import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ChevronRight, ShoppingCart, ArrowLeft, Share2, Tag, Clock, Check, Sparkles, Palette, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className="bg-white rounded-xl border-2 border-purple-100 overflow-hidden hover:border-purple-300 transition-all duration-200 shadow-lg hover:shadow-xl">
      <div className="flex flex-col p-4">
        {/* Product Image */}
        <div className="w-full aspect-square mb-4">
          <div className="relative w-full h-full bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg overflow-hidden shadow-md">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-2"
            />
          </div>
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{product.description}</p>
          )}
          
          {/* Price Display */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl font-bold text-green-600">₹{product.price}</span>
            {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
              <span className="text-sm text-gray-500 line-through">₹{product.originalPrice}</span>
            )}
          </div>

          {/* Available Shades Preview */}
          {hasShades && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Available Shades ({productShades.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {productShades.slice(0, 5).map((shade) => (
                  <div
                    key={shade.id}
                    className="group relative"
                    title={shade.name}
                  >
                    {shade.imageUrl ? (
                      <img
                        src={shade.imageUrl}
                        alt={shade.name}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm object-cover"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: shade.colorCode || getShadeColor(shade.name) }}
                      />
                    )}
                  </div>
                ))}
                {productShades.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">+{productShades.length - 5}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Shade Display */}
          {hasShades && selectedShade && (
            <div className="mt-2 flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
              <Check className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Selected: {selectedShade}</span>
            </div>
          )}

          {/* Shade Selection Button */}
          <div className="mt-4 w-full">
            {hasShades && (
              <Button
                onClick={onOpenShadeSelector}
                variant="outline"
                size="sm"
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 transition-all ${
                  selectedShade
                    ? 'border-purple-500 bg-purple-50 hover:bg-purple-100 text-purple-700'
                    : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span className="font-semibold whitespace-nowrap">
                  {selectedShade ? 'Change Shade' : 'Select Shade'}
                </span>
                {!selectedShade && <span className="text-red-500 ml-1">*</span>}
              </Button>
            )}
          </div>
        </div>
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
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[70vh]">
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle className="text-xl font-bold">Select Shade</SheetTitle>
          <SheetDescription className="text-gray-600">
            Choose your preferred shade for {product.name}
          </SheetDescription>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-100px)] pb-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {shades.map((shade) => {
              const isSelected = selectedShade === shade.name;
              return (
                <button
                  key={shade.id}
                  onClick={() => {
                    onShadeSelect(shade.name);
                    onClose();
                  }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                  }`}
                >
                  <div className="relative">
                    {shade.imageUrl ? (
                      <img
                        src={shade.imageUrl}
                        alt={shade.name}
                        className="w-14 h-14 rounded-full shadow-md border-3 border-white object-cover"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-full shadow-md border-3 border-white"
                        style={{
                          backgroundColor: shade.colorCode || getShadeColor(shade.name)
                        }}
                      />
                    )}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center line-clamp-2 capitalize">
                    {shade.name}
                  </span>
                </button>
              );
            })}
          </div>
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
          <Skeleton key={id} className="h-24 rounded-xl" />
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
        <ShadeSelectorSheet
          key={`shade-selector-${product.id}`}
          product={product}
          shades={productShadesData[product.id] || []}
          selectedShade={selectedShades[product.id] || null}
          isOpen={shadeSelectorOpen === product.id}
          onClose={() => setShadeSelectorOpen(null)}
          onShadeSelect={(shade) => onShadeChange(product.id, shade)}
        />
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

// Placeholder for ProductCard component if it's not defined elsewhere and needed for rendering products in tabs
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300">
      <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-gray-100">
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-2" />
      </div>
      <h3 className="text-base font-bold text-gray-900 truncate mb-1">{product.name}</h3>
      {product.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{product.description}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-purple-700">₹{product.price}</span>
        {product.originalPrice && (
          <span className="text-xs text-gray-500 line-through">₹{product.originalPrice}</span>
        )}
      </div>
    </div>
  );
}

export default function OfferDetail() {
  const [, params] = useRoute("/offer/:id");
  const offerId = params?.id || "";
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [productShadesData, setProductShadesData] = useState<Record<number, Shade[]>>({});
  const [selectedShades, setSelectedShades] = useState<Record<number, string | null>>({});
  const { toast } = useToast();

  const { data: offer, isLoading, error } = useQuery<any>({
    queryKey: [`/api/offers/${offerId}`],
    enabled: !!offerId,
  });

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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full rounded-3xl mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!offer || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Offer Not Found</h1>
            <p className="text-gray-600 mb-8">The offer you're looking for doesn't exist or has expired.</p>
            <Link href="/offers">
              <Button className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-8 py-3 rounded-xl font-semibold">
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

  // Use banner image if available, otherwise use main image
  const bannerImage = offer.bannerImageUrl || offer.imageUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-8 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6 sm:mb-8">
          <Link href="/offers">
            <Button variant="outline" className="border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-gray-700 font-medium">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Offers
            </Button>
          </Link>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm mb-6 sm:mb-8 bg-white/60 backdrop-blur-md rounded-2xl px-6 py-4 shadow-lg border border-white/20">
          <Link href="/" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 text-purple-400" />
          <Link href="/offers" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
            Offers
          </Link>
          <ChevronRight className="h-4 w-4 text-purple-400" />
          <span className="text-gray-900 font-semibold">{offer.title}</span>
        </nav>

        {/* Main Content Grid - Similar to Product Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Banner Image Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/20">
                <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg">
                  <img
                    src={bannerImage}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Discount Badge */}
                  {(offer.discountPercentage || offer.discountText) && (
                    <div className="absolute top-6 right-6 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-bold text-2xl shadow-2xl animate-pulse">
                      {offer.discountPercentage ? `${offer.discountPercentage}% OFF` : offer.discountText}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-6 left-6">
                    {isExpired ? (
                      <div className="bg-gray-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-full font-semibold border border-gray-600">
                        Expired
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 backdrop-blur-sm text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 shadow-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        Active Offer
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Offer Info Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                {offer.title}
              </h1>

              <p className="text-lg text-gray-600 mb-6">{offer.description}</p>

              {/* Price Section */}
              {offer.price && (
                <div className="mb-6">
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ₹{offer.price}
                    </span>
                    {offer.originalPrice && (
                      <span className="text-2xl text-gray-500 line-through">₹{offer.originalPrice}</span>
                    )}
                  </div>

                  {/* Savings Info */}
                  {offer.originalPrice && Number(offer.originalPrice) > Number(offer.price) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <p className="text-sm text-green-700 font-semibold flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        You save ₹{(Number(offer.originalPrice) - Number(offer.price)).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cashback Badge */}
              {offer.cashbackPercentage && offer.cashbackPrice && (
                <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-orange-700">Get Cashback</span>
                      <p className="text-xs text-orange-600 mt-1">Earn on this purchase</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-orange-600">
                        ₹{Number(offer.cashbackPrice).toFixed(2)}
                      </span>
                      <span className="text-sm bg-orange-200 text-orange-800 px-3 py-1 rounded-full font-semibold">
                        {offer.cashbackPercentage}% Cashback
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validity Info */}
              <div className="flex items-center space-x-3 mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
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

              {/* Share Button */}
              <Button
                onClick={() => setShowShareDialog(true)}
                variant="outline"
                className="w-full border-2 border-purple-200 hover:border-purple-400 rounded-xl py-6 font-semibold text-lg"
              >
                <Share2 className="h-5 w-5 mr-2" />
                Share This Offer
              </Button>
            </div>
          </div>
        </div>

        {/* Products Cards Section */}
        {productIds.length > 0 && (
          <div className="mb-8">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50/80 to-white/80 backdrop-blur-md rounded-3xl border border-white/20">
              <CardHeader className="pb-6">
                <CardTitle className="text-3xl font-bold text-gray-900 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg mr-4">
                      <div className="w-6 h-6 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold">Products Included in this Offer</h3>
                      <p className="text-base text-gray-600 font-normal mt-1">
                        {productIds.length} product{productIds.length !== 1 ? 's' : ''} with exclusive shades
                      </p>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-purple-800">
                    <Sparkles className="w-5 h-5" />
                    <p className="text-sm font-medium">
                      Select shades for products to add them to your cart with special offer pricing
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <ProductsList
                    productIds={productIds}
                    productShadesData={productShadesData}
                    selectedShades={selectedShades}
                    onShadeChange={handleShadeChange}
                    offerProducts={offer?.products}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {/* Add All to Cart Button */}
        <div className="mt-6 bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Ready to checkout?</h3>
              <p className="text-sm text-gray-600">
                {productsWithShades.length > 0 && !allShadesSelected
                  ? "Please select shades for all products"
                  : `Add all ${productIds.length} product(s) to your cart with ${offer.discountPercentage || 0}% discount`
                }
              </p>
            </div>
            <Button
              onClick={handleAddAllToCart}
              disabled={isExpired || (productsWithShades.length > 0 && !allShadesSelected)}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-8 py-6 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add All to Cart
            </Button>
          </div>
        </div>

        {/* How to Redeem Section */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 mt-16">
          <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
            How to Redeem This Offer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg">
                1
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Select Shades</h3>
              <p className="text-sm text-gray-600">Choose your preferred shades for products that require them</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg">
                2
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Add All Products</h3>
              <p className="text-sm text-gray-600">Click "Add All to Cart" to get all products together</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl shadow-lg">
                3
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Enjoy Savings</h3>
              <p className="text-sm text-gray-600">Discount applied automatically at checkout</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Share This Offer
            </DialogTitle>
            <p className="text-gray-600">Spread the word about this amazing deal!</p>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start space-x-3 h-14 text-base hover:bg-green-50 border-2 hover:border-green-400"
              onClick={() => handleShare('whatsapp')}
            >
              <span className="text-3xl">💬</span>
              <span className="font-semibold">Share on WhatsApp</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start space-x-3 h-14 text-base hover:bg-blue-50 border-2 hover:border-blue-400"
              onClick={() => handleShare('facebook')}
            >
              <span className="text-3xl">📘</span>
              <span className="font-semibold">Share on Facebook</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start space-x-3 h-14 text-base hover:bg-sky-50 border-2 hover:border-sky-400"
              onClick={() => handleShare('twitter')}
            >
              <span className="text-3xl">🐦</span>
              <span className="font-semibold">Share on Twitter</span>
            </Button>

            <div className="pt-3 border-t">
              <p className="text-center text-gray-500 text-sm mb-3 font-medium">OR</p>
              <Button
                variant="outline"
                className="w-full justify-start space-x-3 h-14 text-base hover:bg-purple-50 border-2 hover:border-purple-400"
                onClick={() => handleShare('copy')}
              >
                <span className="text-3xl">🔗</span>
                <span className="font-semibold">Copy Link to Clipboard</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}