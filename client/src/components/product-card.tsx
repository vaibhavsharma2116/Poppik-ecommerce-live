import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Star, Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [selectedShade, setSelectedShade] = useState<Shade | null>(null);
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
        shade.isActive && shade.productIds && Array.isArray(shade.productIds) && shade.productIds.includes(product.id)
      );
    },
    enabled: !!product?.id,
  });

  // Auto-select first shade when shades are loaded (but don't show shade image in card)
  // Also check if shade was previously selected from URL or localStorage
  useEffect(() => {
    if (productShades.length > 0) {
      // Check if there's a previously selected shade from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const shadeIdFromUrl = urlParams.get('shade');
      const storedShadeKey = `selectedShade_${product?.id}`;
      const storedShadeId = localStorage.getItem(storedShadeKey);
      
      if (shadeIdFromUrl) {
        const shadeToSelect = productShades.find(s => s.id === parseInt(shadeIdFromUrl));
        if (shadeToSelect) {
          setSelectedShade(shadeToSelect);
          localStorage.setItem(storedShadeKey, shadeToSelect.id.toString());
          return;
        }
      } else if (storedShadeId) {
        const shadeToSelect = productShades.find(s => s.id === parseInt(storedShadeId));
        if (shadeToSelect) {
          setSelectedShade(shadeToSelect);
          return;
        }
      }
      
      // Default to first shade if no previous selection
      if (!selectedShade) {
        setSelectedShade(productShades[0]);
        localStorage.setItem(storedShadeKey, productShades[0].id.toString());
      }
    }
  }, [productShades, product?.id]);

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

  const addToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    // Create unique item key based on product and shade
    const itemKey = selectedShade ? `${product.id}-${selectedShade.id}` : `${product.id}`;
    const existingItem = cart.find((cartItem: any) => cartItem.itemKey === itemKey);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        itemKey,
        name: product.name,
        price: `₹${product.price}`,
        originalPrice: product.originalPrice ? `₹${product.originalPrice}` : undefined,
        image: selectedShade?.imageUrl || product.imageUrl,
        quantity: 1,
        inStock: true,
        selectedShade: selectedShade ? {
          id: selectedShade.id,
          name: selectedShade.name,
          colorCode: selectedShade.colorCode,
          imageUrl: selectedShade.imageUrl
        } : null
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartCount", cart.reduce((total: number, item: any) => total + item.quantity, 0).toString());
    window.dispatchEvent(new Event("cartUpdated"));

    const shadeText = selectedShade ? ` (${selectedShade.name})` : '';
    toast({
      title: "Added to Cart",
      description: `${product.name}${shadeText} has been added to your cart`,
    });
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
          {/* {product.saleOffer && (
            <Badge className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-3 py-1 animate-pulse shadow-lg">
              {product.saleOffer}
            </Badge>
          )} */}
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

          {/* Product Shades Display for List View - Color circles only */}
          {productShades.length > 0 && (
            <div className="px-3 py-2 bg-white border-t border-gray-100 rounded-b-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-purple-600">
                  {productShades.length} Shades Available
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {productShades.slice(0, 8).map((shade) => (
                  <Link 
                    key={shade.id} 
                    href={`/product/${product.slug}?shade=${shade.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShade(shade);
                      // Store selected shade in localStorage for persistence
                      localStorage.setItem(`selectedShade_${product.id}`, shade.id.toString());
                    }}
                  >
                    <div
                      className="flex-shrink-0 cursor-pointer"
                      title={shade.name}
                    >
                      <div className="relative p-0.5 group/shade">
                        {/* Outer Ring - Shows on both hover and selection */}
                        {selectedShade?.id === shade.id ? (
                          <div className="absolute -inset-1 rounded-full ring-3 ring-purple-600 ring-offset-2 bg-transparent"></div>
                        ) : (
                          <div className="absolute -inset-1 rounded-full ring-2 ring-gray-400 ring-offset-2 bg-transparent opacity-0 group-hover/shade:opacity-100 transition-opacity duration-200"></div>
                        )}
                        <div
                          className={`w-7 h-7 rounded-full transition-all ${
                            selectedShade?.id === shade.id 
                              ? 'border-2 border-white shadow-xl scale-110 ring-2 ring-purple-600' 
                              : 'border-2 border-gray-300 hover:border-purple-400 hover:scale-105 hover:shadow-lg'
                          }`}
                          style={{ backgroundColor: shade.colorCode }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
                {productShades.length > 8 && (
                  <Link href={`/product/${product.slug}`}>
                    <span className="text-xs text-gray-500 font-medium ml-1 cursor-pointer hover:text-purple-600">+{productShades.length - 8}</span>
                  </Link>
                )}
              </div>
            </div>
          )}
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

            {product.variants?.colors || product.variants?.shades ? (
              <Link href={`/product/${product.slug}`}>
                <Button size="sm" className="w-full text-sm py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  Select Shade
                </Button>
              </Link>
            ) : product.inStock ? (
              <Button 
                size="sm" 
                className="w-full text-sm py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={addToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
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
        {/* {product.saleOffer && (
          <Badge className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 text-xs animate-pulse shadow-lg font-bold">
            {product.saleOffer}
          </Badge>
        )} */}
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

        {/* Product Shades Display - Color circles only */}
        {productShades.length > 0 && (
          <div className="px-2 py-2 bg-white border-t border-gray-100">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {productShades.slice(0, 6).map((shade) => (
                <Link 
                  key={shade.id} 
                  href={`/product/${product.slug}?shade=${shade.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShade(shade);
                    // Store selected shade in localStorage for persistence
                    localStorage.setItem(`selectedShade_${product.id}`, shade.id.toString());
                  }}
                >
                  <div
                    className="flex-shrink-0 cursor-pointer"
                    title={shade.name}
                  >
                    <div className="relative p-0.5 group/shade">
                      {/* Outer Ring - Shows on both hover and selection */}
                      {selectedShade?.id === shade.id ? (
                        <div className="absolute -inset-1 rounded-full ring-3 ring-purple-600 ring-offset-2 bg-transparent"></div>
                      ) : (
                        <div className="absolute -inset-1 rounded-full ring-2 ring-gray-400 ring-offset-2 bg-transparent opacity-0 group-hover/shade:opacity-100 transition-opacity duration-200"></div>
                      )}
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-all ${
                          selectedShade?.id === shade.id 
                            ? 'border-2 border-white shadow-xl scale-110 ring-2 ring-purple-600' 
                            : 'border-2 border-gray-300 hover:border-purple-400 hover:scale-105 hover:shadow-lg'
                        }`}
                        style={{ backgroundColor: shade.colorCode }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
              {productShades.length > 6 && (
                <Link href={`/product/${product.slug}`}>
                  <span className="text-xs text-gray-500 font-medium ml-1 cursor-pointer hover:text-purple-600">+{productShades.length - 6}</span>
                </Link>
              )}
            </div>
          </div>
        )}
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
            <div className="flex items-baseline space-x-2 min-h-[28px]">
              <span className="mobile-product-price text-sm sm:text-base md:text-lg font-bold text-gray-900">
                ₹{Number(product.price).toLocaleString()}
              </span>
              {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                <>
                  <span className="text-xs sm:text-sm text-gray-500 line-through">
                    ₹{Number(product.originalPrice).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                    {discountPercentage}% OFF
                  </span>
                </>
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

          {product.variants?.colors || product.variants?.shades ? (
            <Link href={`/product/${product.slug}`}>
              <Button size="sm" className="w-full text-xs sm:text-sm py-2.5 sm:py-3 min-h-[40px] bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 touch-target">
                Select Shade
              </Button>
            </Link>
          ) : product.inStock ? (
            <Button 
              size="sm" 
              className="w-full text-xs sm:text-sm py-2.5 sm:py-3 min-h-[40px] flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 touch-target"
              onClick={addToCart}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Add to</span> Cart
            </Button>
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
    </div>
  );
}