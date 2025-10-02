
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface CartItem {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  image: string;
  quantity: number;
  variant?: string;
  inStock: boolean;
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingToWishlist, setSavingToWishlist] = useState<number | null>(null);
  const { toast } = useToast();

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
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
  }, []);

  // Save cart to localStorage whenever cartItems changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("cart", JSON.stringify(cartItems));
      // Update cart count in localStorage for layout component
      localStorage.setItem("cartCount", cartItems.reduce((total, item) => total + item.quantity, 0).toString());
      // Dispatch custom event to update layout
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }, [cartItems, loading]);

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(id);
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
      items.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
    
    toast({
      title: "Cart Updated",
      description: "Item quantity has been updated",
    });
  };

  const removeItem = (id: number) => {
    const item = cartItems.find(item => item.id === id);
    setCartItems(items => items.filter(item => item.id !== id));
    
    toast({
      title: "Item Removed",
      description: `${item?.name} has been removed from your cart`,
      variant: "destructive",
    });
  };

  const saveForLater = async (id: number) => {
    setSavingToWishlist(id);
    const item = cartItems.find(item => item.id === id);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add to wishlist (localStorage for now)
      const existingWishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      const wishlistItem = { ...item, dateAdded: new Date().toISOString() };
      localStorage.setItem("wishlist", JSON.stringify([...existingWishlist, wishlistItem]));
      
      // Remove from cart
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
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart",
    });
  };

  const applyPromoCode = () => {
    const code = promoCode.trim().toLowerCase();
    
    if (!code) {
      toast({
        title: "Empty Promo Code",
        description: "Please enter a promo code",
        variant: "destructive",
      });
      return;
    }

    if (code === "save10") {
      toast({
        title: "Promo Code Applied! 🎉",
        description: "10% discount has been applied to your order",
      });
    } else if (code === "freeship") {
      toast({
        title: "Free Shipping Applied! 🚚",
        description: "Shipping charges waived for this order",
      });
    } else {
      toast({
        title: "Invalid Promo Code",
        description: "The promo code you entered is not valid. Try SAVE10 or FREESHIP",
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
        // Fallback to clipboard
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

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseInt(item.price.replace(/[₹,]/g, ""));
      return total + (price * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const discount = promoCode.toLowerCase() === "save10" ? Math.floor(subtotal * 0.1) : 0;
  const total = subtotal - discount;

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
        {/* Header */}
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
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="sm:h-28 sm:w-28 object-cover rounded-lg mx-auto sm:mx-0"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {item.name}
                      </h3>
                      {item.variant && (
                        <Badge variant="secondary" className="mb-2">
                          Size: {item.variant}
                        </Badge>
                      )}
                      <div className="flex items-center justify-center sm:justify-start mb-2">
                        <span className="text-lg font-semibold text-gray-900">{item.price}</span>
                        {item.originalPrice && (
                          <span className="ml-2 text-sm text-gray-500 line-through">{item.originalPrice}</span>
                        )}
                      </div>
                      <p className={`text-sm ${item.inStock ? 'text-green-600' : 'text-red-600'}`}>
                        {item.inStock ? '✓ In Stock' : '⚠ Out of Stock'}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col space-y-3 sm:space-y-2 items-center">
                      {/* Quantity Controls */}
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

                      {/* Action Buttons */}
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

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>

                {/* Promo Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Promo Code</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Try SAVE10 or FREESHIP"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={applyPromoCode}>
                      Apply
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                    <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount (SAVE10)</span>
                      <span className="font-medium text-green-600">-₹{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                    💡 Shipping charges will be calculated at checkout
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>

                {/* Checkout Button */}
                <Link href="/checkout">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white text-base py-3">
                    Proceed to Checkout
                  </Button>
                </Link>

                {/* Security & Policies */}
                <div className="space-y-2 text-xs text-gray-500 text-center">
                  <p>🔒 Secure checkout with SSL encryption</p>
                  <p>📦 Shipping charges calculated based on delivery location</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
