import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Star, Heart, ShoppingCart, X, Plus, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface Shade {
  id: number;
  name: string;
  colorCode: string;
  imageUrl?: string;
  isActive: boolean;
}

interface ProductCardProps {
  product: Product;
  className?: string;
  viewMode?: 'grid' | 'list';
}

export default function ProductCard({ product, className = "", viewMode = 'grid' }: ProductCardProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedShades, setSelectedShades] = useState<Shade[]>([]);
  const [isShadeDrawerOpen, setIsShadeDrawerOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const isMobile = useIsMobile();


  // Fetch product shades
  const { data: productShades = [] } = useQuery<Shade[]>({
    queryKey: [`/api/products/${product?.id}/shades`],
    queryFn: async () => {
      if (!product?.id) return [];
      const response = await fetch(`/api/products/${product.id}/shades`);
      if (!response.ok) return [];
      const shades = await response.json();
      return shades.filter((shade: Shade) => 
        shade.productIds && Array.isArray(shade.productIds) && shade.productIds.includes(product.id)
      );
    },
    enabled: !!product?.id,
  });

  // Check if product is in wishlist
  useEffect(() => {
    if (product?.id) {
      const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setIsInWishlist(wishlist.some((item: any) => item.id === product.id));
    }
  }, [product?.id]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is logged in
    const user = localStorage.getItem("user");
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your wishlist",
        variant: "destructive",
      });
      // Redirect to login page
      window.location.href = "/auth/login";
      return;
    }

    try {
      const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      const existingIndex = wishlist.findIndex((item: any) => item.id === product.id);

      if (existingIndex >= 0) {
        // Remove from wishlist
        wishlist.splice(existingIndex, 1);
        setIsInWishlist(false);
        toast({
          title: "Removed from Wishlist",
          description: `${product.name} has been removed from your wishlist`,
        });
      } else {
        // Add to wishlist - only store essential data
        const wishlistItem = {
          id: product.id,
          name: product.name.substring(0, 100), // Limit name length
          price: `₹${product.price}`,
          originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
          image: product.imageUrl?.substring(0, 200) || '', // Limit image URL length
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

  const addToCart = (e?: React.MouseEvent, fromDrawer = false) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (productShades.length > 0 && selectedShades.length === 0 && !fromDrawer) {
      setIsShadeDrawerOpen(true);
      return;
    }

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    // Add each selected shade to cart
    if (selectedShades.length > 0) {
      selectedShades.forEach(shade => {
        const itemKey = `${product.id}-${shade.id}`;
        const existingItem = cart.find((cartItem: any) => cartItem.itemKey === itemKey);

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          cart.push({
            id: product.id,
            itemKey,
            name: product.name,
            price: `₹${product.price}`,
            originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
            image: shade.imageUrl || product.imageUrl,
            quantity: quantity,
            inStock: true,
            selectedShade: {
              id: shade.id,
              name: shade.name,
              colorCode: shade.colorCode,
              imageUrl: shade.imageUrl
            },
            cashbackPercentage: product.cashbackPercentage || undefined,
            cashbackPrice: product.cashbackPrice || undefined,
          });
        }
      });
    } else {
      // No shades selected
      const itemKey = `${product.id}`;
      const existingItem = cart.find((cartItem: any) => cartItem.itemKey === itemKey);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({
          id: product.id,
          itemKey,
          name: product.name,
          price: `₹${product.price}`,
          originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
          image: product.imageUrl,
          quantity: quantity,
          inStock: true,
          selectedShade: null,
          cashbackPercentage: product.cashbackPercentage || undefined,
          cashbackPrice: product.cashbackPrice || undefined,
        });
      }
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartCount", cart.reduce((total: number, item: any) => total + item.quantity, 0).toString());
    window.dispatchEvent(new Event("cartUpdated"));

    const shadeText = selectedShades.length > 0 
      ? ` (${selectedShades.map(s => s.name).join(', ')})` 
      : '';
    toast({
      title: "Added to Cart",
      description: `${product.name}${shadeText} (${quantity} each) has been added to your cart`,
    });

    if (fromDrawer) {
      setIsShadeDrawerOpen(false);
      setQuantity(1);
      setSelectedShades([]);
    }
  };

  // Use admin-calculated discount or calculate if not available
  const discountPercentage = product.discount 
    ? Math.round(Number(product.discount))
    : product.originalPrice 
      ? Math.round(((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100)
      : 0;

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

  // Early return with null check - make sure product exists
  if (!product) {
    return null;
  }

  if (viewMode === 'list') {
    return (
      <div 
        className={`product-card group flex overflow-hidden bg-gradient-to-r from-white via-pink-50 to-purple-50 transition-all duration-500 ${className}`}
        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
      >
        <div className="relative w-48 flex-shrink-0">
          <button
            onClick={toggleWishlist}
            className="absolute top-2 right-2 p-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:scale-110 transition-all duration-300 z-10 border border-pink-100"
          >
            <Heart className={`h-4 w-4 transition-all duration-300 ${isInWishlist ? "text-red-500 fill-current animate-pulse" : "text-gray-400 hover:text-pink-500"}`} />
          </button>
          <Link href={`/product/${product.slug}`}>
            <div className="relative overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50 h-48 rounded-lg">
              <img
                src={(() => {
                  // Handle new images array format
                  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                    const imageUrl = product.images[0].url || product.images[0].imageUrl;
                    return `${imageUrl}${imageUrl.includes('unsplash') ? '&w=400&h=400&q=80&fit=crop' : ''}`;
                  } else if (product.imageUrl) {
                    return `${product.imageUrl}${product.imageUrl.includes('unsplash') ? '&w=400&h=400&q=80&fit=crop' : ''}`;
                  }
                  return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80';
                })()}
                alt={product.name}
                className="w-full h-full object-contain cursor-pointer group-hover:scale-110 transition-transform duration-700 rounded-lg"
                loading="lazy"
                decoding="async"
                width="400"
                height="400"
                onLoad={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.opacity = '1';
                }}
                style={{ opacity: 0, transition: 'opacity 0.3s ease', width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
            </div>
          </Link>


        </div>

        <div className="flex-1 p-6 flex flex-col justify-between bg-gradient-to-br from-white via-pink-25 to-purple-25">
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-lg p-2 border border-pink-100">
              <div className="star-rating">
                {renderStars(parseFloat(product.rating))}
              </div>
              <span className="text-gray-700 text-sm font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">{product.rating}</span>
            </div>

            <Link href={`/product/${product.slug}`}>
              <h3 className="font-bold text-gray-900 hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 hover:bg-clip-text hover:text-transparent transition-all duration-300 cursor-pointer text-lg leading-tight line-clamp-2" style={{ minHeight: '3.5rem', maxHeight: '3.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {product.name}
              </h3>
            </Link>

            <p className="text-gray-600 text-sm leading-relaxed">
              {product.shortDescription}
            </p>

            {product.size && (
              <p className="text-gray-500 text-xs bg-gray-50 px-2 py-1 rounded-md inline-block">{product.size}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {product.bestseller && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 hover:from-yellow-200 hover:to-orange-200 border border-yellow-300 shadow-md">
                  ⭐ Bestseller
                </Badge>
              )}
              {product.newLaunch && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 hover:from-emerald-200 hover:to-teal-200 border border-emerald-300 font-semibold animate-pulse shadow-lg">
                  🚀 New Launch
                </Badge>
              )}
              {product.featured && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 hover:from-blue-200 hover:to-indigo-100 border border-blue-300 shadow-md">
                  ✨ Featured
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="space-y-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-gray-900">
                  ₹{Number(product.price).toLocaleString()}
                </span>
                {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                  <>
                    <span className="text-sm text-gray-500 line-through">
                      ₹{Number(product.originalPrice).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Cashback Badge - Fixed height container */}
              <div className="mb-2" style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
                {product.cashbackPercentage ? (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-1.5 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-orange-700">Cashback</span>
                      <span className="text-sm bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-bold">
                        {product.cashbackPercentage}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '36px' }}></div>
                )}
              </div>

              {/* Stock status */}
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className={`w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full animate-pulse ${
                  product.inStock 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-400' 
                    : 'bg-gradient-to-r from-red-400 to-rose-400'
                }`}></div>
                <span className={`font-bold text-xs sm:text-sm md:text-base lg:text-lg ${
                  product.inStock ? 'text-green-600' : 'text-red-600'
                }`}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

            </div>

            {product.inStock ? (
              productShades.length > 0 ? (
                <Button 
                  size="sm" 
                  className="w-full text-sm py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsShadeDrawerOpen(true);
                  }}
                >
                  Select Shades
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full text-sm py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  onClick={addToCart}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </Button>
              )
            ) : (
              <Button 
                size="sm" 
                className="w-full text-sm py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={toggleWishlist}
              >
                <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
                {isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`mobile-product-card-container group transition-all duration-300 overflow-hidden bg-white ${className}`}
      style={{ 
        border: 'none !important', 
        outline: 'none !important', 
        boxShadow: 'none !important', 
        WebkitBoxShadow: 'none !important',
        MozBoxShadow: 'none !important',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '100%',
        margin: '0'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
        <button
          onClick={toggleWishlist}
          className="absolute top-2 right-2 p-2 hover:from-red-50 hover:to-pink-50 hover:scale-110 transition-all duration-300 z-10 "
        >
          <Heart className={`h-6 w-6 transition-all duration-300 ${isInWishlist ? "text-red-500 fill-current animate-pulse" : "text-gray-400 hover:text-pink-500"}`} />
        </button>
        <Link href={`/product/${product.slug}`}>
          <div className="relative overflow-hidden bg-white">
            <img
              src={(() => {
                // Handle new images array format
                if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                  const imageUrl = product.images[0].url || product.images[0].imageUrl;
                  return `${imageUrl}${imageUrl.includes('unsplash') ? '&w=200&h=200&q=60&fit=crop&auto=format' : ''}`;
                } else if (product.imageUrl) {
                  return `${product.imageUrl}${product.imageUrl.includes('unsplash') ? '&w=200&h=200&q=60&fit=crop&auto=format' : ''}`;
                }
                return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=60';
              })()}
              alt={product.name}
              className="mobile-product-image w-full h-36 sm:h-44 md:h-52 lg:h-60 object-contain"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
              style={{ width: '100%', height: '70%', objectFit: 'contain', display: 'block' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=60';
              }}
            />
            <div className={`absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className={`absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
          </div>
        </Link>


      </div>

      <div className="mobile-product-content p-2 sm:p-3 md:p-4 lg:p-5 space-y-1 sm:space-y-2 md:space-y-3 bg-white">
        <div className="flex items-center justify-between bg-white rounded-lg p-2">
          <div className="star-rating">
            {renderStars(parseFloat(product.rating))}
          </div>
          <span className="text-gray-700 text-xs sm:text-sm font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">{product.rating}</span>
        </div>

        <Link href={`/product/${product.slug}`}>
          <h3 className="mobile-product-title font-semibold text-gray-900 hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 hover:bg-clip-text hover:text-transparent transition-all duration-300 cursor-pointer line-clamp-2 text-xs sm:text-sm md:text-base" style={{ minHeight: '3.5rem', maxHeight: '3.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.name}
          </h3>
        </Link>

        <div className="space-y-1 sm:space-y-2">
          <div className="flex flex-col space-y-1">
            <div className="flex items-baseline space-x-1 sm:space-x-2 min-h-[24px]">
              <span className="mobile-product-price text-sm sm:text-base md:text-lg font-bold text-gray-900">
                ₹{Number(product.price).toLocaleString()}
              </span>
              {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                <>
                  <span className="text-xs sm:text-sm text-gray-500 line-through">
                    ₹{Number(product.originalPrice).toLocaleString()}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-green-600 bg-green-50 px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap">
                    {discountPercentage}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Cashback Badge - Fixed height container */}
            <div className="mt-1" style={{ minHeight: '28px', display: 'flex', alignItems: 'center' }}>
              {product.cashbackPercentage ? (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-orange-700">Cashback</span>
                    <span className="text-[10px] sm:text-xs bg-orange-200 text-orange-800 px-1.5 sm:px-2 py-0.5 rounded-full font-bold">
                      {product.cashbackPercentage}%
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ minHeight: '28px' }}></div>
              )}
            </div>

            {/* Stock status */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 mb-3 sm:mb-4">
              <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse ${
                product.inStock 
                  ? 'bg-gradient-to-r from-green-400 to-emerald-400' 
                  : 'bg-gradient-to-r from-red-400 to-rose-400'
              }`}></div>
              <span className={`font-bold text-xs sm:text-sm ${
                product.inStock ? 'text-green-600' : 'text-red-600'
              }`}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

          </div>

          {product.inStock ? (
            productShades.length > 0 ? (
              <Button 
                size="sm" 
                className="w-full text-xs sm:text-sm py-2.5 sm:py-3 min-h-[40px] bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 touch-target"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsShadeDrawerOpen(true);
                }}
              >
                Select Shades
              </Button>
            ) : (
              <Button 
                size="sm" 
                className="w-full text-xs sm:text-sm py-2.5 sm:py-3 min-h-[40px] flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 touch-target"
                onClick={addToCart}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Add to</span> Cart
              </Button>
            )
          ) : (
            <Button 
              size="sm" 
              className="w-full text-xs sm:text-sm py-2.5 sm:py-3 min-h-[40px] flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 touch-target"
              onClick={toggleWishlist}
            >
              <Heart className={`h-3.5 w-3.5 ${isInWishlist ? 'fill-current' : ''}`} />
              {isInWishlist ? 'Remove' : <><span className="hidden xs:inline">Add to</span> Wishlist</>}
            </Button>
          )}
        </div>
      </div>

      {/* Shade Selection Drawer */}
      <Sheet open={isShadeDrawerOpen} onOpenChange={setIsShadeDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle className="text-xl font-bold">{product.name}</SheetTitle>
            <SheetDescription>
              Select shade and quantity
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Product Image - Dynamic based on selected shade */}
            <div className="relative bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg overflow-hidden aspect-square transition-all duration-300">
              <img
                src={(() => {
                  if (selectedShades.length > 0 && selectedShades[0].imageUrl) {
                    return selectedShades[0].imageUrl;
                  }
                  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                    return product.images[0].url || product.images[0].imageUrl;
                  }
                  return product.imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80';
                })()}
                alt={selectedShades.length > 0 ? selectedShades[0].name : product.name}
                className="w-full h-full object-contain transition-opacity duration-300"
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

            {/* Price Section - Dynamic total */}
            <div className="space-y-2 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ₹{Number(product.price).toLocaleString()}
                </span>
                {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      ₹{Number(product.originalPrice).toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full animate-pulse">
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
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

            {/* Shade Selection - Enhanced interactivity with multiple selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Select Shades: 
                  {selectedShades.length > 0 && (
                    <span className="ml-2 text-sm text-purple-600">({selectedShades.length} selected)</span>
                  )}
                </h3>
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
                {productShades.map((shade) => {
                  const isSelected = selectedShades.some(s => s.id === shade.id);
                  return (
                    <div
                      key={shade.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedShades(selectedShades.filter(s => s.id !== shade.id));
                        } else {
                          setSelectedShades([...selectedShades, shade]);
                        }
                      }}
                      className={`cursor-pointer group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
                        isSelected
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md scale-105'
                          : 'border-purple-300 hover:border-purple-400 hover:bg-purple-25'
                      }`}
                    >
                      {shade.imageUrl ? (
                        <div className="relative">
                          <img
                            src={shade.imageUrl}
                            alt={shade.name}
                            className={`w-12 h-12 rounded-full object-cover border-2 shadow-md transition-all ${
                              isSelected ? 'border-purple-500' : 'border-gray-300'
                            }`}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-pulse" />
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <div
                            className={`w-12 h-12 rounded-full border-2 shadow-md transition-all ${
                              isSelected ? 'border-purple-500 scale-110' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: shade.colorCode }}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse" />
                          )}
                        </div>
                      )}
                      <span className={`text-xs text-center font-medium line-clamp-2 transition-colors ${
                        isSelected ? 'text-purple-700' : 'text-gray-700'
                      }`}>
                        {shade.name}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-1 shadow-lg">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector - Enhanced design */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Quantity:</h3>
              <div className="flex items-center justify-center gap-6 bg-gray-50 rounded-lg p-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="h-12 w-12 rounded-full border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-30 transition-all"
                >
                  <Minus className="h-5 w-5 text-purple-600" />
                </Button>
                <div className="text-center min-w-[4rem]">
                  <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{quantity}</span>
                  <p className="text-xs text-gray-500 mt-1">Items</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-12 w-12 rounded-full border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all"
                >
                  <Plus className="h-5 w-5 text-purple-600" />
                </Button>
              </div>
            </div>

            {/* Add to Cart Button - Enhanced with dynamic total */}
            <div className="space-y-3 pt-4 border-t-2 border-purple-100">
              {selectedShades.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ₹{(Number(product.price) * quantity * selectedShades.length).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedShades.length} shade{selectedShades.length > 1 ? 's' : ''} × {quantity} item{quantity > 1 ? 's' : ''} × ₹{Number(product.price).toLocaleString()}
                  </p>
                </div>
              )}

              <Button
                className={`w-full py-6 text-lg font-semibold transition-all duration-300 ${
                  selectedShades.length > 0
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                disabled={selectedShades.length === 0}
                onClick={() => addToCart(undefined, true)}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {selectedShades.length > 0 ? `Add ${selectedShades.length} Shade${selectedShades.length > 1 ? 's' : ''} to Cart` : 'Select Shades First'}
              </Button>

              {selectedShades.length === 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-medium">Please select at least one shade to continue</span>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}