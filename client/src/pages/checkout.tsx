import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CreditCard, MapPin, User, Package, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  image: string;
  quantity: number;
  inStock: boolean;
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
  });
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Check if user is logged in when accessing checkout
    const user = localStorage.getItem("user");
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to proceed with checkout",
        variant: "destructive",
      });
      window.location.href = "/auth/login";
      return;
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
  }, []);

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

  const getCurrentUser = () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseInt(item.price.replace(/[₹,]/g, ""));
      return total + (price * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = subtotal > 599 ? 0 : 99;
  const total = subtotal + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
            items: cartItems.map(item => ({
              productId: item.id,
              productName: item.name,
              productImage: item.image,
              quantity: item.quantity,
              price: item.price,
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
        totalAmount: total
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


    try {
      let paymentSuccessful = false;
      let paymentMethod = 'Cash on Delivery';

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

        const orderData = {
          userId: user.id,
          totalAmount: total,
          status: 'confirmed',
          paymentMethod,
          shippingAddress: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
          items: cartItems.map(item => ({
            productId: item.id,
            productName: item.name,
            productImage: item.image,
            quantity: item.quantity,
            price: item.price,
          }))
        };

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });

        if (response.ok) {
          const result = await response.json();
          setOrderId(result.orderId || 'ORD-001');
          setOrderPlaced(true);

          // Clear cart
          localStorage.removeItem("cart");
          localStorage.setItem("cartCount", "0");
          window.dispatchEvent(new Event("cartUpdated"));

          toast({
            title: "Order Placed Successfully!",
            description: "You will receive a confirmation email shortly",
          });
        } else {
          throw new Error('Failed to place order');
        }
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast({
        title: "Order Failed",
        description: "There was an error placing your order. Please try again.",
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Use Profile Information?
            </DialogTitle>
            <DialogDescription>
              Would you like to use the information from your profile to fill both contact information and shipping address in this checkout form?
            </DialogDescription>
          </DialogHeader>

          {userProfile && (
            <div className="space-y-3 py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Contact Information:</h4>
                  <p><strong>Name:</strong> {userProfile.firstName} {userProfile.lastName}</p>
                  <p><strong>Email:</strong> {userProfile.email}</p>
                  {userProfile.phone && <p><strong>Phone:</strong> {userProfile.phone}</p>}
                </div>
                {userProfile.address && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Shipping Address:</h4>
                    <p>{userProfile.address}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUseProfileData}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Yes, Use Profile Data
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkipProfileData}
                  className="flex-1"
                >
                  No, I'll Enter Manually
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
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Contact Information
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
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Shipping Address
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
                        <option value="panihati">Panihati</option>
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
                        <option value="rourkela">Rourkela</option>
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
                        <option value="jaunpur">Jaunpur</option>
                        <option value="lakhimpur">Lakhimpur</option>
                        <option value="haldwani">Haldwani</option>
                        <option value="katihar">Katihar</option>
                        <option value="raigarh">Raigarh</option>
                        <option value="unnao">Unnao</option>
                        <option value="jind">Jind</option>
                        <option value="santipur">Santipur</option>
                        <option value="margao">Margao</option>
                        <option value="phagwara">Phagwara</option>
                        <option value="dimapur">Dimapur</option>
                        <option value="abids">Abids</option>
                        <option value="hindupur">Hindupur</option>
                        <option value="mohali">Mohali</option>
                        <option value="hospet">Hospet</option>
                        <option value="bharuch">Bharuch</option>
                        <option value="berhampore">Berhampore</option>
                        <option value="kokrajhar">Kokrajhar</option>
                        <option value="ranaghat">Ranaghat</option>
                        <option value="tindivanam">Tindivanam</option>
                        <option value="mandsaur">Mandsaur</option>
                        <option value="uran">Uran</option>
                        <option value="balurghat">Balurghat</option>
                        <option value="northanandapur">North Anandapur</option>
                        <option value="sirpur">Sirpur</option>
                        <option value="patan">Patan</option>
                        <option value="bagalkot">Bagalkot</option>
                        <option value="zirakpur">Zirakpur</option>
                        <option value="malout">Malout</option>
                        <option value="navsari">Navsari</option>
                        <option value="mahad">Mahad</option>
                        <option value="porbandar">Porbandar</option>
                        <option value="ankleshwar">Ankleshwar</option>
                        <option value="surendranagar_dudhrej">Surendranagar Dudhrej</option>
                        <option value="kanhangad">Kanhangad</option>
                        <option value="gandevi">Gandevi</option>
                        <option value="kovvur">Kovvur</option>
                        <option value="nirmal">Nirmal</option>
                        <option value="umarkhed">Umarkhed</option>
                        <option value="ballia">Ballia</option>
                        <option value="pratapgarh">Pratapgarh</option>
                        <option value="padrauna">Padrauna</option>
                        <option value="himmatnagar">Himmatnagar</option>
                        <option value="lunglei">Lunglei</option>
                        <option value="vinchhiya">Vinchhiya</option>
                        <option value="jetpur">Jetpur</option>
                        <option value="sikkim_namchi">Sikkim Namchi</option>
                        <option value="mangaldoi">Mangaldoi</option>
                        <option value="kalyani">Kalyani</option>
                        <option value="saharsa">Saharsa</option>
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
                            <p className="font-medium">Cashfree Payment</p>
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
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 mt-6 pt-6 space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t">
                      <span>Total</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
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