import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CreditCard, MapPin, User, Package, CheckCircle, Gift, Award, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface CartItem {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  image: string;
  quantity: number;
  inStock: boolean;
  cashbackPrice?: string;
  cashbackPercentage?: string;
  selectedShade?: {
    id?: number;
    name: string;
    imageUrl?: string;
    colorCode?: string;
  };
}

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [showAuthRequired, setShowAuthRequired] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    paymentMethod: "cashfree",
    affiliateCode: "",
    affiliateDiscount: 0,
  });
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileDataLoaded, setProfileDataLoaded] = useState(false);

  // Initialize shipping cost state and loading indicator
  const [shippingCost, setShippingCost] = useState<number>(99);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // Get user from localStorage - must be before any hooks that use it
  const getCurrentUser = () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  };

  const user = getCurrentUser();

  // Fetch wallet data
  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/wallet?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch wallet');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Wallet cashback states
  const [showWalletSection, setShowWalletSection] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState(0);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    // Check if user is logged in when accessing checkout
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to proceed with checkout",
        variant: "destructive",
      });
      window.location.href = "/auth/login";
      return;
    }

    // Check for affiliate code in localStorage
    const affiliateRef = localStorage.getItem("affiliateRef");
    if (affiliateRef && user) {
      const userData = user;

      // Get order count for this affiliate code
      fetch(`/api/orders/count?userId=${userData.id}&affiliateCode=${affiliateRef}`)
        .then(res => res.json())
        .then(data => {
          const orderCount = data.count || 0;
          const discountPercentage = orderCount === 0 ? 15 : 10; // 15% for first order, 10% for subsequent

          setFormData(prev => ({
            ...prev,
            affiliateCode: affiliateRef,
            affiliateDiscount: discountPercentage,
          }));

          toast({
            title: "Affiliate Discount Applied!",
            description: `${discountPercentage}% OFF on your order`,
          });
        })
        .catch(err => console.error("Error fetching order count:", err));
    }

    // Parse user data and set profile
    try {
      const userData = user;
      setUserProfile(userData);

      // Auto-fill form data if profile has information and not already loaded
      if (userData && !profileDataLoaded) {
        // Parse address to extract city, state, zipCode from profile
        let city = "";
        let state = "";
        let zipCode = "";
        let streetAddress = userData.address || "";

        // Try to extract city, state, zipCode from full address if they exist
        if (streetAddress) {
          const addressParts = streetAddress.split(',').map(part => part.trim());
          if (addressParts.length >= 3) {
            // Last part might contain state and pin code
            const lastPart = addressParts[addressParts.length - 1];
            const pinCodeMatch = lastPart.match(/\d{6}$/);
            if (pinCodeMatch) {
              zipCode = pinCodeMatch[0];
              state = lastPart.replace(/\d{6}$/, '').trim();
            } else {
              state = lastPart;
            }

            // Second last part might be city
            if (addressParts.length >= 2) {
              city = addressParts[addressParts.length - 2];
            }

            // Remove city and state from full address to get street address
            streetAddress = addressParts.slice(0, -2).join(', ');
          } else if (addressParts.length === 2) {
            // If only 2 parts, assume first is address and second is city
            city = addressParts[1];
            streetAddress = addressParts[0];
          } else if (addressParts.length === 1) {
            // If only 1 part, use it as street address
            streetAddress = addressParts[0];
          }
        }

        // Auto-fill form data with profile information
        setFormData({
          email: userData.email || "",
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          address: streetAddress,
          city: city,
          state: state,
          zipCode: zipCode,
          phone: userData.phone || "",
          paymentMethod: "cashfree",
        });

        setProfileDataLoaded(true);

        // Show notification that data was auto-filled
        if (userData.firstName || userData.lastName || userData.email || userData.phone || userData.address) {
          toast({
            title: "Profile Data Loaded",
            description: "Your contact information and shipping address have been filled automatically.",
          });
        }
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }

    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
      } catch (error) {
        console.error("Error parsing cart data:", error);
        setCartItems([]);
      }
    }
    setLoading(false);
  }, [profileDataLoaded]);

  // Calculate shipping cost when pincode or payment method changes
  useEffect(() => {
    const fetchShippingCost = async () => {
      // Only fetch if zipCode is valid and not in COD mode (as COD might have different rates or conditions)
      if (formData.zipCode && formData.zipCode.length === 6) {
        setLoadingShipping(true);
        try {
          // Approximate weight calculation for shipping API
          const weight = cartItems.reduce((total, item) => total + (0.5 * item.quantity), 0);
          // Check if COD is selected for shipping calculation
          const isCOD = formData.paymentMethod === 'cod';

          const response = await fetch(
            `/api/shiprocket/serviceability?deliveryPincode=${formData.zipCode}&weight=${weight}&cod=${isCOD}`
          );

          if (response.ok) {
            const data = await response.json();

            // Check if courier data is available and filter for the cheapest option
            if (data.data && data.data.available_courier_companies && data.data.available_courier_companies.length > 0) {
              const cheapestCourier = data.data.available_courier_companies.reduce((prev: any, curr: any) => {
                return (curr.rate < prev.rate) ? curr : prev;
              });

              setShippingCost(Math.round(cheapestCourier.rate));
              toast({
                title: "Shipping Cost Calculated",
                description: `₹${Math.round(cheapestCourier.rate)} via ${cheapestCourier.courier_name}`,
              });
            } else {
              // If no couriers are available, reset to default or show an error
              setShippingCost(99); // Reset to default or a fallback value
              toast({
                title: "Shipping Unavailable",
                description: "Shipping not available for this location or combination.",
                variant: "destructive",
              });
            }
          } else {
            // Handle API errors by resetting to default shipping cost
            setShippingCost(99);
            toast({
              title: "Shipping Error",
              description: "Could not calculate shipping cost. Please try again.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error fetching shipping cost:", error);
          setShippingCost(99); // Fallback on error
          toast({
            title: "Shipping Error",
            description: "An unexpected error occurred while calculating shipping.",
            variant: "destructive",
          });
        } finally {
          setLoadingShipping(false);
        }
      } else {
        // If zipCode is empty or invalid, reset to default shipping cost
        setShippingCost(99);
      }
    };

    fetchShippingCost();
  }, [formData.zipCode, formData.paymentMethod, cartItems]);


  const verifyPayment = async (orderIdParam: string) => {
    try {
      const response = await fetch('/api/payments/cashfree/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderIdParam }),
      });

      const result = await response.json();

      if (response.ok && result.verified) {
        // Payment successful, create the order
        const pendingOrder = sessionStorage.getItem('pendingOrder');
        if (pendingOrder) {
          const orderData = JSON.parse(pendingOrder);
          setOrderId(orderData.orderId);
          setOrderPlaced(true);

          // Clear cart and session
          localStorage.removeItem("cart");
          sessionStorage.removeItem('pendingOrder');
          localStorage.setItem("cartCount", "0");
          window.dispatchEvent(new Event("cartUpdated"));

          toast({
            title: "Payment Successful!",
            description: "Your order has been confirmed",
          });
        }
      } else {
        // Payment failed
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive",
        });

        // Restore cart from session
        const pendingOrder = sessionStorage.getItem('pendingOrder');
        if (pendingOrder) {
          const orderData = JSON.parse(pendingOrder);
          setCartItems(orderData.cartItems);
        }
        sessionStorage.removeItem('pendingOrder');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: "Verification Error",
        description: "Could not verify payment status. Please contact support.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseInt(item.price.replace(/[₹,]/g, ""));
      return total + (price * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  // Apply affiliate discount
  const affiliateDiscountAmount = formData.affiliateDiscount > 0
    ? Math.round(subtotal * (formData.affiliateDiscount / 100))
    : 0;
  const subtotalAfterDiscount = subtotal - affiliateDiscountAmount;

  // Use the dynamic shippingCost, default to 99 if subtotal is less than 599, otherwise free.
  const shipping = subtotalAfterDiscount > 599 ? 0 : shippingCost;
  const totalBeforeDiscount = subtotalAfterDiscount + shipping;
  const total = Math.max(0, totalBeforeDiscount - redeemAmount);

  // Calculate affiliate commission (25% of payable price)
  const affiliateCommission = formData.affiliateCode
    ? Math.round(total * 0.25)
    : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUseProfileData = () => {
    if (userProfile) {
      // Parse address to extract city, state, zipCode from profile
      let city = "";
      let state = "";
      let zipCode = "";
      let streetAddress = userProfile.address || "";

      // Try to extract city, state, zipCode from full address if they exist
      const addressParts = streetAddress.split(',').map(part => part.trim());
      if (addressParts.length >= 3) {
        // Last part might contain state and pin code
        const lastPart = addressParts[addressParts.length - 1];
        const pinCodeMatch = lastPart.match(/\d{6}$/);
        if (pinCodeMatch) {
          zipCode = pinCodeMatch[0];
          state = lastPart.replace(/\d{6}$/, '').trim();
        } else {
          state = lastPart;
        }

        // Second last part might be city
        if (addressParts.length >= 2) {
          city = addressParts[addressParts.length - 2];
        }

        // Remove city and state from full address to get street address
        streetAddress = addressParts.slice(0, -2).join(', ');
      } else if (addressParts.length === 2) {
        // If only 2 parts, assume first is address and second is city
        city = addressParts[1];
        streetAddress = addressParts[0];
      } else if (addressParts.length === 1) {
        // If only 1 part, use it as street address
        streetAddress = addressParts[0];
      }

      // Fill both contact information and shipping address
      setFormData({
        email: userProfile.email || "",
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        address: streetAddress,
        city: city,
        state: state,
        zipCode: zipCode,
        phone: userProfile.phone || "",
        paymentMethod: "cashfree",
      });

      toast({
        title: "Profile Information Loaded",
        description: "Your contact information and shipping address have been filled automatically.",
      });
    }
    setShowProfileDialog(false);
  };

  const handleSkipProfileData = () => {
    setShowProfileDialog(false);
  };

  const copyAffiliateCode = () => {
    if (formData.affiliateCode) {
      navigator.clipboard.writeText(formData.affiliateCode);
      toast({
        title: "Copied!",
        description: "Affiliate code copied to clipboard",
      });
    }
  };

  const handleRedeemCashback = async () => {
    if (!user?.id || redeemAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to redeem",
        variant: "destructive",
      });
      return;
    }

    if (redeemAmount > (walletData?.cashbackBalance || 0)) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough cashback balance",
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await fetch('/api/wallet/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: redeemAmount,
          description: 'Cashback redeemed at checkout'
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to redeem cashback');
      }

      const data = await res.json();

      // Update form data to reflect the redeemed amount
      setFormData(prev => ({
        ...prev,
        redeemAmount: redeemAmount
      }));

      toast({
        title: "Success!",
        description: `₹${redeemAmount} cashback redeemed successfully`,
      });

      // Refresh wallet data
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem cashback",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const processCashfreePayment = async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue with payment",
          variant: "destructive",
        });
        return false;
      }

      // Validate form data
      if (!formData.email || !formData.firstName || !formData.lastName) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return false;
      }

      // Validate phone number if provided
      if (formData.phone && formData.phone.trim()) {
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        const cleanPhone = formData.phone.replace(/[\s-()]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid 10-digit Indian mobile number starting with 6-9",
            variant: "destructive",
          });
          return false;
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return false;
      }

      // Generate unique order ID
      const orderId = `ORD-${Date.now()}-${user.id}`;

      // Create Cashfree order
      const response = await fetch('/api/payments/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          orderId: orderId,
          currency: 'INR',
          customerDetails: {
            customerId: String(user.id),
            customerName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            customerEmail: formData.email.trim(),
            customerPhone: formData.phone?.trim() || '9999999999',
          },
          orderNote: 'Beauty Store Purchase',
          orderData: {
            userId: user.id,
            totalAmount: total,
            shippingAddress: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
            affiliateCode: formData.affiliateCode || null,
            affiliateCommission: affiliateCommission > 0 ? affiliateCommission : null,
            items: cartItems.map(item => ({
              productId: item.id,
              productName: item.name,
              productImage: item.image,
              quantity: item.quantity,
              price: item.price,
              cashbackPrice: item.cashbackPrice || null,
              cashbackPercentage: item.cashbackPercentage || null,
            }))
          }
        }),
      });

      const orderData = await response.json();

      if (!response.ok) {
        console.error('Cashfree API error:', orderData);

        let errorMessage = "Payment processing failed";

        if (orderData.configError) {
          errorMessage = "Cashfree is not configured. Please use Cash on Delivery.";
        } else if (orderData.cashfreeError) {
          errorMessage = orderData.error || "Cashfree service error. Please try again.";
        } else {
          errorMessage = orderData.error || `Payment setup failed (${response.status})`;
        }

        toast({
          title: "Payment Error",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }

      if (!orderData.paymentSessionId) {
        console.error("Missing payment session ID:", orderData);
        toast({
          title: "Configuration Error",
          description: "Invalid payment session. Please try Cash on Delivery.",
          variant: "destructive",
        });
        return false;
      }

      // Store order data in session storage for after payment
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        orderId: orderData.orderId,
        paymentSessionId: orderData.paymentSessionId,
        customerData: formData,
        cartItems: cartItems,
        totalAmount: total,
        redeemAmount: redeemAmount, // Include redeemAmount
        affiliateCommission: affiliateCommission, // Include affiliateCommission
      }));

      // Load Cashfree SDK and redirect to payment
      return new Promise((resolve) => {
        const existingScript = document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
        if (existingScript) {
          existingScript.remove();
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.onload = () => {
          try {
            const cashfree = window.Cashfree({
              mode: orderData.environment || 'sandbox'
            });

            console.log("Initiating Cashfree checkout with session ID:", orderData.paymentSessionId);
            console.log("Using environment mode:", orderData.environment || 'sandbox');

            cashfree.checkout({
              paymentSessionId: orderData.paymentSessionId,
              returnUrl: `${window.location.origin}/checkout?payment=processing&orderId=${orderData.orderId}`,
            });

            resolve(true);
          } catch (checkoutError) {
            console.error("Cashfree checkout error:", checkoutError);
            toast({
              title: "Payment Error",
              description: "Failed to initialize payment. Please try again.",
              variant: "destructive",
            });
            resolve(false);
          }
        };
        script.onerror = () => {
          console.error("Failed to load Cashfree SDK");
          toast({
            title: "Payment Error",
            description: "Failed to load payment system. Please try again.",
            variant: "destructive",
          });
          resolve(false);
        };
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Cashfree payment error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Payment processing failed",
        variant: "destructive",
      });
      return false;
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to place an order",
        variant: "destructive",
      });
      return;
    }

    // Basic validation
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if provided
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
      const cleanPhone = formData.phone.replace(/[\s-()]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid 10-digit Indian mobile number starting with 6-9",
          variant: "destructive",
        });
        return false;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    // Validate address fields for Shiprocket
    if (!formData.address || formData.address.trim().length < 10) {
      toast({
        title: "Invalid Address",
        description: "Please enter a complete address (minimum 10 characters)",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.city || formData.city.trim().length < 3) {
      toast({
        title: "Invalid City",
        description: "Please select a valid city",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.state || formData.state.trim().length < 3) {
      toast({
        title: "Invalid State",
        description: "Please select a valid state",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.zipCode || !/^\d{6}$/.test(formData.zipCode.trim())) {
      toast({
        title: "Invalid PIN Code",
        description: "Please enter a valid 6-digit PIN code",
        variant: "destructive",
      });
      return false;
    }

    // Validate city and state are not default values
    if (formData.city === "" || formData.state === "") {
      toast({
        title: "Address Incomplete",
        description: "Please select city and state",
        variant: "destructive",
      });
      return false;
    }


    try {
      let paymentSuccessful = false;
      let paymentMethod = 'Cash on Delivery';
      const totalWithShipping = total; // This variable was not defined, using 'total' instead.
      const fullAddress = `${formData.address.trim()}, ${formData.city.trim()}, ${formData.state.trim()} ${formData.zipCode.trim()}`; // This variable was not defined, constructing it.


      // Process payment based on selected method
      if (formData.paymentMethod === 'cashfree') {
        toast({
          title: "Processing Payment",
          description: "Redirecting to Cashfree...",
        });
        paymentSuccessful = await processCashfreePayment();
        // For Cashfree, the order will be created after payment verification
        return;
      } else {
        // For COD, create order directly
        paymentSuccessful = true;
        paymentMethod = 'Cash on Delivery';

        // Get affiliate reference from localStorage
        const affiliateRef = localStorage.getItem('affiliateRef');

        const orderData = {
          userId: user.id,
          totalAmount: total,
          paymentMethod: paymentMethod,
          shippingAddress: fullAddress,
          affiliateCode: formData.affiliateCode || null,
          affiliateCommission: affiliateCommission > 0 ? affiliateCommission : null,
          items: cartItems.map(item => ({
            productId: item.id,
            productName: item.name,
            productImage: item.image,
            quantity: item.quantity,
            price: item.price,
            cashbackPrice: item.cashbackPrice || null,
            cashbackPercentage: item.cashbackPercentage || null,
          })),
          customerName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone.trim(),
          redeemAmount: redeemAmount,
        };

        // If cashback is being redeemed, process it first
        if (redeemAmount > 0) {
          try {
            const redeemResponse = await fetch('/api/wallet/redeem', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.id,
                amount: redeemAmount,
                description: 'Cashback redeemed during checkout'
              }),
            });

            if (!redeemResponse.ok) {
              const redeemError = await redeemResponse.json();
              throw new Error(redeemError.error || 'Failed to redeem cashback');
            }

            console.log('Cashback redeemed successfully:', redeemAmount);

            // Invalidate wallet queries to refresh the balance
            window.dispatchEvent(new CustomEvent('walletUpdated'));
          } catch (redeemError) {
            console.error('Error redeeming cashback:', redeemError);
            toast({
              title: "Cashback Redemption Failed",
              description: redeemError.message || "Failed to redeem cashback. Please try again.",
              variant: "destructive",
            });
            return; // Stop order placement if redemption fails
          }
        }

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });

        let result;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          // Handle non-JSON responses (like HTML error pages)
          const textResponse = await response.text();
          console.error('Non-JSON response received:', textResponse);
          throw new Error('Server returned an unexpected response format');
        }

        if (response.ok && result.success) {
          setOrderId(result.orderId || 'ORD-001');
          setOrderPlaced(true);

          // Clear cart
          localStorage.removeItem("cart");
          sessionStorage.removeItem('pendingOrder');
          localStorage.setItem("cartCount", "0");
          window.dispatchEvent(new Event("cartUpdated"));

          // Trigger wallet update event
          window.dispatchEvent(new CustomEvent('walletUpdated'));

          toast({
            title: "Order Placed Successfully!",
            description: redeemAmount > 0
              ? `Order placed with ₹${redeemAmount.toFixed(2)} cashback redeemed!`
              : "You will receive a confirmation email shortly",
          });
        } else {
          throw new Error(result.error || 'Failed to place order');
        }
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Order Confirmed!</h2>
            <p className="text-gray-600">
              Thank you for your purchase. Your order {orderId} has been confirmed.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Estimated delivery</p>
              <p className="font-semibold">3-5 business days</p>
            </div>
            <div className="space-y-3 pt-4">
              <Link href={`/track-order?orderId=${orderId}`}>
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  Track Your Order
                </Button>
              </Link>
              <Link href="/order-history">
                <Button variant="outline" className="w-full">
                  View All Orders
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showAuthRequired) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <User className="mx-auto h-24 w-24 text-gray-300 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-8">Please login or create an account to proceed with checkout.</p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/login">
                <Button className="bg-red-600 hover:bg-red-700">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="outline">
                  Create Account
                </Button>
              </Link>
            </div>
            <div className="mt-6">
              <Link href="/cart" className="text-red-600 hover:text-red-700">
                ← Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <Package className="mx-auto h-24 w-24 text-gray-300 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Add some items to your cart before checking out.</p>
            <Link href="/">
              <Button className="bg-red-600 hover:bg-red-700">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Profile Data Confirmation Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Use Profile Information
            </DialogTitle>
            <DialogDescription>
              Fill the checkout form with your profile information. You can edit any field after filling.
            </DialogDescription>
          </DialogHeader>

          {userProfile && (
            <div className="space-y-4 py-4">
              <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-lg space-y-4 border border-red-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-red-700 mb-2">Contact Information</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p><span className="font-medium">Name:</span> {userProfile.firstName} {userProfile.lastName}</p>
                      <p><span className="font-medium">Email:</span> {userProfile.email}</p>
                      {userProfile.phone && <p><span className="font-medium">Phone:</span> {userProfile.phone}</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-red-700 mb-2">Shipping Address</h4>
                    <div className="text-sm text-gray-700">
                      {userProfile.address ? (
                        <p>{userProfile.address}</p>
                      ) : (
                        <p className="text-gray-500 italic">No address saved in profile</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs">ℹ</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    After using profile data, you can edit any field directly in the form. Use "Clear Form" button to start fresh.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleUseProfileData}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Use This Information
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkipProfileData}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/cart" className="inline-flex items-center text-red-600 hover:text-red-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Checkout Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Contact Information
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Shipping Address
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <select
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      >
                        <option value="">Select City</option>
                        <option value="mumbai">Mumbai</option>
                        <option value="delhi">Delhi</option>
                        <option value="bangalore">Bangalore</option>
                        <option value="hyderabad">Hyderabad</option>
                        <option value="ahmedabad">Ahmedabad</option>
                        <option value="chennai">Chennai</option>
                        <option value="kolkata">Kolkata</option>
                        <option value="pune">Pune</option>
                        <option value="jaipur">Jaipur</option>
                        <option value="lucknow">Lucknow</option>
                        <option value="kanpur">Kanpur</option>
                        <option value="nagpur">Nagpur</option>
                        <option value="surat">Surat</option>
                        <option value="indore">Indore</option>
                        <option value="thane">Thane</option>
                        <option value="bhopal">Bhopal</option>
                        <option value="visakhapatnam">Visakhapatnam</option>
                        <option value="patna">Patna</option>
                        <option value="vadodara">Vadodara</option>
                        <option value="ghaziabad">Ghaziabad</option>
                        <option value="ludhiana">Ludhiana</option>
                        <option value="agra">Agra</option>
                        <option value="nashik">Nashik</option>
                        <option value="faridabad">Faridabad</option>
                        <option value="meerut">Meerut</option>
                        <option value="rajkot">Rajkot</option>
                        <option value="kalyan">Kalyan</option>
                        <option value="vasai">Vasai</option>
                        <option value="varanasi">Varanasi</option>
                        <option value="srinagar">Srinagar</option>
                        <option value="aurangabad">Aurangabad</option>
                        <option value="dhanbad">Dhanbad</option>
                        <option value="amritsar">Amritsar</option>
                        <option value="navi_mumbai">Navi Mumbai</option>
                        <option value="allahabad">Allahabad</option>
                        <option value="ranchi">Ranchi</option>
                        <option value="howrah">Howrah</option>
                        <option value="coimbatore">Coimbatore</option>
                        <option value="jabalpur">Jabalpur</option>
                        <option value="gwalior">Gwalior</option>
                        <option value="vijayawada">Vijayawada</option>
                        <option value="jodhpur">Jodhpur</option>
                        <option value="madurai">Madurai</option>
                        <option value="raipur">Raipur</option>
                        <option value="kota">Kota</option>
                        <option value="guwahati">Guwahati</option>
                        <option value="chandigarh">Chandigarh</option>
                        <option value="solapur">Solapur</option>
                        <option value="hubli">Hubli</option>
                        <option value="tiruchirappalli">Tiruchirappalli</option>
                        <option value="bareilly">Bareilly</option>
                        <option value="mysore">Mysore</option>
                        <option value="tiruppur">Tiruppur</option>
                        <option value="gurgaon">Gurgaon</option>
                        <option value="aligarh">Aligarh</option>
                        <option value="jalandhar">Jalandhar</option>
                        <option value="bhubaneswar">Bhubaneswar</option>
                        <option value="salem">Salem</option>
                        <option value="warangal">Warangal</option>
                        <option value="mira_bhayandar">Mira Bhayandar</option>
                        <option value="thiruvananthapuram">Thiruvananthapuram</option>
                        <option value="bhiwandi">Bhiwandi</option>
                        <option value="saharanpur">Saharanpur</option>
                        <option value="guntur">Guntur</option>
                        <option value="amravati">Amravati</option>
                        <option value="bikaner">Bikaner</option>
                        <option value="noida">Noida</option>
                        <option value="jamshedpur">Jamshedpur</option>
                        <option value="bhilai_nagar">Bhilai Nagar</option>
                        <option value="cuttack">Cuttack</option>
                        <option value="firozabad">Firozabad</option>
                        <option value="kochi">Kochi</option>
                        <option value="nellore">Nellore</option>
                        <option value="bhavnagar">Bhavnagar</option>
                        <option value="dehradun">Dehradun</option>
                        <option value="durgapur">Durgapur</option>
                        <option value="asansol">Asansol</option>
                        <option value="rourkela">Rourkela</option>
                        <option value="nanded">Nanded</option>
                        <option value="kolhapur">Kolhapur</option>
                        <option value="ajmer">Ajmer</option>
                        <option value="akola">Akola</option>
                        <option value="gulbarga">Gulbarga</option>
                        <option value="jamnagar">Jamnagar</option>
                        <option value="ujjain">Ujjain</option>
                        <option value="loni">Loni</option>
                        <option value="siliguri">Siliguri</option>
                        <option value="jhansi">Jhansi</option>
                        <option value="ulhasnagar">Ulhasnagar</option>
                        <option value="jammu">Jammu</option>
                        <option value="sangli_miraj_kupwad">Sangli Miraj Kupwad</option>
                        <option value="mangalore">Mangalore</option>
                        <option value="erode">Erode</option>
                        <option value="belgaum">Belgaum</option>
                        <option value="ambattur">Ambattur</option>
                        <option value="tirunelveli">Tirunelveli</option>
                        <option value="malegaon">Malegaon</option>
                        <option value="gaya">Gaya</option>
                        <option value="jalgaon">Jalgaon</option>
                        <option value="udaipur">Udaipur</option>
                        <option value="maheshtala">Maheshtala</option>
                        <option value="davanagere">Davanagere</option>
                        <option value="kozhikode">Kozhikode</option>
                        <option value="kurnool">Kurnool</option>
                        <option value="rajpur_sonarpur">Rajpur Sonarpur</option>
                        <option value="rajahmundry">Rajahmundry</option>
                        <option value="bokaro_steel_city">Bokaro Steel City</option>
                        <option value="south_dumdum">South Dumdum</option>
                        <option value="bellary">Bellary</option>
                        <option value="patiala">Patiala</option>
                        <option value="gopalpur">Gopalpur</option>
                        <option value="agartala">Agartala</option>
                        <option value="bhagalpur">Bhagalpur</option>
                        <option value="muzaffarnagar">Muzaffarnagar</option>
                        <option value="bhatpara">Bhatpara</option>
                        <option value="latur">Latur</option>
                        <option value="dhule">Dhule</option>
                        <option value="rohtak">Rohtak</option>
                        <option value="korba">Korba</option>
                        <option value="bhilwara">Bhilwara</option>
                        <option value="berhampur">Berhampur</option>
                        <option value="muzaffarpur">Muzaffarpur</option>
                        <option value="ahmednagar">Ahmednagar</option>
                        <option value="mathura">Mathura</option>
                        <option value="kollam">Kollam</option>
                        <option value="avadi">Avadi</option>
                        <option value="kadapa">Kadapa</option>
                        <option value="kamarhati">Kamarhati</option>
                        <option value="sambalpur">Sambalpur</option>
                        <option value="bilaspur">Bilaspur</option>
                        <option value="shahjahanpur">Shahjahanpur</option>
                        <option value="satara">Satara</option>
                        <option value="bijapur">Bijapur</option>
                        <option value="rampur">Rampur</option>
                        <option value="shivamogga">Shivamogga</option>
                        <option value="chandrapur">Chandrapur</option>
                        <option value="junagadh">Junagadh</option>
                        <option value="thrissur">Thrissur</option>
                        <option value="alwar">Alwar</option>
                        <option value="bardhaman">Bardhaman</option>
                        <option value="kulti">Kulti</option>
                        <option value="kakinada">Kakinada</option>
                        <option value="nizamabad">Nizamabad</option>
                        <option value="parbhani">Parbhani</option>
                        <option value="tumkur">Tumkur</option>
                        <option value="khammam">Khammam</option>
                        <option value="ozhukarai">Ozhukarai</option>
                        <option value="bihar_sharif">Bihar Sharif</option>
                        <option value="panipat">Panipat</option>
                        <option value="darbhanga">Darbhanga</option>
                        <option value="bally">Bally</option>
                        <option value="aizawl">Aizawl</option>
                        <option value="dewas">Dewas</option>
                        <option value="ichalkaranji">Ichalkaranji</option>
                        <option value="karnal">Karnal</option>
                        <option value="bathinda">Bathinda</option>
                        <option value="jalna">Jalna</option>
                        <option value="eluru">Eluru</option>
                        <option value="kirari_suleman_nagar">Kirari Suleman Nagar</option>
                        <option value="barabanki">Barabanki</option>
                        <option value="purnia">Purnia</option>
                        <option value="satna">Satna</option>
                        <option value="mau">Mau</option>
                        <option value="sonipat">Sonipat</option>
                        <option value="farrukhabad">Farrukhabad</option>
                        <option value="sagar">Sagar</option>
                        <option value="durg">Durg</option>
                        <option value="imphal">Imphal</option>
                        <option value="ratlam">Ratlam</option>
                        <option value="hapur">Hapur</option>
                        <option value="arrah">Arrah</option>
                        <option value="karimnagar">Karimnagar</option>
                        <option value="anantapur">Anantapur</option>
                        <option value="etawah">Etawah</option>
                        <option value="ambernath">Ambernath</option>
                        <option value="north_dumdum">North Dumdum</option>
                        <option value="bharatpur">Bharatpur</option>
                        <option value="begusarai">Begusarai</option>
                        <option value="new_delhi">New Delhi</option>
                        <option value="gandhinagar">Gandhinagar</option>
                        <option value="baranagar">Baranagar</option>
                        <option value="tiruvottiyur">Tiruvottiyur</option>
                        <option value="pondicherry">Pondicherry</option>
                        <option value="sikar">Sikar</option>
                        <option value="thoothukudi">Thoothukudi</option>
                        <option value="rewa">Rewa</option>
                        <option value="mirzapur">Mirzapur</option>
                        <option value="raichur">Raichur</option>
                        <option value="pali">Pali</option>
                        <option value="ramagundam">Ramagundam</option>
                        <option value="haridwar">Haridwar</option>
                        <option value="vijayanagaram">Vijayanagaram</option>
                        <option value="katihar">Katihar</option>
                        <option value="nagarcoil">Nagarcoil</option>
                        <option value="sri_ganganagar">Sri Ganganagar</option>
                        <option value="karawal_nagar">Karawal Nagar</option>
                        <option value="mango">Mango</option>
                        <option value="thanjavur">Thanjavur</option>
                        <option value="bulandshahr">Bulandshahr</option>
                        <option value="uluberia">Uluberia</option>
                        <option value="murwara">Murwara</option>
                        <option value="sambhal">Sambhal</option>
                        <option value="singrauli">Singrauli</option>
                        <option value="nadiad">Nadiad</option>
                        <option value="secunderabad">Secunderabad</option>
                        <option value="naihati">Naihati</option>
                        <option value="yamunanagar">Yamunanagar</option>
                        <option value="bidhan_nagar">Bidhan Nagar</option>
                        <option value="pallavaram">Pallavaram</option>
                        <option value="bidar">Bidar</option>
                        <option value="munger">Munger</option>
                        <option value="panchkula">Panchkula</option>
                        <option value="burhanpur">Burhanpur</option>
                        <option value="raurkela_industrial_township">Raurkela Industrial Township</option>
                        <option value="kharagpur">Kharagpur</option>
                        <option value="dindigul">Dindigul</option>
                        <option value="gandhi_nagar">Gandhi Nagar</option>
                        <option value="hospet">Hospet</option>
                        <option value="nangloi_jat">Nangloi Jat</option>
                        <option value="malda">Malda</option>
                        <option value="ongole">Ongole</option>
                        <option value="deoghar">Deoghar</option>
                        <option value="chapra">Chapra</option>
                        <option value="haldia">Haldia</option>
                        <option value="kanchrapara">Kanchrapara</option>
                        <option value="habra">Habra</option>
                        <option value="krishnanagar">Krishnanagar</option>
                        <option value="ranaghat">Ranaghat</option>
                        <option value="balaghat">Balaghat</option>
                        <option value="puruliya">Puruliya</option>
                        <option value="monteswar">Monteswar</option>
                        <option value="raiganj">Raiganj</option>
                        <option value="adilabad">Adilabad</option>
                        <option value="chittoor">Chittoor</option>
                        <option value="rajnandgaon">Rajnandgaon</option>
                        <option value="reliance">Reliance</option>
                        <option value="khora">Khora</option>
                        <option value="bhusawal">Bhusawal</option>
                        <option value="tadipatri">Tadipatri</option>
                        <option value="kishanganj">Kishanganj</option>
                        <option value="karaikudi">Karaikudi</option>
                        <option value="surendranagar">Surendranagar</option>
                        <option value="kadi">Kadi</option>
                        <option value="mandurah">Mandurah</option>
                        <option value="dibrugarh">Dibrugarh</option>
                        <option value="shillong">Shillong</option>
                        <option value="sambalpur">Sambalpur</option>
                        <option value="junagadh">Junagadh</option>
                        <option value="sangrur">Sangrur</option>
                        <option value="faridkot">Faridkot</option>
                        <option value="solan">Solan</option>
                        <option value="baramulla">Baramulla</option>
                        <option value="udupi">Udupi</option>
                        <option value="proddatur">Proddatur</option>
                        <option value="nagapattinam">Nagapattinam</option>
                        <option value="pranaganj">Pranaganj</option>
                        <option value="kafur">Kafur</option>
                        <option value="suliyat">Suliyat</option>
                        <option value="malappuram">Malappuram</option>
                        <option value="dimapur">Dimapur</option>
                        <option value="rudrapur">Rudrapur</option>
                        <option value="sirsa">Sirsa</option>
                        <option value="washim">Washim</option>
                        <option value="mahbubnagar">Mahbubnagar</option>
                        <option value="narasaraopet">Narasaraopet</option>
                        <option value="siratur">Siratur</option>
                        <option value="kumbakonam">Kumbakonam</option>
                        <option value="hazaribag">Hazaribag</option>
                        <option value="dharwad">Dharwad</option>
                        <option value="medininagar">Medininagar</option>
                        <option value="morbi">Morbi</option>
                        <option value="puri">Puri</option>
                        <option value="compiegne">Compiegne</option>
                        <option value="kishanganj">Kishanganj</option>
                        <option value="supaul">Supaul</option>
                        <option value="godda">Godda</option>
                        <option value="hazaribagh">Hazaribagh</option>
                        <option value="pakur">Pakur</option>
                        <option value="paschim_bardhaman">Paschim Bardhaman</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <select
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      >
                        <option value="">Select State</option>
                        <option value="andhra_pradesh">Andhra Pradesh</option>
                        <option value="arunachal_pradesh">Arunachal Pradesh</option>
                        <option value="assam">Assam</option>
                        <option value="bihar">Bihar</option>
                        <option value="chhattisgarh">Chhattisgarh</option>
                        <option value="goa">Goa</option>
                        <option value="gujarat">Gujarat</option>
                        <option value="haryana">Haryana</option>
                        <option value="himachal_pradesh">Himachal Pradesh</option>
                        <option value="jharkhand">Jharkhand</option>
                        <option value="karnataka">Karnataka</option>
                        <option value="kerala">Kerala</option>
                        <option value="madhya_pradesh">Madhya Pradesh</option>
                        <option value="maharashtra">Maharashtra</option>
                        <option value="manipur">Manipur</option>
                        <option value="meghalaya">Meghalaya</option>
                        <option value="mizoram">Mizoram</option>
                        <option value="nagaland">Nagaland</option>
                        <option value="odisha">Odisha</option>
                        <option value="punjab">Punjab</option>
                        <option value="rajasthan">Rajasthan</option>
                        <option value="sikkim">Sikkim</option>
                        <option value="tamil_nadu">Tamil Nadu</option>
                        <option value="telangana">Telangana</option>
                        <option value="tripura">Tripura</option>
                        <option value="uttar_pradesh">Uttar Pradesh</option>
                        <option value="uttarakhand">Uttarakhand</option>
                        <option value="west_bengal">West Bengal</option>
                        <option value="andaman_and_nicobar">Andaman and Nicobar Islands</option>
                        <option value="chandigarh">Chandigarh</option>
                        <option value="dadra_and_nagar_haveli">Dadra and Nagar Haveli and Daman and Diu</option>
                        <option value="delhi">Delhi</option>
                        <option value="jammu_and_kashmir">Jammu and Kashmir</option>
                        <option value="ladakh">Ladakh</option>
                        <option value="lakshadweep">Lakshadweep</option>
                        <option value="puducherry">Puducherry</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="zipCode">PIN Code *</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="Enter 6-digit PIN code"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                    className="space-y-3"
                  >

                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="cashfree" id="cashfree" />
                      <Label htmlFor="cashfree" className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Online Payment</p>
                            <p className="text-sm text-gray-500">Pay with UPI, Cards, Net Banking & Wallets</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                              <span className="text-white text-xs font-bold">CF</span>
                            </div>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Secure</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="cod" id="cod" />
                      <Label htmlFor="cod" className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Cash on Delivery</p>
                            <p className="text-sm text-gray-500">Pay when you receive your order right away</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-lg">₹</span>
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">No fees</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Wallet Cashback Section */}
              {walletData && parseFloat(walletData.cashbackBalance) > 0 && (
                <Card className="border-2 border-blue-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Gift className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Use Wallet Cashback</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            Available Balance: ₹{parseFloat(walletData.cashbackBalance).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Redeem Amount Input */}
                      <div>
                        <Label htmlFor="redeemAmount">Enter Amount to Redeem</Label>
                        <div className="flex gap-2 mt-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                            <Input
                              id="redeemAmount"
                              type="number"
                              step="0.01"
                              min="0"
                              max={Math.min(parseFloat(walletData.cashbackBalance), total)}
                              value={redeemAmount}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                const maxRedeem = Math.min(parseFloat(walletData.cashbackBalance), total);
                                setRedeemAmount(Math.min(value, maxRedeem));
                              }}
                              placeholder="0.00"
                              className="pl-8"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const maxRedeem = Math.min(parseFloat(walletData.cashbackBalance), total);
                              setRedeemAmount(maxRedeem);
                            }}
                            className="px-6"
                          >
                            Max
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum redeemable: ₹{Math.min(parseFloat(walletData.cashbackBalance), total).toFixed(2)}
                        </p>
                      </div>

                      {/* Apply/Remove Cashback Button */}
                      {redeemAmount > 0 && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="font-semibold text-green-800">Cashback Applied</span>
                            </div>
                            <span className="text-xl font-bold text-green-600">
                              -₹{redeemAmount.toFixed(2)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRedeemAmount(0)}
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove Cashback
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-16 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                          {item.selectedShade && (
                            <Badge variant="secondary" className="mt-1 flex items-center gap-1.5 w-fit">
                              {item.selectedShade.imageUrl ? (
                                <img
                                  src={item.selectedShade.imageUrl}
                                  alt={item.selectedShade.name}
                                  className="w-3 h-3 rounded-full object-cover"
                                />
                              ) : (
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: item.selectedShade.colorCode }}
                                />
                              )}
                              <span className="text-xs">{item.selectedShade.name}</span>
                            </Badge>
                          )}
                          <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity}</p>

                          {/* Cashback Badge for Item */}
                          {item.cashbackPrice && item.cashbackPercentage && (
                            <div className="mt-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-md p-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-orange-700">Cashback</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-orange-600">
                                    ₹{(Number(item.cashbackPrice) * item.quantity).toFixed(2)}
                                  </span>
                                  <span className="bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full text-xs">
                                    {item.cashbackPercentage}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 mt-6 pt-6 space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    {affiliateDiscountAmount > 0 && (
                      <div className="flex justify-between text-purple-600 font-semibold">
                        <span>Affiliate Discount ({formData.affiliateDiscount}%)</span>
                        <span>-₹{affiliateDiscountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                    </div>
                    {redeemAmount > 0 && (
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Wallet Cashback</span>
                        <span>-₹{redeemAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                    {affiliateCommission > 0 && (
                      <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                              <Award className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-base font-bold text-purple-800">Affiliate Earns!</span>
                          </div>
                          <span className="text-2xl font-bold text-purple-600">
                            ₹{affiliateCommission.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-purple-700 font-medium">
                          25% commission on payable amount will be credited to affiliate wallet
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-6 bg-red-600 hover:bg-red-700"
                    size="lg"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Place Order - ₹{total.toLocaleString()}
                  </Button>

                  <p className="text-xs text-gray-500 mt-4 text-center">
                    By placing your order, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}