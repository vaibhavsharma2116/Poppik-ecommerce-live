import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { ChevronRight, Star, ShoppingCart, Heart, ChevronDown, ChevronUp, CheckCircle, Badge, Video, Share2, Copy, Check, Circle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProductCard from "@/components/product-card";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@radix-ui/react-label";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

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
  productIds?: number[]; // Added for filtering shades
}

// Mock Category type for query
interface Category {
  id: number;
  name: string;
}

// Debounce utility to prevent too many requests
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility to limit request frequency
const throttle = (func: Function, limit: number) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func(...args);
    }
  };
};

// Request manager with retry logic and rate limiting
class RequestManager {
  private requestQueue: (() => Promise<any>)[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private minRequestDelay = 100; // minimum 100ms between requests
  private retryCount = 3;
  private retryDelay = 1000; // 1 second

  async executeWithRateLimit(fn: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.executeWithRetry(fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;
    const request = this.requestQueue.shift();

    if (request) {
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestDelay) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minRequestDelay - timeSinceLastRequest)
        );
      }

      this.lastRequestTime = Date.now();
      await request();
    }

    this.isProcessing = false;
    if (this.requestQueue.length > 0) {
      this.processQueue();
    }
  }

  private async executeWithRetry(fn: () => Promise<any>): Promise<any> {
    let lastError;

    for (let i = 0; i < this.retryCount; i++) {
      try {
        const response = await fn();
        
        // Check if response is ok (status 200-299)
        if (response.ok) {
          return response;
        }

        // Handle 429 (Too Many Requests) with exponential backoff
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || String(this.retryDelay * (i + 1)), 10) * 1000;
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue;
        }

        // If not 429 or 5xx, throw immediately
        if (response.status < 500) {
          throw new Error(`HTTP ${response.status}`);
        }

        // For 5xx errors, retry
        if (i < this.retryCount - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.retryDelay * Math.pow(2, i))
          );
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;
        if (i < this.retryCount - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.retryDelay * Math.pow(2, i))
          );
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }
}

const requestManager = new RequestManager();

export default function ProductDetail() {
  const [, params] = useRoute("/product/:slug");
  const productSlugOrId = params?.slug ?? "";
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showAllShades, setShowAllShades] = useState(false);
  const [selectedShades, setSelectedShades] = useState<Shade[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Get shade ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const shadeIdFromUrl = urlParams.get('shade');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState<{ canReview: boolean; orderId?: number; message: string }>({ canReview: false, message: "" });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [shades, setShades] = useState<Shade[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Memoize the product slug to prevent unnecessary re-fetches
  const productSlug = useMemo(() => params?.slug ?? null, [params?.slug]);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: [`/api/products/${productSlug}`],
    enabled: !!productSlug,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch product images from database
  const { data: productImages = [] } = useQuery({
    queryKey: [`/api/products/${product?.id}/images`],
    queryFn: async () => {
      if (!product?.id) return [];

      const response = await requestManager.executeWithRateLimit(() =>
        fetch(`/api/products/${product.id}/images`, { cache: "no-store" })
      );
      if (!response.ok) {
        // Fallback to legacy imageUrl if images API fails
        return product?.imageUrl ? [{ url: product.imageUrl, sortOrder: 0 }] : [];
      }
      return response.json();
    },
    enabled: !!product?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Get image URLs sorted by sortOrder
  const imageUrls = useMemo(() => {
    const urls: string[] = [];

    if (productImages && productImages.length > 0) {
      // Get unique URLs from product images only - use Set to ensure uniqueness
      const imageUrlsFromDb = productImages
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(img => img.url || img.imageUrl)
        .filter(url => url && url.trim() !== ''); // Filter out empty/null URLs

      // Remove duplicates using Set
      const uniqueUrls = Array.from(new Set(imageUrlsFromDb));
      urls.push(...uniqueUrls);
    } else if (product?.imageUrl) {
      urls.push(product.imageUrl);
    }

    // Add video URL at the end if it exists (only if not already in urls)
    if (product?.videoUrl && !urls.includes(product.videoUrl)) {
      urls.push(product.videoUrl);
    }

    return urls;
  }, [productImages, product?.imageUrl, product?.videoUrl]);

  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  // Get all displayable images including selected shade images
  const allDisplayableImages = useMemo(() => {
    const urls: string[] = [];
    
    // Add product images first
    urls.push(...imageUrls);
    
    // Add selected shade images
    selectedShades.forEach(shade => {
      if (shade.imageUrl && !urls.includes(shade.imageUrl)) {
        urls.push(shade.imageUrl);
      }
    });
    
    return urls;
  }, [imageUrls, selectedShades]);

  // Helper: detect base64/data URLs
  const isBase64Image = (u?: string) => {
    if (!u) return false;
    return u.trim().startsWith('data:');
  };

  // Helper: normalize image paths to absolute URLs used for social sharing
  const normalizeImageUrl = (img?: string) => {
    if (!img) return img;
    let resolved = img;
    if (resolved && !resolved.startsWith('http')) {
      if (resolved.startsWith('/api/image/')) {
        const imageId = resolved.split('/').pop();
        resolved = `https://poppiklifestyle.com/uploads/${imageId}`;
      } else if (resolved.startsWith('/api/')) {
        resolved = `https://poppiklifestyle.com${resolved}`;
      } else if (resolved.startsWith('/uploads/')) {
        resolved = `https://poppiklifestyle.com${resolved}`;
      } else if (resolved.startsWith('/')) {
        resolved = `https://poppiklifestyle.com${resolved}`;
      } else {
        resolved = `https://poppiklifestyle.com/${resolved}`;
      }
    }
    return resolved;
  };

  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ['/api/products', { limit: 12 }],
  });

  // Choose best image for meta tags / social sharing.
  // Priority when a shade is selected: shade image.
  // When no shade selected: 1) first non-base64 DB image, 2) product.imageUrl if non-base64,
  // 3) first DB image (even if base64), 4) product.imageUrl (even if base64), 5) fallback.
  const metaImage = useMemo(() => {
    const fallback = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80';

    // 1) Shade selection (explicit or via URL param)
    let shadeToUse: Shade | undefined;
    if (selectedShades && selectedShades.length > 0) {
      shadeToUse = selectedShades[0];
    } else if (shadeIdFromUrl && shades && shades.length > 0) {
      shadeToUse = shades.find(s => s.id === parseInt(shadeIdFromUrl));
    }

    if (shadeToUse && shadeToUse.imageUrl) {
      return normalizeImageUrl(shadeToUse.imageUrl);
    }

    // 2) first non-base64 DB image
    if (productImages && productImages.length > 0) {
      const nonBase = productImages.find((img: any) => {
        const u = img.url || img.imageUrl;
        return u && !isBase64Image(u);
      });
      if (nonBase) return normalizeImageUrl(nonBase.url || nonBase.imageUrl);
    }

    // 3) product.imageUrl if not base64
    if (product?.imageUrl && !isBase64Image(product.imageUrl)) {
      return normalizeImageUrl(product.imageUrl);
    }

    // 4) first DB image even if base64
    if (productImages && productImages.length > 0) {
      const first = productImages[0];
      if (first) return normalizeImageUrl(first.url || first.imageUrl);
    }

    // 5) product.imageUrl even if base64
    if (product?.imageUrl) return normalizeImageUrl(product.imageUrl);

    return fallback;
  }, [selectedShades, shadeIdFromUrl, shades, productImages, product?.imageUrl]);

  useEffect(() => {
    if (imageUrls.length > 0 && !selectedImageUrl) {
      setSelectedImageUrl(imageUrls[0]);
    }
  }, [imageUrls.length, selectedImageUrl]); // Only depend on length and current selection

  // Fetch related products - memoized
  const { data: relatedProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products/related', product?.categoryId, product?.id],
    queryFn: async () => {
      if (!product?.categoryId) return [];
      const response = await fetch('/api/products');
      const data = await response.json();
      return data
        .filter((p: any) => p.categoryId === product.categoryId && p.id !== product.id)
        .slice(0, 4);
    },
    enabled: !!product?.categoryId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Mock category and subcategory data (replace with actual data fetching)
  const categories = [{ id: 1, name: 'skincare' }, { id: 2, name: 'haircare' }];
  const subcategories = [{ id: 3, name: 'face wash' }, { id: 4, name: 'shampoo' }];

  // Fetch shades specifically assigned to this product
  const { data: shadesFromAPI = [] } = useQuery<Shade[]>({
    queryKey: [`/api/products/${product?.id}/shades`],
    queryFn: async () => {
      if (!product?.id) return [];

      const response = await requestManager.executeWithRateLimit(() =>
        fetch(`/api/products/${product.id}/shades`, { cache: "no-store" })
      );
      if (!response.ok) {
        return [];
      }
      const shades = await response.json();

      // ONLY return shades that have this specific product in their productIds array
      return shades.filter((shade: Shade) => {
        // Must have productIds array AND this product must be in it
        if (shade.productIds && Array.isArray(shade.productIds)) {
          return shade.productIds.includes(product.id);
        }

        // If no productIds specified, don't show this shade
        return false;
      });
    },
    enabled: !!product?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Fetch product reviews
  const { data: productReviews = [], refetch: refetchReviews } = useQuery({
    queryKey: [`/api/products/${product?.id}/reviews`],
    queryFn: async () => {
      if (!product?.id) return [];

      const response = await requestManager.executeWithRateLimit(() =>
        fetch(`/api/products/${product.id}/reviews`, { cache: "no-store" })
      );
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!product?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Check if user can review this product
  const { data: reviewEligibility } = useQuery({
    queryKey: [`/api/products/${product?.id}/can-review`],
    queryFn: async () => {
      if (!product?.id) return { canReview: false, message: "" };

      const user = localStorage.getItem("user");
      if (!user) return { canReview: false, message: "Please login to review" };

      const userData = JSON.parse(user);
      const response = await requestManager.executeWithRateLimit(() =>
        fetch(`/api/products/${product.id}/can-review?userId=${userData.id}`, { cache: "no-store" })
      );
      if (!response.ok) {
        return { canReview: false, message: "Unable to check review eligibility" };
      }
      return response.json();
    },
    enabled: !!product?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Consolidate all useEffect hooks to ensure consistent ordering
  useEffect(() => {
    // Set reviews
    if (productReviews && Array.isArray(productReviews)) {
      setReviews(productReviews);
    }
  }, [productReviews]);

  useEffect(() => {
    // Remove affiliateRef from localStorage if product slug is "samar"
    if (productSlugOrId === 'samar') {
      localStorage.removeItem('affiliateRef');
    }
  }, [productSlugOrId]);

  useEffect(() => {
    // Track affiliate click if ref parameter exists
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

    const validateAndTrack = async () => {
      if (!affiliateRef || !product?.id) return;

      try {
        // Validate first
        const vRes = await fetch(`/api/affiliate/validate?code=${encodeURIComponent(affiliateRef)}`);
        if (!vRes.ok) {
          const err = await vRes.json().catch(() => ({}));
          const message = err?.error || 'Invalid affiliate code';
          toast({ title: 'Invalid Affiliate', description: message, variant: 'destructive' });
          // Do not store invalid code
          localStorage.removeItem('affiliateRef');
          // Remove ref parameter from URL
          const cleanUrl = new URL(window.location.toString());
          cleanUrl.searchParams.delete('ref');
          // also remove any direct code param (e.g., ?POPPIKAP29)
          if (window.location.search && !window.location.search.includes('=')) {
            // remove query string entirely
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
          } else {
            window.history.replaceState({}, '', cleanUrl.toString());
          }
          return;
        }

        // Check that the product itself is configured for affiliate (both commission and user discount)
        const commission = Number((product as any)?.affiliateCommission ?? (product as any)?.affiliate_commission ?? 0);
        const userDiscount = Number((product as any)?.affiliateUserDiscount ?? (product as any)?.affiliate_user_discount ?? 0);

        if (!(commission > 0 && userDiscount > 0)) {
          // Affiliate code is valid but not applicable to this product
          toast({ title: 'Not Eligible', description: 'This affiliate code is not valid for this product', variant: 'destructive' });
          localStorage.removeItem('affiliateRef');
          // Remove ref parameter from URL
          const cleanUrl = new URL(window.location.toString());
          cleanUrl.searchParams.delete('ref');
          if (window.location.search && !window.location.search.includes('=')) {
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
          } else {
            window.history.replaceState({}, '', cleanUrl.toString());
          }
          return;
        }

        // If valid and product eligible, track the click
        await fetch('/api/affiliate/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            affiliateCode: affiliateRef,
            productId: product.id,
          }),
        });

        // Store in localStorage for checkout
        localStorage.setItem('affiliateRef', affiliateRef);
        localStorage.setItem('affiliateRefSetAt', String(Date.now()));
      } catch (err) {
        console.error('Error validating/tracking affiliate click:', err);
      }
    };

    validateAndTrack();
  }, [product?.id]);

  useEffect(() => {
    // Set review eligibility
    if (reviewEligibility && typeof reviewEligibility === 'object') {
      setCanReview(reviewEligibility);
    }
  }, [reviewEligibility]);

  useEffect(() => {
    // Set wishlist status
    if (product?.id) {
      const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setIsInWishlist(wishlist.some((item: any) => item.id === product.id));
    }
  }, [product?.id]);

  useEffect(() => {
    // Set shades
    if (shadesFromAPI && Array.isArray(shadesFromAPI)) {
      setShades(shadesFromAPI);

      // Auto-select shade from URL if provided
      if (shadeIdFromUrl && selectedShades.length === 0) {
        const shadeToSelect = shadesFromAPI.find(s => s.id === parseInt(shadeIdFromUrl));
        if (shadeToSelect) {
          setSelectedShades([shadeToSelect]);
          // Set the shade's image as selected image
          if (shadeToSelect.imageUrl) {
            setSelectedImageUrl(shadeToSelect.imageUrl);
          }
        }
      }
    } else {
      setShades([]);
    }
  }, [shadesFromAPI, product?.id, shadeIdFromUrl]);

  const getShadeKey = (shade: any) => String(shade?.id ?? shade?.value ?? shade?.name ?? "");

  const toggleWishlist = useCallback(() => {
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

    try {
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
        // Only store essential data to prevent quota issues
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
  }, [product, toast]);

  const addToCart = useCallback(() => {
    if (!product) return;

    // If product has shades but none selected, show warning
    if (shades.length > 0 && selectedShades.length === 0) {
      toast({
        title: "Select Shades",
        description: "Please select at least one shade before adding to cart",
        variant: "destructive",
      });
      return;
    }

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    // Get affiliate percentage from product data (support both camelCase and snake_case)
    const affiliateCommissionPercentage = parseFloat(String((product as any)?.affiliateCommission ?? (product as any)?.affiliate_commission ?? '0')) || 0;
    const affiliateUserDiscountPercentage = parseFloat(String((product as any)?.affiliateUserDiscount ?? (product as any)?.affiliate_user_discount ?? '0')) || 0;

    // Calculate actual values based on product price
    const productPrice = parseFloat(product.price);
    const affiliateCommissionAmount = affiliateCommissionPercentage > 0 ? (productPrice * affiliateCommissionPercentage) / 100 : 0;
    const affiliateUserDiscountAmount = affiliateUserDiscountPercentage > 0 ? (productPrice * affiliateUserDiscountPercentage) / 100 : 0;

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
            cashbackPercentage: product.cashbackPercentage ? parseFloat(String(product.cashbackPercentage)) : undefined,
            cashbackPrice: product.cashbackPrice ? parseFloat(String(product.cashbackPrice)) : undefined,
            affiliateCommission: affiliateCommissionAmount,
            affiliateUserDiscount: affiliateUserDiscountAmount,
            affiliateCommissionPercentage,
            affiliateUserDiscountPercentage
          });
        }
      });
    } else {
      // No shades - add product directly
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
          cashbackPercentage: product.cashbackPercentage ? parseFloat(String(product.cashbackPercentage)) : undefined,
          cashbackPrice: product.cashbackPrice ? parseFloat(String(product.cashbackPrice)) : undefined,
          affiliateCommission: affiliateCommissionAmount,
          affiliateUserDiscount: affiliateUserDiscountAmount,
          affiliateCommissionPercentage,
          affiliateUserDiscountPercentage
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
  }, [product, quantity, selectedShades, toast, shades.length]);

  const handleShadeSelect = (shade: Shade) => {
    const shadeKey = getShadeKey(shade);
    const isSelected = selectedShades.some(s => getShadeKey(s) === shadeKey);

    if (isSelected) {
      // Remove shade from selection
      const remainingShades = selectedShades.filter(s => getShadeKey(s) !== shadeKey);
      setSelectedShades(remainingShades);

      // If there are remaining shades, show the first remaining shade's image
      if (remainingShades.length > 0 && remainingShades[0].imageUrl) {
        setSelectedImageUrl(remainingShades[0].imageUrl);
        (window as any).isDisplayingShadeImage = true;
      } else if (remainingShades.length === 0 && imageUrls.length > 0) {
        // If no shades left, revert to main product image
        setSelectedImageUrl(imageUrls[0]);
        (window as any).isDisplayingShadeImage = false;
      }

      // Update URL - only keep shade param if shades remain
      const newUrl = new URL(window.location.toString());
      if (remainingShades.length > 0) {
        if ((remainingShades as any)[0]?.id !== undefined && (remainingShades as any)[0]?.id !== null) {
          newUrl.searchParams.set('shade', (remainingShades as any)[0].id.toString());
        } else {
          newUrl.searchParams.delete('shade');
        }
      } else {
        newUrl.searchParams.delete('shade');
      }
      window.history.replaceState({}, '', newUrl.toString());
    } else {
      // Add shade to selection
      const newShades = [...selectedShades, shade];
      setSelectedShades(newShades);

      // Set the newly selected shade's image - PRIORITY: shade image > product image
      if (shade.imageUrl) {
        setSelectedImageUrl(shade.imageUrl);
        // Mark that we're displaying a shade image (not in imageUrls array)
        (window as any).isDisplayingShadeImage = true;
      } else if (imageUrls.length > 0) {
        // Fallback to first product image if shade doesn't have an image
        setSelectedImageUrl(imageUrls[0]);
        (window as any).isDisplayingShadeImage = false;
      }

      // Update URL to include shade parameter
      const newUrl = new URL(window.location.toString());
      if ((shade as any)?.id !== undefined && (shade as any)?.id !== null) {
        newUrl.searchParams.set('shade', (shade as any).id.toString());
      }
      window.history.replaceState({}, '', newUrl.toString());
    }
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

      const response = await requestManager.executeWithRateLimit(() =>
        fetch(`/api/products/${product.id}/reviews`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
      );

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
        className={`w-5 h-5 ${i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300"
          }`}
      />
    ));
  };

  const shareToWhatsApp = useCallback(() => {
    if (!product) return;

    // Use the production URL with proper slug for WhatsApp preview
    const productSlug = product.slug || productSlugOrId;
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname.includes('repl.co')
      ? window.location.origin
      : 'https://poppiklifestyle.com';

    // Use the dedicated share endpoint so social crawlers (WhatsApp) get
    // the server-generated OG tags and image without client-side rendering.
    let url = `${baseUrl}/product/${productSlug}`;

    // If shades are selected, add shade parameter to URL
    if (selectedShades.length > 0) {
      url += `?shade=${selectedShades[0].id}`;
    }

    // WhatsApp will automatically fetch Open Graph tags from the URL
    // Just send the URL - the preview will be generated automatically
    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
  }, [product, productSlugOrId, selectedShades]);

  const shareToFacebook = useCallback(() => {
    const productSlug = product?.slug || productSlugOrId;
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname.includes('repl.co')
      ? window.location.origin
      : 'https://poppiklifestyle.com';
    // Use share endpoint so Facebook crawlers see OG tags immediately
    let url = `${baseUrl}/product/${productSlug}`;

    // If shades are selected, add shade parameter to URL
    if (selectedShades.length > 0) {
      url += `?shade=${selectedShades[0].id}`;
    }

    // Facebook will automatically fetch Open Graph tags from the URL
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  }, [product, productSlugOrId, selectedShades]);

  const shareToTwitter = useCallback(() => {
    const productSlug = product?.slug || productSlugOrId;
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname.includes('repl.co')
      ? window.location.origin
      : 'https://poppiklifestyle.com';
    // Use share endpoint so Twitter crawlers see OG tags immediately
    let url = `${baseUrl}/product/${productSlug}`;

    // If shades are selected, add shade parameter to URL
    if (selectedShades.length > 0) {
      url += `?shade=${selectedShades[0].id}`;
    }

    const text = `Check out ${product?.name} - ₹${product?.price} on Poppik!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  }, [product, productSlugOrId, selectedShades]);

  const copyProductLink = useCallback(async () => {
    const productSlug = product?.slug || productSlugOrId;
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname.includes('repl.co')
      ? window.location.origin
      : 'https://poppiklifestyle.com';

    let url = `${baseUrl}/product/${productSlug}`;

    // If shades are selected, add shade parameter to URL
    if (selectedShades.length > 0) {
      url += `?shade=${selectedShades[0].id}`;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Product link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [product, productSlugOrId, selectedShades, toast]);

  // Optimize image selection effect
  useEffect(() => {
    // Use all displayable images (product + shade images)
    const displayableImages = allDisplayableImages.length > 0 ? allDisplayableImages : imageUrls;
    
    if (displayableImages.length > 0 && !selectedImageUrl) {
      setSelectedImageUrl(displayableImages[0]);
    }
    // Allow selectedImageUrl to be anything in displayable images or shade images
    // This prevents resetting when a shade image is selected
    if (selectedImageUrl && !allDisplayableImages.includes(selectedImageUrl) && !imageUrls.includes(selectedImageUrl)) {
      // Only reset if it's not a valid image at all
      setSelectedImageUrl(displayableImages.length > 0 ? displayableImages[0] : '');
    }
  }, [imageUrls, allDisplayableImages, selectedImageUrl]);

  if (!productSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

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

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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

  // Filter related products to exclude the current product and limit to 4
  const filteredRelatedProducts = relatedProducts?.filter(p => p.id !== product.id).slice(0, 4) || [];

  // Price and related-products helpers used in several UI sections
  const originalPrice = product?.originalPrice || product?.price || 0;
  const price = product?.price || 0;
  const discountPercentage = originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const includedProducts = Array.isArray(filteredRelatedProducts) ? filteredRelatedProducts : [];

  // Define productSlug for meta tags - use product.slug if available, otherwise use productSlugOrId
  const productSlugForMeta = product.slug || productSlugOrId;

  return (
    <>
      <Helmet>
        <title>{product?.name ? `${product.name} - Poppik Lifestyle` : 'Product - Poppik Lifestyle'}</title>
        <meta name="description" content={product?.shortDescription || product?.description || 'Shop premium beauty products at Poppik Lifestyle'} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="Poppik Lifestyle" />
        <meta property="og:url" content={`https://poppiklifestyle.com/product/${productSlugForMeta}`} />
        <meta property="og:title" content={product?.name ? `${product.name} - ₹${product.price} | Poppik Lifestyle` : 'Product - Poppik Lifestyle'} />
        <meta property="og:description" content={product?.shortDescription || product?.description || 'Shop premium beauty products at Poppik Lifestyle'} />

        {/* Force refresh OG cache */}
        <meta property="og:updated_time" content={new Date().toISOString()} />
        <meta property="og:image" content={metaImage} />
        <meta property="og:image:secure_url" content={metaImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={product?.name || 'Product Image'} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:locale" content="en_IN" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@PoppikLifestyle" />
        <meta name="twitter:creator" content="@PoppikLifestyle" />
        <meta name="twitter:url" content={`https://poppiklifestyle.com/product/${productSlugForMeta}`} />
        <meta name="twitter:title" content={product?.name ? `${product.name} - ₹${product.price} | Poppik Lifestyle` : 'Product - Poppik Lifestyle'} />
        <meta name="twitter:description" content={product?.shortDescription || product?.description || 'Shop premium beauty products at Poppik Lifestyle'} />
        <meta name="twitter:image" content={metaImage} />
        <meta name="twitter:image:alt" content={product?.name || 'Product Image'} />

        {/* Product specific meta */}
        {product?.price && <meta property="product:price:amount" content={product.price.toString()} />}
        {product?.price && <meta property="product:price:currency" content="INR" />}
        {product.inStock !== undefined && <meta property="product:availability" content={product.inStock ? "in stock" : "out of stock"} />}
        {product?.category && <meta property="product:category" content={product.category} />}
        {product?.rating && <meta property="product:rating:value" content={product.rating.toString()} />}
        {product?.reviewCount && <meta property="product:rating:count" content={product.reviewCount.toString()} />}

        <link rel="canonical" href={`https://poppiklifestyle.com/product/${productSlugForMeta}`} />
      </Helmet>
      <div className="min-h-screen bg-white py-8 sm:py-16">
        <div className="max-w-7xl mx-auto product-detail-container lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm mb-6 sm:mb-8 bg-white breadcrumb-mobile sm:px-6 sm:py-4">
            <Link href="/" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 text-purple-400" />
            {product.category && (
              <Link href={`/category/${product.category}`} className="text-purple-600 hover:text-purple-700 capitalize font-medium transition-colors">
                {product.category}
              </Link>
            )}
            {product.category && <ChevronRight className="h-4 w-4 text-purple-400" />}
            <span className="text-gray-900 font-semibold">{product.name}</span>
          </nav>

          {/* Product Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-16">
            {/* Product Images - Expanded */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/20">
                  <div className="space-y-4">
                    {/* Vertical Layout: Thumbnails on Left, Main Image on Right */}
                    <div className="flex gap-4">
                      {/* Thumbnail Column - Swipeable Vertical Carousel */}
                      {allDisplayableImages.length > 1 && (
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
                                    // If at top, select first image
                                    visibleIndex = 0;
                                  } else if (isAtBottom) {
                                    // If at bottom, select last image
                                    visibleIndex = allDisplayableImages.length - 1;
                                  } else {
                                    // Calculate middle visible item with better accuracy
                                    const scrollCenter = scrollTop + (clientHeight / 2);
                                    visibleIndex = Math.min(
                                      Math.max(0, Math.round(scrollCenter / itemHeight)),
                                      allDisplayableImages.length - 1
                                    );
                                  }

                                  // Auto-select image based on scroll position only if not manually clicked
                                  if (allDisplayableImages[visibleIndex] && allDisplayableImages[visibleIndex] !== selectedImageUrl) {
                                    setSelectedImageUrl(allDisplayableImages[visibleIndex]);
                                  }
                                }, 150); // 150ms debounce
                              }}
                            >
                              {allDisplayableImages.map((imageUrl, index) => {
                                // Better video detection
                                const isVideo = imageUrl?.endsWith('.mp4') ||
                                  imageUrl?.endsWith('.webm') ||
                                  imageUrl?.endsWith('.mov') ||
                                  imageUrl?.includes('video') ||
                                  imageUrl?.match(/\.(mp4|webm|mov)(\?|$)/i);

                                return (
                                  <button
                                    key={`thumb-${index}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();

                                      // Set flag to prevent scroll handler from interfering
                                      (window as any).thumbnailClickInProgress = true;

                                      // Immediately set the selected image
                                      setSelectedImageUrl(imageUrl);

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
                                    className={`w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:border-purple-300 flex-shrink-0 relative ${selectedImageUrl === imageUrl
                                        ? 'border-purple-500 ring-2 ring-purple-200 scale-105'
                                        : 'border-gray-200'
                                      }`}
                                    style={{ scrollSnapAlign: 'start' }}
                                  >
                                    <div className="w-full h-full flex items-center justify-center p-1 bg-white rounded-lg">
                                      {isVideo ? (
                                        <>
                                          <video
                                            src={imageUrl}
                                            className="w-full h-full object-cover rounded"
                                            muted
                                            autoPlay
                                            loop
                                            style={{
                                              objectFit: 'cover',
                                              width: '100%',
                                              height: '100%',
                                              borderRadius: '6px'
                                            }}
                                          />
                                          {/* Video play icon overlay */}
                                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                            </svg>
                                          </div>
                                        </>
                                      ) : (
                                        <img
                                          src={imageUrl}
                                          alt={`${product.name} view ${index + 1}`}
                                          className="w-full h-full object-contain rounded-lg hover:scale-110 transition-transform duration-200"
                                          width={80}
                                          height={80}
                                          style={{
                                            objectFit: 'contain',
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '6px'
                                          }}
                                        />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Navigation Arrows for Better UX */}
                          {allDisplayableImages.length > 3 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();

                                  // Set flag to prevent scroll handler interference
                                  (window as any).thumbnailClickInProgress = true;

                                  const currentIndex = allDisplayableImages.findIndex(img => img === selectedImageUrl);

                                  // Circular navigation - if on first image, go to last
                                  const prevIndex = currentIndex <= 0 ? allDisplayableImages.length - 1 : currentIndex - 1;
                                  setSelectedImageUrl(allDisplayableImages[prevIndex]);

                                  const container = document.getElementById('thumbnail-container');
                                  if (container) {
                                    if (currentIndex <= 0) {
                                      // Going to last image - scroll to bottom
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
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.preventDefault();

                                  // Set flag to prevent scroll handler interference
                                  (window as any).thumbnailClickInProgress = true;

                                  const currentIndex = allDisplayableImages.findIndex(img => img === selectedImageUrl);

                                  // Circular navigation - if on last image, go to first
                                  const nextIndex = currentIndex >= allDisplayableImages.length - 1 ? 0 : currentIndex + 1;
                                  const container = document.getElementById('thumbnail-container');

                                  if (container) {
                                    if (currentIndex >= allDisplayableImages.length - 1) {
                                      // Going to first image - scroll to top
                                      container.scrollTo({
                                        top: 0,
                                        behavior: 'smooth'
                                      });
                                    } else if (nextIndex === allDisplayableImages.length - 1) {
                                      // Going to last image - scroll to bottom
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

                                    // Set image after a small delay to sync with scroll
                                    setTimeout(() => {
                                      setSelectedImageUrl(allDisplayableImages[nextIndex]);

                                      // Clear flag after complete
                                      setTimeout(() => {
                                        (window as any).thumbnailClickInProgress = false;
                                      }, 400);
                                    }, 100);
                                  } else {
                                    setSelectedImageUrl(allDisplayableImages[nextIndex]);
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
                                height: `${Math.min(100, (3 / allDisplayableImages.length) * 100)}%`,
                                transform: `translateY(${(allDisplayableImages.findIndex(img => img === selectedImageUrl) / Math.max(1, allDisplayableImages.length - 3)) * (64 - Math.min(64, (3 / allDisplayableImages.length) * 64))}px)`
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Main Image/Video with Zoom */}
                      <div className="flex-1 bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg relative group cursor-zoom-in" style={{ aspectRatio: '1/1', minHeight: '300px', height: '400px', width: '100%', position: 'relative' }}>
                        <div className="w-full h-full flex items-center justify-center p-2" style={{ position: 'relative' }}>
                          {/* Better video detection */}
                          {(() => {
                            const currentUrl = selectedImageUrl || imageUrls[0];
                            const isVideo = currentUrl?.match(/\.(mp4|webm|mov)(\?|$)/i);

                            if (isVideo) {
                              return (
                                <video
                                  src={currentUrl}
                                  className="w-full h-full object-contain rounded-xl sm:rounded-2xl"
                                  controls
                                  autoPlay
                                  poster={imageUrls.find(url => !url.match(/\.(mp4|webm|mov)(\?|$)/i)) || product.imageUrl}
                                  width={400}
                                  height={400}
                                />
                              );
                            } else if (currentUrl) {
                              return (
                                <img
                                  src={currentUrl}
                                  alt={product.name}
                                  className="w-full h-full object-contain rounded-xl sm:rounded-2xl group-hover:scale-105 sm:group-hover:scale-110"
                                  width={400}
                                  height={400}
                                  fetchpriority="high"
                                  decoding="async"
                                  onClick={() => {
                                    // Create zoom modal
                                    const modal = document.createElement('div');
                                    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4';
                                    modal.onclick = () => modal.remove();

                                    const img = document.createElement('img');
                                    img.src = currentUrl;
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
                              );
                            } else {
                              return (
                                <div className="w-full h-full bg-gray-200 rounded-xl sm:rounded-2xl flex items-center justify-center">
                                  <span className="text-gray-500">No media available</span>
                                </div>
                              );
                            }
                          })()}
                        
                        {/* Share overlay: small circular button on top-right of image */}
                        <div className="absolute top-3 right-3 z-30">
                          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                aria-label="Share product"
                                className="bg-white/80 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-lg border border-gray-100 text-purple-600 hover:text-purple-700 transition-colors"
                              >
                                <Share2 className="w-5 h-5" />
                              </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                  Share Product
                                </DialogTitle>
                                <DialogDescription>
                                  Share this product with your friends and family
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3 py-4">
                                <Button
                                  variant="outline"
                                  className="w-full justify-start gap-3 h-12 hover:bg-green-50 hover:border-green-300 transition-colors"
                                  onClick={shareToWhatsApp}
                                >
                                  <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                  </svg>
                                  WhatsApp
                                </Button>

                                <Button
                                  variant="outline"
                                  className="w-full justify-start gap-3 h-12 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                  onClick={shareToFacebook}
                                >
                                  <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                  </svg>
                                  Facebook
                                </Button>

                                <Button
                                  variant="outline"
                                  className="w-full justify-start gap-3 h-12 hover:bg-sky-50 hover:border-sky-300 transition-colors"
                                  onClick={shareToTwitter}
                                >
                                  <svg className="h-6 w-6 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                  </svg>
                                  Twitter
                                </Button>

                                <div className="relative">
                                  <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                  </div>
                                  <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-500">Or</span>
                                  </div>
                                </div>

                                <Button
                                  variant="outline"
                                  className="w-full justify-start gap-3 h-12 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                                  onClick={copyProductLink}
                                >
                                  {copied ? (
                                    <Check className="h-6 w-6 text-green-600" />
                                  ) : (
                                    <Copy className="h-6 w-6 text-purple-600" />
                                  )}
                                  {copied ? "Link Copied!" : "Copy Link"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        </div>

                        {/* Zoom Hint - Only for images */}
                        {(() => {
                          const currentUrl = selectedImageUrl || imageUrls[0];
                          const isVideo = currentUrl?.match(/\.(mp4|webm|mov)(\?|$)/i);
                          return !isVideo && (
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to zoom
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Image Count Indicator */}
                    {allDisplayableImages.length > 1 && (
                      <div className="text-center text-sm text-gray-500">
                        {allDisplayableImages.findIndex(img => img === selectedImageUrl) + 1} of {allDisplayableImages.length} images
                      </div>
                    )}
                  </div>


                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
              {/* Product Info */}
              <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                <div className="bg-white p-4 rounded-none shadow-none border-none">
                  {/* Product badges */}
                  <div className="flex gap-3 mb-6"></div>

                  <h1 className="product-detail-title sm:text-4xl text-gray-900 mb-3 sm:mb-4">{product.name}</h1>

                  <div className="product-detail-description sm:text-lg text-gray-600 mb-4 sm:mb-6" dangerouslySetInnerHTML={{ __html: product.shortDescription || product.description || '' }} />

                  {/* Rating */}
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                    <div className="flex">
                      {renderStars(parseFloat(product.rating))}
                    </div>
                    <span className="product-detail-rating sm:text-xl font-bold text-gray-900">{product.rating}</span>
                    <span className="text-sm sm:text-base text-gray-600 font-medium">({product.reviewCount !== undefined && product.reviewCount !== null ? product.reviewCount.toLocaleString() : ""} reviews)</span>
                  </div>

                  {/* Shades preview (compact) removed — use circular selector below */}

                  {/* Size */}
                  {product.size && (
                    <div className="mb-6">
                      <span className="text-gray-700 font-bold">Size: </span>
                      <span className="text-gray-900 font-semibold bg-gray-100 px-3 py-1 rounded-lg">{product.size}</span>
                    </div>
                  )}

                  {/* Shades Selection - Only show if product has shades (grouped by series/collection) */}
                  {shades.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <label className="text-gray-700 font-bold text-lg">
                          Select Shades: {selectedShades.length > 0 ? (
                            <span className="text-purple-600 font-normal">
                              ({selectedShades.length} selected)
                            </span>
                          ) : (
                            <span className="text-gray-500 font-normal">
                              No shades selected
                            </span>
                          )}
                        </label>
                        {selectedShades.length > 0 && (
                          <button
                            onClick={() => setSelectedShades([])}
                            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      {(() => {
                        // Group shades by `series` or `collection` or fallback to 'Default'
                        const groupsMap = new Map();
                        shades.forEach((s: any) => {
                          const key = s.series || s.collection || 'Default';
                          if (!groupsMap.has(key)) groupsMap.set(key, []);
                          groupsMap.get(key).push(s);
                        });

                        // Preserve sort order inside each group if sortOrder exists
                        const groups = Array.from(groupsMap.entries()).map(([series, list]) => ({
                          series,
                          list: (list as any[]).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                        }));

                        // Flattened shades for showAll / collapsed logic
                        const flattened = groups.flatMap(g => g.list);
                        const shadesToShowFlat = showAllShades ? flattened : flattened.slice(0, 5);

                        return groups.map((g: any) => {
                          // Only render group if it has at least one shade in the current visible set
                          const visibleShades = g.list.filter((s: any) => shadesToShowFlat.some((ss: any) => ss.id === s.id));
                          if (visibleShades.length === 0) return null;

                          return (
                            <div key={g.series} className="mb-4">
                              <div className="text-sm font-semibold text-gray-700 mb-2">{g.series}</div>
                              <div className="grid grid-cols-5 gap-3">
                                {visibleShades.map((shade: any) => {
                                  const shadeKey = getShadeKey(shade);
                                  const isSelected = selectedShades.some((s: any) => getShadeKey(s) === shadeKey);
                                  const hasSelection = selectedShades.length > 0;

                                  const swatchWrapperClass = `w-12 h-12 rounded-full border-2 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl ${isSelected
                                    ? 'border-4 border-purple-600 ring-2 ring-purple-300 ring-offset-2 scale-105'
                                    : hasSelection
                                      ? 'border-2 border-purple-200 ring-1 ring-purple-200 ring-offset-2 hover:border-purple-400'
                                      : 'border-2 border-gray-300 hover:border-purple-400'
                                    }`;
                                  return (
                                    <div
                                      key={shadeKey}
                                      className="flex flex-col items-center cursor-pointer"
                                      onClick={() => handleShadeSelect(shade)}
                                    >
                                      <div className="relative">

                                        {hasSelection && (
                                          <div
                                            className={`absolute -top-1 -right-1 rounded-full p-1 shadow-lg z-20 transition-colors ${isSelected
                                              ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                                              : 'bg-white border border-purple-300'
                                              }`}
                                          >
                                            {isSelected ? (
                                              <Check className="w-3 h-3 text-white" />
                                            ) : (
                                              <Circle className="w-3 h-3 text-gray-300" />
                                            )}
                                          </div>
                                        )}
                                        {shade.imageUrl ? (
                                          <div className={swatchWrapperClass} title={shade.name}>
                                            <img
                                              src={shade.imageUrl}
                                              alt={shade.name}
                                              className="w-full h-full rounded-full object-cover block"
                                            />
                                          </div>
                                        ) : (
                                          <div className={swatchWrapperClass} title={shade.name}>
                                            <div
                                              className="w-full h-full rounded-full"
                                              style={{ backgroundColor: shade.colorCode }}
                                            ></div>
                                          </div>
                                        )}
                                      </div>
                                      <span className={`text-xs mt-2 text-center leading-tight transition-colors ${isSelected
                                          ? 'text-purple-700 font-semibold'
                                          : 'text-gray-600 hover:text-purple-600'
                                        }`}>

                                        {shade.name.split(' ').slice(0, 2).join(' ')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}

                      {/* View All / Show Less Button (based on flattened count) */}
                      {!showAllShades && shades.length > 5 && (
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

                      {showAllShades && shades.length > 5 && (
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

                      {/* Show selected shades preview */}
                      {selectedShades.length > 0 && (
                        <div className="mt-3 bg-purple-50 p-3 rounded-lg border border-purple-200">
                          <p className="text-sm font-semibold text-purple-700 mb-2">Selected Shades:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedShades.map(shade => (
                              <div key={shade.id} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-full border border-purple-300 shadow-sm">
                                {shade.imageUrl ? (
                                  <img src={shade.imageUrl} alt={shade.name} className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: shade.colorCode }} />
                                )}
                                <span className="text-xs font-medium text-purple-700">{shade.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show warning if no shade is selected */}
                      {selectedShades.length === 0 && (
                        <>
                          <p className="text-sm text-red-500 font-semibold mt-3">
                            ⚠️ Please select at least one shade before adding to cart
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            If you’re facing challenges in selecting the right shade, you can discuss it with our beauty experts and make the perfect choice.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
                    <span className="product-detail-price sm:text-4xl text-green-600 font-bold">₹{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-lg sm:text-2xl text-gray-500 line-through">₹{product.originalPrice}</span>
                    )}
                  </div>

                  {/* Cashback Badge */}
                  {product.cashbackPercentage && product.cashbackPrice && (
                    <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-orange-700">Get Cashback</span>
                          <p className="text-xs text-orange-600 mt-0.5">Earn on this purchase</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-orange-600">
                            ₹{Number(product.cashbackPrice).toFixed(2)}
                          </span>
                          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-semibold">
                            {product.cashbackPercentage}% Cashback
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Affiliate Info - show only when product configured for affiliates AND an affiliate ref exists in localStorage */}
                  {((product as any)?.affiliateCommission ?? (product as any)?.affiliate_commission) > 0 &&
                    ((product as any)?.affiliateUserDiscount ?? (product as any)?.affiliate_user_discount) > 0 &&
                    localStorage.getItem('affiliateRef') && (
                      <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-purple-700">Affiliate Details</span>
                            <p className="text-xs text-purple-600 mt-0.5">This product is eligible for affiliate rewards.</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-purple-700">Customer Discount: {Number((product as any).affiliateUserDiscount ?? (product as any).affiliate_user_discount ?? 0)}%</p>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-600">
                          <span>Using affiliate code <strong className="text-gray-800">{localStorage.getItem('affiliateRef')}</strong>. Discount will apply at checkout.</span>
                        </div>
                      </div>
                  )}

                  {/* Quantity Selector */}
                  <div className="mb-6">
                    <label className="text-gray-700 font-bold text-lg mb-3 block">Quantity:</label>
                    <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-3 w-fit">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="h-10 w-10 rounded-full border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-30"
                      >
                        <Minus className="h-4 w-4 text-purple-600" />
                      </Button>
                      <div className="text-center min-w-[3rem]">
                        <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{quantity}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                        className="h-10 w-10 rounded-full border-2 border-purple-200 hover:border-purple-400 hover:bgpurple-50"
                      >
                        <Plus className="h-4 w-4 text-purple-600" />
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex product-detail-buttons sm:flex-row sm:space-x-4 sm:space-y-0 mb-4 sm:mb-6">
                    {product.inStock ? (
                      <>
                        <Button
                          size="lg"
                          className="product-detail-button bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg sm:rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          onClick={addToCart}
                          disabled={shades.length > 0 && selectedShades.length === 0}
                        >
                          <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          {shades.length > 0 && selectedShades.length > 0 
                            ? `Add ${selectedShades.length} Shade${selectedShades.length > 1 ? 's' : ''} to Cart` 
                            : 'Add to Cart'}
                        </Button>
                        <Button size="lg" variant="outline" className="border-2 border-purple-200 hover:border-purple-400 rounded-lg sm:rounded-xl p-3 sm:p-4 transform hover:scale-105 transition-all duration-200" onClick={toggleWishlist}>
                          <Heart className={`w-5 h-5 sm:w-6 sm:h-5 ${isInWishlist ? "fill-red-600 text-red-600" : "text-purple-500"}`} />
                        </Button>
                      </>
                    ) : (
                      <Button size="lg" className="product-detail-button bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold rounded-lg sm:rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex-1" onClick={toggleWishlist}>
                        <Heart className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 ${isInWishlist ? 'fill-current' : ''}`} />
                        {isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                      </Button>
                    )}
                    {/* Share button moved to image overlay (top-right) */}
                  </div>

                  {/* Stock status */}
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded-full animate-pulse ${product.inStock
                        ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                        : 'bg-gradient-to-r from-red-400 to-rose-400'
                      }`}></div>
                    <span className={`font-bold text-sm sm:text-base md:text-lg ${product.inStock ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Information Tabs */}
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
                value="ingredients" 
                className="py-2.5 px-1 sm:py-3 sm:px-2 md:py-4 md:px-6 text-[10px] sm:text-xs md:text-sm font-medium rounded-md sm:rounded-lg md:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                Ingredients
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
                    { (product?.detailedDescription || product?.description) ? (
                      typeof (product?.detailedDescription || product?.description) === 'string' && (product?.detailedDescription || product?.description).includes('<') ? (
                        <div
                          className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                          dangerouslySetInnerHTML={{ __html: product?.detailedDescription || product?.description }}
                        />
                      ) : (
                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal whitespace-pre-line">{product?.detailedDescription || product?.description}</p>
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

            <TabsContent value="ingredients" className="m-0">
              <Card className="border-0 shadow-xl sm:shadow-2xl bg-gradient-to-br from-green-50/80 to-white/80 backdrop-blur-md rounded-xl sm:rounded-3xl border border-white/20">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full"></div>
                    </div>
                    Ingredients
                  </CardTitle>
                </CardHeader>
                  <CardContent className="pt-0">
                      {product.ingredients ? (
                        // If ingredients contain HTML (saved from RichTextEditor), render it as HTML
                        (typeof product.ingredients === 'string' && product.ingredients.includes('<')) ? (
                          <div className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none" dangerouslySetInnerHTML={{ __html: product.ingredients }} />
                        ) : (
                          <ul className="space-y-2">
                            {(Array.isArray(product.ingredients)
                              ? product.ingredients
                              : product.ingredients.split('\n').filter(ingredient => ingredient.trim())
                            ).map((ingredient, index) => (
                              <li key={index} className="flex items-start text-gray-700">
                                <span className="mr-3 text-pink-500 font-bold">•</span>
                                <span>{ingredient.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        <p className="text-gray-500 text-center py-8">Ingredient information not available.</p>
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
                  {product?.benefits ? (
                    typeof product.benefits === 'string' && product.benefits.includes('<') ? (
                      <div
                        className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ __html: product.benefits }}
                      />
                    ) : (
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal">{product.benefits}</p>
                      </div>
                    )
                  ) : (
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal">Complete beauty routine and essential benefits. Save ₹{(originalPrice - price).toLocaleString()} with this product. Get {discountPercentage}% discount on the original price. Premium quality products at competitive prices. {includedProducts.length ? `Includes ${includedProducts.length} carefully curated items` : ''}</p>
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
                  {product?.howToUse ? (
                    typeof product.howToUse === 'string' && product.howToUse.includes('<') ? (
                      <div
                        className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ __html: product.howToUse }}
                      />
                    ) : (
                      <div className="prose prose-gray max-w-none bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border border-purple-100/50">
                        <p className="text-gray-700 leading-relaxed text-base sm:text-lg font-normal mb-0 whitespace-pre-line">{product.howToUse}</p>
                      </div>
                    )
                  ) : (
                    <div className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border border-purple-100/50">
                      <div className="text-gray-700 leading-relaxed text-base sm:text-lg space-y-3 sm:space-y-4">
                        <p className="font-normal">
                          Follow the individual product instructions included with this product for best results.
                          Use as part of your daily beauty routine.
                        </p>
                        {includedProducts.length > 0 && (
                          <div className="mt-4">
                            <p className="font-semibold text-lg mb-3">Usage Steps:</p>
                            <ol className="list-decimal list-inside space-y-2.5">
                              {includedProducts.map((p: any, index: number) => (
                                <li key={index} className="font-normal">
                                  Use {typeof p === 'string' ? p : p.name} as directed
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        <p className="mt-4 text-sm text-gray-600 font-normal">
                          For best results, follow the product instructions and combine with complementary items when recommended.
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
                            className={`w-8 h-8 ${star <= reviewRating
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
                <p className="text-gray-600 font-medium">Based on {reviews.length > 0 ? reviews.length : product.reviewCount !== undefined && product.reviewCount !== null ? product.reviewCount.toLocaleString() : ""} reviews</p>
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
    </>
  );
}