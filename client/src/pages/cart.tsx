import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Heart, Share2 } from "lucide-react";
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

  // Affiliate discount states
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

  // Placeholder for user data, replace with actual user context or hook
  const [user, setUser] = useState<User | null>(null);

  // Fetch announcements for dynamic offers
  const { data: announcements = [] } = useQuery({
    queryKey: ['/api/announcements'],
  });

  // Fetch recommended products
  const { data: recommendedProducts = [] } = useQuery({
    queryKey: ['/api/products', { limit: 12 }],
  });

  // Fetch wallet data
  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/wallet?userId=${user.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Fetch affiliate wallet data
  const { data: affiliateWalletData } = useQuery({
    queryKey: ['/api/affiliate/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/affiliate/wallet?userId=${user.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });


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


  const updateQuantity = (id: number, newQuantity: number, itemIndex?: number) => {
    if (newQuantity === 0) {
      removeItem(id, itemIndex);
      return;
    }

    if (newQuantity > 10) {
      toast({
        title: "Maximum Quantity Reached",
        description: "You can only add up to 10 items of the same product",
        variant: "destructive",
      });
      return;
    }

    setCartItems(items =>
      items.map((item, index) =>
        (itemIndex !== undefined ? index === itemIndex : item.id === id)
          ? { ...item, quantity: newQuantity }
          : item
      )
    );

    // Dispatch event after state update
    setTimeout(() => window.dispatchEvent(new Event("cartUpdated")), 0);

    toast({
      title: "Cart Updated",
      description: "Item quantity has been updated",
    });
  };

  const removeItem = (id: number, itemIndex?: number) => {
    const item = cartItems.find((item, index) =>
      itemIndex !== undefined ? index === itemIndex : item.id === id
    );
    setCartItems(items =>
      items.filter((item, index) =>
        itemIndex !== undefined ? index !== itemIndex : item.id !== id
      )
    );

    // Dispatch event after state update
    setTimeout(() => window.dispatchEvent(new Event("cartUpdated")), 0);
  };

  const saveForLater = async (id: number) => {
    setSavingToWishlist(id);
    const item = cartItems.find(item => item.id === id);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const existingWishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      const wishlistItem = { ...item, dateAdded: new Date().toISOString() };
      localStorage.setItem("wishlist", JSON.stringify([...existingWishlist, wishlistItem]));

      removeItem(id);

      toast({
        title: "Saved for Later",
        description: `${item?.name} has been moved to your wishlist`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to save item for later. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingToWishlist(null);
    }
  };

  const clearCart = () => {
    if (cartItems.length === 0) return;

    setCartItems([]);

    // Dispatch event after state update
    setTimeout(() => window.dispatchEvent(new Event("cartUpdated")), 0);

    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart",
    });
  };

  // Function to apply promo code
  const applyPromoCode = async () => {
    const code = promoCode.trim();

    if (!code) {
      toast({
        title: "Empty Promo Code",
        description: "Please enter a promo code",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if it's an affiliate code (starts with POPPIKAP)
      if (code.toUpperCase().startsWith('POPPIKAP')) {
        // Fetch affiliate settings for discount
        const settingsResponse = await fetch('/api/affiliate-settings');
        if (!settingsResponse.ok) {
          throw new Error('Failed to fetch affiliate settings');
        }
        const settings = await settingsResponse.json();

        if (cartSubtotal < settings.minOrderAmount) {
          toast({
            title: "Minimum Order Not Met",
            description: `Minimum order amount is ₹${settings.minOrderAmount} to use affiliate discount`,
            variant: "destructive",
          });
          return;
        }

        let discountAmount = (cartSubtotal * settings.userDiscountPercentage) / 100;

        if (settings.maxDiscountAmount && discountAmount > settings.maxDiscountAmount) {
          discountAmount = settings.maxDiscountAmount;
        }

        setAppliedPromo(null); // Clear general promo if any
        setAffiliateCode(code.toUpperCase()); // This variable seems unused, consider removing or using it
        setAffiliateDiscount(discountAmount);
        setPromoCode(''); // Clear input after applying
        setPromoDiscount(0); // Reset general promo discount

        toast({
          title: "Affiliate Discount Applied!",
          description: `You saved ₹${discountAmount.toFixed(2)} with affiliate code ${code.toUpperCase()} (${settings.userDiscountPercentage}%)`,
        });
        return;
      }

      // General promo code validation
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          cartTotal: cartSubtotal,
          userId: user?.id // Use user?.id for safety
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle non-2xx responses from the API
        throw new Error(result.error || `API error: ${response.status}`);
      }

      if (result.valid && result.promoCode) {
        setAppliedPromo(result.promoCode);
        setAffiliateCode(null); // Clear affiliate code if a general promo is applied
        setAffiliateDiscount(0);
        setPromoDiscount(result.promoCode.discountAmount); // Set the promo discount state
        // Store promo code in localStorage for checkout
        localStorage.setItem('appliedPromoCode', JSON.stringify(result.promoCode));
        toast({
          title: "Promo Code Applied! 🎉",
          description: `You saved ₹${result.promoCode.discountAmount.toLocaleString()}`,
        });
      } else {
        // Handle cases where response.ok is true but result.valid is false
        setAppliedPromo(null);
        setPromoDiscount(0);
        localStorage.removeItem('appliedPromoCode');
        throw new Error(result.message || "The promo code you entered is not valid or has expired.");
      }
    } catch (error: any) {
      console.error("Error validating promo code:", error);
      setAppliedPromo(null);
      setAffiliateCode(null);
      setAffiliateDiscount(0);
      setPromoDiscount(0);
      localStorage.removeItem('appliedPromoCode');
      toast({
        title: "Error",
        description: error.message || "Failed to validate promo code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareCart = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Shopping Cart',
          text: `Check out my cart with ${cartItems.length} items!`,
          url: window.location.href,
        });
      } catch (error) {
        copyCartLink();
      }
    } else {
      copyCartLink();
    }
  };

  const copyCartLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Cart link has been copied to clipboard",
    });
  };

  // Calculate subtotal (before product discounts)
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.originalPrice
      ? parseInt(item.originalPrice.replace(/[₹,]/g, ""))
      : parseInt(item.price.replace(/[₹,]/g, ""));
    return sum + (price * item.quantity);
  }, 0);

  // Calculate product discounts
  const productDiscount = cartItems.reduce((total, item) => {
    if (item.originalPrice) {
      const original = parseInt(item.originalPrice.replace(/[₹,]/g, ""));
      const current = parseInt(item.price.replace(/[₹,]/g, ""));
      return total + ((original - current) * item.quantity);
    }
    return total;
  }, 0);

  // Calculate cart subtotal after product discounts
  const cartSubtotal = subtotal - productDiscount;

  // Calculate affiliate discount if applicable
  const subtotalAfterAffiliate = cartSubtotal - affiliateDiscount;

  // Dynamic discount calculation based on announcements
  let dynamicDiscount = 0;
  let appliedOffers: string[] = [];
  const freeShippingThreshold = 599;
  let freeShippingApplied = false;

  // Check for free shipping (only if subtotal after affiliate discount is above threshold and NO promo code is applied)
  if (subtotalAfterAffiliate > freeShippingThreshold && !appliedPromo && affiliateDiscount === 0) {
    freeShippingApplied = true;
    appliedOffers.push('Free Shipping on orders above ₹599');
  }

  // Apply dynamic benefits from announcements only if no promo code is applied
  if (!appliedPromo && affiliateDiscount === 0 && announcements.length > 0) {
    announcements.forEach((announcement: any) => {
      if (announcement.type === 'offer' && announcement.offerType === 'discount') {
        const offerDiscount = Math.round(cartSubtotal * 0.05);
        dynamicDiscount += offerDiscount;
        appliedOffers.push('5% Online Payment Discount');
      }
    });
  }

  const generalPromoDiscount = appliedPromo?.discountAmount ? appliedPromo.discountAmount : 0;
  const totalDiscount = productDiscount + dynamicDiscount + affiliateDiscount + generalPromoDiscount;

  // Use cartSubtotal for total calculation before considering redemption
  const subtotalAfterDiscount = cartSubtotal - dynamicDiscount - generalPromoDiscount - affiliateDiscount;

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

    // Save promo code to localStorage if applied
    if (appliedPromo) {
      localStorage.setItem('appliedPromoCode', JSON.stringify(appliedPromo));
    }

    // Save affiliate discount to localStorage if applied
    if (affiliateDiscount > 0 && affiliateCode) {
      localStorage.setItem('affiliateDiscount', JSON.stringify({
        code: affiliateCode,
        discount: affiliateDiscount
      }));
    }

    setLocation("/checkout", {
      state: {
        items: cartItems,
        walletAmount,
        affiliateWalletAmount,
        promoCode: appliedPromo,
        promoDiscount: generalPromoDiscount,
        affiliateCode: affiliateCode,
        affiliateDiscount: affiliateDiscount,
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
        <div className="mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center text-red-600 hover:text-red-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shopping Cart</h1>
              <p className="text-gray-600 mt-2">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your cart
              </p>
            </div>
            <div className="flex gap-2">
              {cartItems.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={shareCart}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearCart} className="text-red-600 border-red-600 hover:bg-red-50">
                    Clear Cart
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

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
                      {item.selectedShade && (
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
                          const originalPrice = parseInt(item.originalPrice.replace(/[₹,]/g, ""));
                          const currentPrice = parseInt(item.price.replace(/[₹,]/g, ""));
                          const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
                          return discount > 0 ? (
                            <div className="flex items-center justify-center sm:justify-start mt-1">
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                {discount}% OFF • Save ₹{(originalPrice - currentPrice).toLocaleString()}
                              </span>
                            </div>
                          ) : null;
                        })()}

                        {/* Cashback Badge for Cart Item - Enhanced Display */}
                        {item.cashbackPercentage && item.cashbackPrice && (
                          <div className="mt-2 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">₹</span>
                                </div>
                                <span className="text-sm font-bold text-orange-700">Cashback Earned</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-orange-600">
                                  ₹{(Number(item.cashbackPrice) * item.quantity).toFixed(2)}
                                </span>
                                <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-semibold">
                                  {item.cashbackPercentage}%
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-orange-600 mt-1.5 text-center sm:text-left">
                              Will be credited after delivery
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          item.inStock
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
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!item.inStock}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-2 font-medium min-w-[3rem] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
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
                          onClick={() => removeItem(item.id)}
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
                  <label className="text-sm font-medium text-gray-700">Promo Code</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Try SAVE10, FLAT50"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={applyPromoCode}>
                      Apply
                    </Button>
                  </div>
                  {appliedPromo && (
                    <p className="text-green-600 text-xs">
                      Applied: {appliedPromo.code} ({appliedPromo.discountType === 'percentage' ? appliedPromo.discountAmount + '%' : (appliedPromo.discountType === 'fixed' ? `Rs. ${appliedPromo.discountAmount} off` : 'Free Shipping')})
                    </p>
                  )}
                  {affiliateDiscount > 0 && (
                    <p className="text-green-600 text-xs">
                      Applied Affiliate Code: {affiliateCode} (Save ₹{affiliateDiscount.toLocaleString()})
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

                {/* Affiliate Wallet Section */}
                <Label htmlFor="affiliateWalletAmount" className="text-base font-semibold text-purple-700 mt-4">Affiliate Wallet</Label>
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


                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                    <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                  </div>

                  {productDiscount > 0 && (
                    <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                      <span className="text-green-700 font-medium">Product Discount</span>
                      <span className="font-bold text-green-600">-₹{productDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {dynamicDiscount > 0 && (
                    <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                      <span className="text-green-700 font-medium">Offers Applied</span>
                      <span className="font-bold text-green-600">-₹{dynamicDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {affiliateDiscount > 0 && affiliateCode && (
                    <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                      <span className="text-green-700 font-medium">Affiliate Discount ({affiliateCode})</span>
                      <span className="font-bold text-green-600">-₹{affiliateDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  {appliedPromo && generalPromoDiscount > 0 && (
                    <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                      <span className="text-green-700 font-medium">Promo Code ({appliedPromo.code})</span>
                      <span className="font-bold text-green-600">-₹{generalPromoDiscount.toLocaleString()}</span>
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
                  {(totalDiscount > 0 || walletAmount > 0 || affiliateWalletAmount > 0) && (
                    <div className="text-xs text-green-600 text-right mt-1">
                      You saved ₹{(totalDiscount + walletAmount + affiliateWalletAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}!
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

            {/* Display total balance in summary */}
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
                    {recommendedProducts.map((product: any) => (
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
                      {recommendedProducts.map((product: any) => (
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