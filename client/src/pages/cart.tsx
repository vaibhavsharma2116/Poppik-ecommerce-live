import { useState, useEffect } from "react";
import { apiUrl } from '@/lib/api';
import { Link, useLocation } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import ProductCard from "@/components/product-card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label"; // Assuming Label is in ui/label
import { WalletIcon } from "lucide-react"; // Assuming WalletIcon is needed

interface CartItem {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  image: string;
  quantity: number;
  variant?: string;
  inStock: boolean;
  cashbackPercentage?: string;
  cashbackPrice?: string;

  selectedShade?: {
    id: number;
    name: string;
    colorCode: string;
    imageUrl?: string;
  };
  // Offer-specific fields
  offerId?: number;
  productId?: number;
  discountType?: string;
  discountAmount?: number;
  isOfferItem?: boolean;
  itemKey?: string;
  productNames?: string[];
  offerTitle?: string;
  totalProducts?: number;
  discountValue?: number;
  // Affiliate fields
  affiliate_user_discount?: number;
  affiliate_commission?: number;
  affiliateCommission?: number;
  affiliateUserDiscount?: number;
}

// Placeholder for user object, assuming it's fetched elsewhere or available in context
interface User {
  id: string | number;
  // other user properties
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [hasPromoCode, setHasPromoCode] = useState(false);

  // Affiliate discount states - removed static values
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [affiliateDiscount, setAffiliateDiscount] = useState<number>(0);

  // Wallet cashback states
  const [walletAmount, setWalletAmount] = useState<number>(0);
  const [affiliateWalletAmount, setAffiliateWalletAmount] = useState<number>(0);

  const [promoError, setPromoError] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingToWishlist, setSavingToWishlist] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation(); // Get navigation function from useLocation
  const [showGiftMilestoneBlast, setShowGiftMilestoneBlast] = useState(false);
  const [giftMilestoneBlastMessage, setGiftMilestoneBlastMessage] = useState<string | null>(null);
  const [giftMilestoneBlastConfetti, setGiftMilestoneBlastConfetti] = useState<
    Array<{ id: number; left: number; delay: number; duration: number; rotate: number; size: number; color: string }>
  >([]);
  const [giftMilestoneBlastKey, setGiftMilestoneBlastKey] = useState(0);

  const closeGiftMilestoneBlast = () => {
    setShowGiftMilestoneBlast(false);
    setGiftMilestoneBlastMessage(null);
    setGiftMilestoneBlastConfetti([]);
  };

  // Placeholder for user data, replace with actual user context or hook
  const [user, setUser] = useState<User | null>(null);
  const [isAffiliate, setIsAffiliate] = useState(false);

  // Fetch announcements for dynamic offers
  const { data: announcements = [] } = useQuery({
    queryKey: ['/api/announcements'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/announcements');
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch recommended products
  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ['/api/products', { limit: 12 }],
    queryFn: async () => {
      try {
        const res = await fetch('/api/products?limit=12');
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch gift milestones from backend
  const { data: giftMilestones = [] } = useQuery({
    queryKey: ['/api/gift-milestones'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/gift-milestones');
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const giftMilestonesSorted = Array.isArray(giftMilestones)
    ? [...giftMilestones].sort((a: any, b: any) => {
        const aMin = parseFloat(String(a?.minAmount ?? "0"));
        const bMin = parseFloat(String(b?.minAmount ?? "0"));
        if (Number.isNaN(aMin) && Number.isNaN(bMin)) return 0;
        if (Number.isNaN(aMin)) return 1;
        if (Number.isNaN(bMin)) return -1;
        return aMin - bMin;
      })
    : [];

  // Fetch wallet data
  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const res = await fetch(apiUrl(`/api/wallet?userId=${user.id}`), {
          credentials: 'include',
        });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch affiliate wallet data
  const { data: affiliateWalletData } = useQuery({
    queryKey: ['/api/affiliate/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const res = await fetch(apiUrl(`/api/affiliate/wallet?userId=${user.id}`), {
          credentials: 'include',
        });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch affiliate application status
  const { data: affiliateApplication } = useQuery({
    queryKey: ['/api/affiliate/my-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const res = await fetch(`/api/affiliate/my-application?userId=${user.id}`, {
          credentials: 'include',
        });
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update affiliate status based on application approval
  useEffect(() => {
    if (affiliateApplication?.status === 'approved') {
      setIsAffiliate(true);
    } else {
      setIsAffiliate(false);
    }
  }, [affiliateApplication]);

  // Load cart from localStorage on component mount
  useEffect(() => {
    // Attempt to load user data from localStorage
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    // Check for affiliate code in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode && refCode.toUpperCase().startsWith('POPPIKAP')) {
      // Store affiliate code in localStorage for later use (use existing key 'affiliateRef')
      localStorage.setItem('affiliateRef', refCode.toUpperCase());

      // Also set it in state so it can be applied
      setAffiliateCode(refCode.toUpperCase());

      toast({
        title: "Affiliate Code Found",
        description: `Affiliate code ${refCode.toUpperCase()} has been saved. Apply it in your cart to get the discount!`,
      });
    } else if (localStorage.getItem('affiliateRef')) {
      // Load saved affiliate code from previous visit
      const savedRefCode = localStorage.getItem('affiliateRef');
      if (savedRefCode) {
        setAffiliateCode(savedRefCode);
      }
    }

    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Ensure all items have required fields
        const validCart = parsedCart.filter((item: any) =>
          item && item.id && item.name && item.price
        );
        setCartItems(validCart);
      } catch (error) {
        console.error("Error parsing cart data:", error);
        setCartItems([]);
        toast({
          title: "Cart Error",
          description: "There was an issue loading your cart. Please try again.",
          variant: "destructive",
        });
      }
    }
    setLoading(false);

    // Listen for cart updates from other components
    const handleCartUpdate = () => {
      const updatedCart = localStorage.getItem("cart");
      if (updatedCart) {
        try {
          const parsedCart = JSON.parse(updatedCart);
          const validCart = parsedCart.filter((item: any) =>
            item && item.id && item.name && item.price
          );
          setCartItems(validCart);
        } catch (error) {
          console.error("Error parsing cart data:", error);
        }
      }
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, []);

  // Save cart to localStorage whenever cartItems changes
  useEffect(() => {
    if (!loading) {
      // Save cart as-is, affiliate fields are already set from product data
      localStorage.setItem("cart", JSON.stringify(cartItems));
      localStorage.setItem("cartCount", cartItems.reduce((total, item) => total + item.quantity, 0).toString());
    }
  }, [cartItems, loading]);

  // Save redeemAmount to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('redeemAmount', walletAmount.toString());
  }, [walletAmount]);

  // Save affiliateWalletAmount to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('affiliateWalletAmount', affiliateWalletAmount.toString());
  }, [affiliateWalletAmount]);

  const subtotal = cartItems.reduce((sum, item) => {
    const base = item.originalPrice ?? item.price;
    const price = parseFloat(String(base ?? "0").replace(/[₹,]/g, ""));
    if (Number.isNaN(price)) return sum;
    return sum + price * (item.quantity || 0);
  }, 0);

  const cartSubtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(String(item.price ?? "0").replace(/[₹,]/g, ""));
    if (Number.isNaN(price)) return sum;
    return sum + price * (item.quantity || 0);
  }, 0);

  const productDiscount = Math.max(0, Math.round(subtotal - cartSubtotal));

  const totalAffiliateDiscountFromItems = cartItems.reduce((total, item) => {
    if (item.affiliateUserDiscount) {
      return total + Number(item.affiliateUserDiscount) * item.quantity;
    }
    return total;
  }, 0);

  const totalAffiliateCommissionFromItems = cartItems.reduce((total, item) => {
    if (item.affiliateCommission) {
      return total + Number(item.affiliateCommission) * item.quantity;
    }
    return total;
  }, 0);

  const subtotalAfterAffiliate = Math.max(0, cartSubtotal - totalAffiliateDiscountFromItems);

  useEffect(() => {
    if (giftMilestonesSorted.length === 0) return;

    const storageKey = 'lastCelebratedGiftMilestoneId';

    try {
      const rawLast = localStorage.getItem(storageKey);
      const lastId = rawLast ? Number(rawLast) : null;
      if (lastId) {
        const lastMilestone = giftMilestonesSorted.find((m: any) => Number(m?.id) === Number(lastId));
        if (lastMilestone) {
          const lastMin = parseFloat(String(lastMilestone?.minAmount ?? '0'));
          if (!Number.isNaN(lastMin) && cartSubtotal < lastMin) {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (e) {
      /* ignore */
    }

    const highestUnlocked = [...giftMilestonesSorted]
      .reverse()
      .find((m: any) => {
        const minAmount = parseFloat(String(m?.minAmount ?? '0'));
        return !Number.isNaN(minAmount) && cartSubtotal >= minAmount;
      });

    if (!highestUnlocked) return;

    const highestId = Number(highestUnlocked?.id);
    if (!highestId) return;

    let lastCelebratedId: number | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      lastCelebratedId = raw ? Number(raw) : null;
    } catch (e) {
      /* ignore */
    }

    if (lastCelebratedId === highestId) return;

    try {
      localStorage.setItem(storageKey, String(highestId));
    } catch (e) {
      /* ignore */
    }

    const gifts = Number(highestUnlocked.giftCount || 0);
    const msg = `Congratulations! You've unlocked ${gifts} FREE gift${gifts > 1 ? 's' : ''}!`;

    const colors = [
      "#EC4899",
      "#A855F7",
      "#F97316",
      "#22C55E",
      "#3B82F6",
      "#F59E0B",
    ];

    const pieces = Array.from({ length: 60 }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.25;
      const duration = 1.6 + Math.random() * 1.2;
      const rotate = Math.random() * 360;
      const size = 6 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)] || "#EC4899";
      return { id: i, left, delay, duration, rotate, size, color };
    });

    setGiftMilestoneBlastConfetti(pieces);
    setGiftMilestoneBlastMessage(msg);
    setGiftMilestoneBlastKey((k) => k + 1);
    setShowGiftMilestoneBlast(true);
  }, [cartSubtotal, giftMilestonesSorted, toast]);

  useEffect(() => {
    if (!showGiftMilestoneBlast) return;

    const t = window.setTimeout(() => {
      closeGiftMilestoneBlast();
    }, 1700);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGiftMilestoneBlast();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showGiftMilestoneBlast]);

  // Calculate gift milestone benefits based on cart total
  let giftMilestoneDiscount = 0;
  let giftMilestoneCashback = 0;
  let appliedMilestone: any = null;

  if (giftMilestonesSorted.length > 0) {
    // Pick the highest eligible milestone (best match) based on cart total.
    // NOTE: We intentionally rely only on minAmount threshold.
    const applicableMilestone = [...giftMilestonesSorted]
      .reverse()
      .find((milestone: any) => {
        const minAmount = parseFloat(String(milestone?.minAmount ?? "0"));
        return !Number.isNaN(minAmount) && subtotalAfterAffiliate >= minAmount;
      });

    if (applicableMilestone) {
      appliedMilestone = applicableMilestone;

      // Apply discount if applicable
      if (applicableMilestone.discountType && applicableMilestone.discountType !== "none") {
        if (applicableMilestone.discountType === "percentage") {
          const percentage = parseFloat(String(applicableMilestone.discountValue ?? "0"));
          if (!Number.isNaN(percentage) && percentage > 0) {
            giftMilestoneDiscount = Math.round((subtotalAfterAffiliate * percentage) / 100);
          }
        } else if (applicableMilestone.discountType === "flat") {
          const flat = parseFloat(String(applicableMilestone.discountValue ?? "0"));
          if (!Number.isNaN(flat) && flat > 0) {
            giftMilestoneDiscount = Math.round(flat);
          }
        }
      }

      // Apply cashback percentage if applicable
      if (applicableMilestone.cashbackPercentage) {
        const cashbackPercent = parseFloat(String(applicableMilestone.cashbackPercentage ?? "0"));
        if (!Number.isNaN(cashbackPercent) && cashbackPercent > 0) {
          giftMilestoneCashback = Math.round((subtotalAfterAffiliate * cashbackPercent) / 100);
        }
      }
    }
  }

  // Dynamic discount calculation based on announcements
  let dynamicDiscount = 0;
  let appliedOffers: string[] = [];
  const freeShippingThreshold = 599;
  let freeShippingApplied = false;

  // Check for free shipping (only if subtotal after affiliate discount is above threshold and NO promo code is applied)
  if (subtotalAfterAffiliate > freeShippingThreshold && !appliedPromo) {
    freeShippingApplied = true;
    appliedOffers.push('Free Shipping on orders above ₹599');
  }

  // Apply dynamic benefits from announcements only if no promo code is applied
  if (!appliedPromo && announcements.length > 0) {
    announcements.forEach((announcement: any) => {
      if (announcement.type === 'offer' && announcement.offerType === 'discount') {
        const offerDiscount = Math.round(cartSubtotal * 0.05);
        dynamicDiscount += offerDiscount;
        appliedOffers.push('5% Online Payment Discount');
      }
    });
  }

  const generalPromoDiscount = appliedPromo?.discountAmount ? appliedPromo.discountAmount : 0;
  const totalDiscount = productDiscount + dynamicDiscount + generalPromoDiscount + giftMilestoneDiscount;

  // Use cartSubtotal for total calculation before considering redemption
  const subtotalAfterDiscount = cartSubtotal - dynamicDiscount - generalPromoDiscount - giftMilestoneDiscount;

  // Calculate total before redemption
  const totalBeforeRedemption = subtotalAfterDiscount; // Shipping is calculated at checkout, so not included here for now

  // Calculate total including wallet and affiliate wallet redemption
  const total = Math.max(0, totalBeforeRedemption - walletAmount - affiliateWalletAmount);

  // Calculate total cashback earned (This seems to be for earning cashback, not redeeming it)
  const totalEarnedCashback = cartItems.reduce((sum, item) => {
    if (item.cashbackPrice) {
      return sum + (Number(item.cashbackPrice) * item.quantity);
    }
    return sum;
  }, 0);

  // Function to handle wallet cashback redemption
  const handleRedeemCashback = (value: string) => {
    const amountToRedeem = parseFloat(value);
    if (isNaN(amountToRedeem) || amountToRedeem < 0) {
      setWalletAmount(0);
      return;
    }
    // Ensure redeemable amount does not exceed total payable amount
    const maxRedeemable = Math.max(0, totalBeforeRedemption); // Use totalBeforeRedemption for max limit
    setWalletAmount(Math.min(amountToRedeem, maxRedeemable));
  };

  // Function to handle affiliate wallet redemption
  const handleRedeemAffiliateWallet = (value: string) => {
    const amountToRedeem = parseFloat(value);
    if (isNaN(amountToRedeem) || amountToRedeem < 0) {
      setAffiliateWalletAmount(0);
      return;
    }
    // Ensure redeemable amount does not exceed total payable amount
    const maxRedeemable = Math.max(0, totalBeforeRedemption - walletAmount); // Consider walletAmount already deducted
    setAffiliateWalletAmount(Math.min(amountToRedeem, maxRedeemable));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.setItem("cart", JSON.stringify([]));
    localStorage.setItem("cartCount", "0");
    window.dispatchEvent(new Event("cartUpdated"));
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart",
    });
  };

  const updateQuantity = (id: number, newQuantity: number, index?: number) => {
    if (newQuantity < 1 || newQuantity > 10) return;

    setCartItems((prev) => {
      const next = [...prev];
      const idx = typeof index === "number" ? index : next.findIndex((i) => i.id === id);
      if (idx < 0 || !next[idx]) return prev;
      next[idx] = { ...next[idx], quantity: newQuantity };
      localStorage.setItem("cart", JSON.stringify(next));
      localStorage.setItem(
        "cartCount",
        next.reduce((total, item) => total + item.quantity, 0).toString()
      );
      window.dispatchEvent(new Event("cartUpdated"));
      return next;
    });
  };

  const removeItem = (id: number, index?: number) => {
    setCartItems((prev) => {
      const next = [...prev];
      const idx = typeof index === "number" ? index : next.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      next.splice(idx, 1);
      localStorage.setItem("cart", JSON.stringify(next));
      localStorage.setItem(
        "cartCount",
        next.reduce((total, item) => total + item.quantity, 0).toString()
      );
      window.dispatchEvent(new Event("cartUpdated"));
      return next;
    });
  };

  const saveForLater = async (productId: number) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to save items to your wishlist",
        variant: "destructive",
      });
      window.location.href = "/auth/login";
      return;
    }

    setSavingToWishlist(productId);
    try {
      const res = await fetch(apiUrl("/api/wishlist"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id, productId }),
      });

      if (!res.ok) {
        throw new Error("Failed to add to wishlist");
      }

      toast({
        title: "Saved",
        description: "Item added to your wishlist",
      });

      removeItem(productId);
    } catch (e) {
      toast({
        title: "Could not save",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSavingToWishlist(null);
    }
  };

  const applyPromoCode = async () => {
    const code = promoCode.trim();
    if (!code) return;

    setPromoError("");
    setIsApplyingPromo(true);
    try {
      const res = await fetch(apiUrl("/api/promo-codes/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, cartTotal: cartSubtotal, userId: user?.id || undefined, affiliateCode: affiliateCode || undefined, affiliateWalletAmount }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPromoError(data?.message || "Invalid promo code");
        setAppliedPromo(null);
        setPromoDiscount(0);
        setHasPromoCode(false);
        return;
      }

      setAppliedPromo(data);
      setHasPromoCode(true);
      setPromoDiscount(Number(data?.discountAmount || 0));
      toast({
        title: "Promo Applied",
        description: `Code ${code.toUpperCase()} applied successfully`,
      });
    } catch {
      setPromoError("Unable to apply promo code right now");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const clearPromoCode = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setHasPromoCode(false);
    setPromoCode("");
    setPromoError("");
  };

  // Handler for checkout
  const handleCheckout = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to proceed with checkout",
        variant: "destructive",
      });
      window.location.href = "/auth/login";
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Please add items to your cart before checkout",
        variant: "destructive",
      });
      return;
    }

    // Save wallet amounts to localStorage before navigation
    localStorage.setItem('redeemAmount', walletAmount.toString());
    localStorage.setItem('affiliateWalletAmount', affiliateWalletAmount.toString());

    // Save gift milestone benefits to localStorage
    if (appliedMilestone) {
      localStorage.setItem('appliedGiftMilestone', JSON.stringify({
        id: appliedMilestone.id,
        discountType: appliedMilestone.discountType,
        discountValue: giftMilestoneDiscount,
        cashbackPercentage: appliedMilestone.cashbackPercentage,
        cashbackAmount: giftMilestoneCashback,
        giftCount: appliedMilestone.giftCount
      }));
    } else {
      localStorage.removeItem('appliedGiftMilestone');
    }

    // Save promo code to localStorage if applied
    if (appliedPromo) {
      localStorage.setItem('appliedPromoCode', JSON.stringify(appliedPromo));
      localStorage.setItem('promoDiscount', generalPromoDiscount.toString());
    } else {
      localStorage.removeItem('appliedPromoCode');
      localStorage.removeItem('promoDiscount');
    }

    // Save affiliate commission from items to be credited to affiliate wallet after order
    if (totalAffiliateCommissionFromItems > 0) {
      localStorage.setItem('affiliateCommissionEarned', JSON.stringify({
        commission: totalAffiliateCommissionFromItems,
        discount: totalAffiliateDiscountFromItems,
        fromProducts: true,
        affiliateCode: affiliateCode, // Also save affiliate code here
        timestamp: new Date().toISOString()
      }));
    } else {
      localStorage.removeItem('affiliateCommissionEarned');
    }

    // Get affiliate code from localStorage if it exists (set when visiting product page with affiliate link)
    const affiliateRef = localStorage.getItem('affiliateRef') || affiliateCode;

    // Remove old static affiliate discount logic - everything is now dynamic
    localStorage.removeItem('affiliateCode');
    localStorage.removeItem('affiliateDiscount');

    // Clear multi-address order flags from previous orders
    // This ensures regular orders from cart don't skip the address selection step
    localStorage.removeItem('isMultiAddressOrder');
    localStorage.removeItem('multiAddressMapping');
    localStorage.removeItem('checkoutCartItems');
    localStorage.removeItem('multipleAddressMode');

    setLocation("/checkout", {
      state: {
        items: cartItems,
        walletAmount,
        affiliateWalletAmount,
        promoCode: appliedPromo,
        promoDiscount: generalPromoDiscount,
        affiliateCode: affiliateRef || "", // Pass affiliate code from cart state or localStorage
        affiliateCommissionFromItems: totalAffiliateCommissionFromItems,
        affiliateDiscountFromItems: totalAffiliateDiscountFromItems,
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <ShoppingBag className="mx-auto h-24 w-24 text-gray-300 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Looks like you haven't added any items to your cart yet.</p>
            <div className="space-y-4">
              <Link href="/">
                <Button className="bg-red-600 hover:bg-red-700 mr-4">
                  Continue Shopping
                </Button>
              </Link>
              <Link href="/wishlist">
                <Button variant="outline">
                  <Heart className="h-4 w-4 mr-2" />
                  View Wishlist
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <style>{`
          @keyframes giftMilestonePop {
            0% { transform: translateY(10px) scale(0.96); opacity: 0; }
            20% { transform: translateY(0px) scale(1); opacity: 1; }
            80% { transform: translateY(0px) scale(1); opacity: 1; }
            100% { transform: translateY(-8px) scale(0.98); opacity: 0; }
          }
          @keyframes giftMilestoneConfettiFall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        {showGiftMilestoneBlast && (
          <div
            key={giftMilestoneBlastKey}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeGiftMilestoneBlast();
            }}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {giftMilestoneBlastConfetti.map((p) => (
                <div
                  key={p.id}
                  className="absolute top-0 rounded-sm"
                  style={{
                    left: `${p.left}vw`,
                    width: `${p.size}px`,
                    height: `${Math.max(6, p.size * 1.4)}px`,
                    backgroundColor: p.color,
                    transform: `rotate(${p.rotate}deg)`,
                    animation: `giftMilestoneConfettiFall ${p.duration}s linear ${p.delay}s forwards`,
                  }}
                />
              ))}
            </div>

            <div
              className="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-pink-100 px-6 py-6 text-center"
              style={{ animation: "giftMilestonePop 2.2s ease forwards" }}
            >
              <div className="text-4xl mb-3">🎉</div>
              <div className="text-xl sm:text-2xl font-extrabold text-gray-900">
                Milestone Unlocked!
              </div>
              <div className="mt-2 text-sm sm:text-base font-semibold text-gray-700">
                {giftMilestoneBlastMessage}
              </div>
              <div className="mt-4 text-xs text-gray-500">Keep shopping to unlock more gifts</div>
            </div>
          </div>
        )}

        {/* Gift Milestone Section - Dynamic from Backend */}
        {cartItems.length > 0 && giftMilestonesSorted.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 border-2 border-pink-200 rounded-xl p-4 sm:p-8 shadow-lg">
            <div className="text-center mb-10">
              {(() => {
                const nextMilestoneLocal = giftMilestonesSorted.find((m: any) => cartSubtotal < parseFloat(m.minAmount));
                if (nextMilestoneLocal) {
                  const remainingLocal = parseFloat(nextMilestoneLocal.minAmount) - cartSubtotal;

                  return (
                    <p className="text-lg font-semibold text-gray-800 mb-1 flex items-center justify-center gap-2">
                      <span className="text-xl">🛍️</span>
                      Add ₹{Math.max(0, remainingLocal).toFixed(0)} more to unlock {nextMilestoneLocal.giftCount} FREE gift{nextMilestoneLocal.giftCount > 1 ? 's' : ''}!
                    </p>
                  );
                }

                return (
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
                    Use code <span className="text-pink-600">FLAT15</span> to Get <span className="text-pink-600">FLAT 15% OFF</span>
                  </h3>
                );
              })()}

              <p className="text-xs sm:text-sm text-gray-600">
                Shop for <span className="font-semibold text-pink-600">
                  ₹{parseFloat(giftMilestonesSorted[0]?.minAmount || '0').toFixed(0)}+
                </span> to get <span className="font-semibold text-pink-600">FREE gifts</span>
              </p>
            </div>

            {/* Progress Bar */}
            <div className="relative mb-4">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min((cartSubtotal / parseFloat(giftMilestonesSorted[giftMilestonesSorted.length - 1]?.minAmount || '2000')) * 100, 100)}%`
                  }}
                ></div>
              </div>

              {/* Dynamic Milestone Markers (icon + labels placed together so value appears beneath the gift) */}
              <div className="absolute left-0 w-full h-3">
                {giftMilestonesSorted.map((milestone, index) => {
                  const milestoneAmount = parseFloat(milestone.minAmount);
                  const maxAmount = parseFloat(giftMilestonesSorted[giftMilestonesSorted.length - 1]?.minAmount || '2000');
                  const position = (milestoneAmount / maxAmount) * 100;

                  // Check if milestone is unlocked
                  const unlocked = cartSubtotal >= milestoneAmount;
                  // Animation class for unlocked milestone
                  const animationClass = unlocked ? 'animate-bounce scale-110' : '';
                  // Render icon and labels stacked so the amount appears under the gift; position vertically centered on bar
                  return (
                    <div
                      key={milestone.id}
                      className="absolute flex flex-col items-center"
                      style={{ left: `${position}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                    >
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-3 ${
                        unlocked ? 'bg-pink-500 border-pink-600 ' + animationClass : 'bg-white border-gray-300'
                      } shadow-md transition-transform duration-300`}>
                        <span className="text-lg sm:text-xl">🎁</span>
                      </div>

                      <div className="mt-3 text-center w-20">
                        <div className={`text-xs font-bold ${unlocked ? 'text-pink-600' : 'text-gray-600'}`}>
                          {milestone.giftCount} Gift{milestone.giftCount > 1 ? 's' : ''}
                        </div>
                        <div className="text-gray-500 text-xs">₹{milestoneAmount.toFixed(0)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Labels are now rendered under each icon above to keep them aligned with markers */}

            {/* Dynamic Status Message */}
            <div className="mt-4 text-center">
              {(() => {
                const highestMilestone = [...giftMilestonesSorted].reverse().find(m => cartSubtotal >= parseFloat(m.minAmount));
                const nextMilestone = giftMilestonesSorted.find(m => cartSubtotal < parseFloat(m.minAmount));

                if (highestMilestone && !nextMilestone) {
                  return (
                    <p className="text-green-600 font-semibold text-sm sm:text-base mt-12">
                      🎉 Congratulations! You've unlocked {highestMilestone.giftCount} FREE gift{highestMilestone.giftCount > 1 ? 's' : ''}!
                      {highestMilestone.discountType !== 'none' && highestMilestone.discountValue && (
                        <span className="block text-pink-600 text-base font-bold mt-1 animate-fadeInUp">
                          {highestMilestone.discountType === 'percentage'
                            ? `${highestMilestone.discountValue}% OFF`
                            : `₹${parseFloat(highestMilestone.discountValue).toLocaleString()} OFF`}
                        </span>
                      )}
                    </p>
                  );
                } else if (nextMilestone) {
                  const remaining = parseFloat(nextMilestone.minAmount) - cartSubtotal;
                  return (
                    <>

                    </>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, index) => (
              <Card key={`${item.id}-${index}`} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-24 w-24 sm:h-28 sm:w-28 object-cover rounded-lg mx-auto sm:mx-0"
                      />
                    </div>

                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {item.name}
                      </h3>

                      {/* Show included products for offers */}
                      {item.isOfferItem && item.productNames && (
                        <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-pink-500">
                              🎁 {item.offerTitle || 'Special Offer'}
                            </Badge>
                            <span className="text-xs text-purple-700 font-semibold">
                              {item.totalProducts} Products Included
                            </span>
                          </div>
                          <div className="text-xs space-y-1">
                            {item.productNames.map((productName: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-purple-600">•</span>
                                <span className="text-gray-700">{productName}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-green-600 font-medium mt-2">
                            {item.discountType === 'percentage'
                              ? `${item.discountValue}% discount applied`
                              : `₹${item.discountAmount?.toFixed(2)} off applied`
                            }
                          </div>
                        </div>
                      )}

                      {item.selectedShade && !item.isOfferItem && (
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                          <Badge variant="secondary" className="flex items-center gap-1.5">
                            {item.selectedShade.imageUrl ? (
                              <img
                                src={item.selectedShade.imageUrl}
                                alt={item.selectedShade.name}
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: item.selectedShade.colorCode }}
                              />
                            )}
                            <span>Shade: {item.selectedShade.name}</span>
                          </Badge>
                        </div>
                      )}
                      {item.variant && (
                        <Badge variant="secondary" className="mb-2">
                          Size: {item.variant}
                        </Badge>
                      )}
                      <div className="mb-2">
                        <div className="flex items-center justify-center sm:justify-start space-x-2">
                          <span className="text-lg font-semibold text-gray-900">{item.price}</span>
                          {item.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">{item.originalPrice}</span>
                          )}
                        </div>
                        {item.originalPrice && (() => {
                          const originalPrice = parseFloat(item.originalPrice.replace(/[₹,]/g, ""));
                          const currentPrice = parseFloat(item.price.replace(/[₹,]/g, ""));
                          const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
                          return discount > 0 ? (
                            <div className="flex items-center justify-center sm:justify-start mt-1">
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                {discount}% OFF • Save ₹{(originalPrice - currentPrice).toLocaleString()}
                                {item.isOfferItem && " (Offer Discount)"}
                              </span>
                            </div>
                          ) : null;
                        })()}

                        {/* Cashback Badge for Cart Item - Enhanced Display */}
                        {item.cashbackPercentage !== undefined && item.cashbackPercentage !== null && item.cashbackPrice !== undefined && item.cashbackPrice !== null && (
                          <div className="mt-2 inline-flex items-center bg-orange-500 text-white rounded-full px-3 py-1 shadow-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold">₹</span>
                              </div>
                              <span className="text-sm font-semibold">Cashback</span>
                            </div>
                            <div className="h-4 w-px bg-white/30 mx-3" />
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">₹{(Number(item.cashbackPrice) * item.quantity).toFixed(2)}</span>
                              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">{Number(item.cashbackPercentage).toFixed(2)}%</span>
                            </div>
                          </div>
                        )}



                      </div>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <div className={`w-2 h-2 rounded-full ${item.inStock
                            ? 'bg-green-500'
                            : 'bg-red-500'
                          }`}></div>
                        <p className={`text-xs sm:text-sm font-medium ${item.inStock ? 'text-green-600' : 'text-red-600'}`}>
                          {item.inStock ? 'In Stock' : 'Out of Stock'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-3 sm:space-y-2 items-center">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, index)}
                          className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!item.inStock}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-2 font-medium min-w-[3rem] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1, index)}
                          className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!item.inStock || item.quantity >= 10}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => saveForLater(item.id)}
                          disabled={savingToWishlist === item.id}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          aria-label="Save for later"
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id, index)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Promo Code / Affiliate Code</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Try SAVE10, FLAT50, or POPPIKAP..."
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={applyPromoCode}>
                      Apply
                    </Button>
                  </div>
                  {appliedPromo && (
                    <p className="text-green-600 text-xs font-medium bg-green-50 p-2 rounded">
                      ✓ Applied Promo: {appliedPromo.code} ({appliedPromo.discountType === 'percentage' ? appliedPromo.discountAmount + '%' : (appliedPromo.discountType === 'fixed' ? `₹${appliedPromo.discountAmount} off` : 'Free Shipping')})
                    </p>
                  )}
                  {affiliateCode && totalAffiliateDiscountFromItems > 0 && (
                    <p className="text-purple-600 text-xs font-medium bg-purple-50 p-2 rounded">
                      ✓ Applied Affiliate Code: <span className="font-bold">{affiliateCode}</span> (Save ₹{totalAffiliateDiscountFromItems.toLocaleString()})
                    </p>
                  )}
                </div>

                {/* Wallet Cashback Redemption Section */}
                <Label htmlFor="walletAmount" className="text-base font-semibold text-gray-700">Wallet Cashback</Label>
                <div className="relative">
                  <Input
                    id="walletAmount"
                    type="number"
                    min="0"
                    max={parseFloat(walletData?.cashbackBalance || '0')}
                    step="0.01"
                    value={walletAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const maxCashback = parseFloat(walletData?.cashbackBalance || '0');
                      setWalletAmount(Math.min(value, maxCashback));
                    }}
                    placeholder="0"
                    className="text-lg pl-3 pr-16 h-12 border-2 border-gray-300 focus:border-purple-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setWalletAmount(0)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Available cashback: ₹{walletData?.cashbackBalance || '0'} (Will be credited after delivery)
                </p>

                {/* Affiliate Wallet Section - Only for Affiliates */}
                {isAffiliate && (
                  <>
                    <Separator className="my-4" />
                    <Label htmlFor="affiliateWalletAmount" className="text-base font-semibold text-purple-700">Affiliate Wallet</Label>
                    <div className="relative">
                      <Input
                        id="affiliateWalletAmount"
                        type="number"
                        min="0"
                        max={parseFloat(affiliateWalletData?.commissionBalance || '0')}
                        step="0.01"
                        value={affiliateWalletAmount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const maxCommission = parseFloat(affiliateWalletData?.commissionBalance || '0');
                          setAffiliateWalletAmount(Math.min(value, maxCommission));
                        }}
                        placeholder="0"
                        className="text-lg pl-3 pr-16 h-12 border-2 border-purple-300 focus:border-purple-500"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAffiliateWalletAmount(0)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-700"
                      >
                        Clear
                      </Button>
                    </div>
                    <p className="text-sm text-purple-600 mt-1">
                      Commission earnings: ₹{affiliateWalletData?.commissionBalance || '0'}
                    </p>
                  </>
                )}


                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal (Original Price) ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                    <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                  </div>

                  {productDiscount > 0 && (
                    <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                      <span className="text-green-700 font-medium">Product Discount</span>
                      <span className="font-bold text-green-600">-₹{productDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Affiliate Discount Display - Show when affiliate code is applied */}
                  {totalAffiliateDiscountFromItems > 0 && affiliateCode && (
                    <div className="flex justify-between text-sm bg-purple-50 p-2 rounded">
                      <span className="text-purple-700 font-medium">Affiliate Discount ({affiliateCode})</span>
                      <span className="font-bold text-purple-600">-₹{Math.round(totalAffiliateDiscountFromItems).toLocaleString()}</span>
                    </div>
                  )}

                  {dynamicDiscount > 0 && (
                    <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                      <span className="text-green-700 font-medium">Offers Applied</span>
                      <span className="font-bold text-green-600">-₹{dynamicDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {appliedPromo && generalPromoDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
                      <span className="text-green-700 font-medium">Promo Code ({appliedPromo.code})</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">-₹{generalPromoDiscount.toLocaleString()}</span>
                        <button
                          onClick={clearPromoCode}
                          className="text-xs text-red-600 hover:text-red-800 font-medium underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {giftMilestoneDiscount > 0 && (
                    <div className="flex justify-between text-sm bg-pink-50 p-2 rounded">
                      <span className="text-pink-700 font-medium">Gift Milestone Discount</span>
                      <span className="font-bold text-pink-600">-₹{giftMilestoneDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {giftMilestoneCashback > 0 && (
                    <div className="flex justify-between text-sm bg-pink-50 p-2 rounded">
                      <span className="text-pink-700 font-medium">Gift Milestone Cashback</span>
                      <span className="font-bold text-pink-600">+₹{giftMilestoneCashback.toLocaleString()}</span>
                    </div>
                  )}

                

                  {walletAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Cashback Wallet</span>
                      <span className="text-green-600 font-semibold">-₹{walletAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {affiliateWalletAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-600">Affiliate Wallet</span>
                      <span className="text-purple-600 font-semibold">-₹{affiliateWalletAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                    Shipping charges will be calculated at checkout
                  </div>

                  {freeShippingApplied && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded font-medium">
                      ✓ Free shipping applied
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-pink-600">₹{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  {(totalDiscount > 0 || walletAmount > 0 || affiliateWalletAmount > 0 || totalAffiliateDiscountFromItems > 0) && (
                    <div className="text-xs text-green-600 text-right mt-1">
                      You saved ₹{(totalDiscount + walletAmount + affiliateWalletAmount + totalAffiliateDiscountFromItems).toLocaleString(undefined, { maximumFractionDigits: 2 })}!
                    </div>
                  )}
                </div>

                <Button className="w-full bg-red-600 hover:bg-red-700 text-white text-base py-3" onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>

                <div className="space-y-2 text-xs text-gray-500 text-center">
                  <p>🔒 Secure checkout with SSL encryption</p>
                  <p>📦 Shipping charges calculated based on delivery location</p>
                </div>
              </CardContent>
            </Card>

            {/* Display total balance in summary - Only for Affiliates */}
            {isAffiliate && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 mb-4 border-2 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <WalletIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-base font-bold text-purple-800">Total Balance</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">
                    ₹{(parseFloat(walletData?.cashbackBalance || '0') + parseFloat(affiliateWalletData?.commissionBalance || '0')).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-purple-700 mt-2">
                  <span>Cashback: ₹{parseFloat(walletData?.cashbackBalance || '0').toFixed(2)}</span>
                  <span>Commission: ₹{parseFloat(affiliateWalletData?.commissionBalance || '0').toFixed(2)}</span>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
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