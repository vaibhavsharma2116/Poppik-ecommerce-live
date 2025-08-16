
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, Phone, Calendar, RefreshCw, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface TrackingStep {
  step: string;
  status: 'completed' | 'pending' | 'active';
  date: string;
  time: string;
  description: string;
}

interface TrackingInfo {
  orderId: string;
  status: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  timeline: TrackingStep[];
  currentStep: number;
  totalAmount: number;
  shippingAddress: string;
  createdAt: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price: string;
    image: string;
  }>;
}

export default function TrackOrderPage() {
  const [, setLocation] = useLocation();
  const [orderIdInput, setOrderIdInput] = useState("");
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Get order ID from URL params if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      setOrderIdInput(orderId);
      setTimeout(() => {
        handleTrackOrder(orderId);
      }, 100);
    }
  }, []);

  const handleTrackOrder = async (orderId?: string) => {
    const trackingOrderId = orderId || orderIdInput;
    
    if (!trackingOrderId.trim()) {
      setError("Please enter an order ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/orders/${trackingOrderId}/tracking`);
      
      if (response.ok) {
        const data = await response.json();
        setTrackingInfo(data);
        toast({
          title: "Order Found",
          description: `Tracking information loaded for order ${data.orderId}`,
        });
      } else if (response.status === 404) {
        setError("Order not found. Please check your order ID and try again.");
        setTrackingInfo(null);
      } else {
        throw new Error('Failed to fetch tracking information');
      }
    } catch (error) {
      console.error('Tracking error:', error);
      setError("Unable to fetch tracking information. Please try again.");
      setTrackingInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshTracking = async () => {
    if (!trackingInfo) return;
    
    setRefreshing(true);
    try {
      const response = await fetch(`/api/orders/${trackingInfo.orderId}/tracking`);
      if (response.ok) {
        const data = await response.json();
        setTrackingInfo(data);
        toast({
          title: "Updated",
          description: "Tracking information refreshed",
        });
      }
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: "Failed to refresh tracking information",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'processing':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-600" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
        );
      case 'active':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-blue-600 animate-pulse"></div>
          </div>
        );
      case 'pending':
        return (
          <div className="h-8 w-8 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-gray-300"></div>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-gray-300"></div>
          </div>
        );
    }
  };

  const getProgressPercentage = () => {
    if (!trackingInfo) return 0;
    const completedSteps = trackingInfo.timeline.filter(step => step.status === 'completed').length;
    return (completedSteps / trackingInfo.timeline.length) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/order-history" className="inline-flex items-center text-red-600 hover:text-red-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Order History
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-gray-600 mt-2">Enter your order ID to track your package in real-time</p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Enter Order Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  placeholder="Enter your order ID (e.g., ORD-001)"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  className="mt-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleTrackOrder()}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={() => handleTrackOrder()}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  Track Order
                </Button>
                {trackingInfo && (
                  <Button 
                    onClick={handleRefreshTracking}
                    disabled={refreshing}
                    variant="outline"
                  >
                    {refreshing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tracking Information */}
        {trackingInfo && (
          <div className="space-y-6">
            {/* Order Status Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(trackingInfo.status)}
                      Order {trackingInfo.orderId}
                    </CardTitle>
                    <p className="text-gray-600 mt-1">
                      Placed on {new Date(trackingInfo.createdAt).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(trackingInfo.status)} px-4 py-2 text-sm font-medium border`}>
                    {trackingInfo.status.charAt(0).toUpperCase() + trackingInfo.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-medium text-gray-900">{Math.round(getProgressPercentage())}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Shipping Address</p>
                      <p className="text-sm text-gray-600">{trackingInfo.shippingAddress}</p>
                    </div>
                  </div>
                  {trackingInfo.trackingNumber && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Truck className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Tracking Number</p>
                        <p className="text-sm text-gray-600 font-mono">{trackingInfo.trackingNumber}</p>
                      </div>
                    </div>
                  )}
                  {trackingInfo.estimatedDelivery && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Expected Delivery</p>
                        <p className="text-sm text-gray-600">
                          {new Date(trackingInfo.estimatedDelivery).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tracking Timeline */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Tracking Timeline
                </CardTitle>
                <p className="text-gray-600">Follow your order's journey step by step</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {trackingInfo.timeline.map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        {getStepIcon(step.status)}
                        {index < trackingInfo.timeline.length - 1 && (
                          <div className={`w-0.5 h-16 mt-2 ${
                            step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-semibold ${
                            step.status === 'completed' ? 'text-green-900' : 
                            step.status === 'active' ? 'text-blue-900' : 'text-gray-500'
                          }`}>
                            {step.step}
                          </h4>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{step.date}</p>
                            <p className="text-xs text-gray-500">{step.time}</p>
                          </div>
                        </div>
                        <p className={`text-sm ${
                          step.status === 'completed' ? 'text-green-700' : 
                          step.status === 'active' ? 'text-blue-700' : 'text-gray-500'
                        }`}>
                          {step.description}
                        </p>
                        {step.status === 'active' && (
                          <div className="mt-2">
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></div>
                              In Progress
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Order Total</span>
                      <span className="text-xl font-bold text-gray-900">₹{trackingInfo.totalAmount.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex gap-3">
                      <Link href="/order-history">
                        <Button variant="outline" size="sm" className="flex-1">
                          View All Orders
                        </Button>
                      </Link>
                      {trackingInfo.status === 'delivered' && (
                        <Button variant="outline" size="sm" className="flex-1">
                          Download Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Need Help?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Have questions about your order? We're here to help!
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start"
                        onClick={() => window.open('tel:+919876543210', '_self')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Contact Support
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start"
                        onClick={() => window.open('mailto:support@beautystore.com?subject=Order Support Request - ' + (trackingInfo?.orderId || 'General'), '_blank')}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email Us
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* No tracking info placeholder */}
        {!trackingInfo && !loading && (
          <Card className="shadow-lg">
            <CardContent className="text-center py-12">
              <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Tracking Information</h3>
              <p className="text-gray-600 mb-6">Enter your order ID above to view real-time tracking details</p>
              <div className="flex justify-center gap-4">
                <Link href="/order-history">
                  <Button variant="outline">
                    View Order History
                  </Button>
                </Link>
                <Link href="/">
                  <Button className="bg-red-600 hover:bg-red-700">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
