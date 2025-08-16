
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, Eye, Download, RefreshCw, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: string;
  image: string;
}

interface Order {
  id: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: string;
  items: OrderItem[];
  trackingNumber?: string;
  estimatedDelivery?: string;
  shippingAddress: string;
  paymentMethod: string;
  userId?: number;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Get current user info
  const getCurrentUser = () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  };

  // Fetch orders from backend
  const fetchOrders = async (showRefreshToast = false) => {
    try {
      setRefreshing(true);
      const user = getCurrentUser();

      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your order history.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/orders?userId=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched orders:", data);
        setOrders(data);
        
        if (showRefreshToast) {
          toast({
            title: "Orders Updated",
            description: "Your order history has been refreshed.",
          });
        }
      } else if (response.status === 400) {
        // User ID missing, try to create sample orders
        await createSampleOrders(user.id);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      
      // Show sample orders if fetch fails
      const user = getCurrentUser();
      if (user) {
        setSampleOrders(user.id);
      }
      
      toast({
        title: "Notice",
        description: "Showing sample order data. Connect to database for real orders.",
        variant: "default",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Create sample orders for testing
  const createSampleOrders = async (userId: number) => {
    try {
      const response = await fetch('/api/orders/sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Fetch orders again after creating samples
        fetchOrders();
      } else {
        // Fallback to local sample data
        setSampleOrders(userId);
      }
    } catch (error) {
      console.error("Error creating sample orders:", error);
      setSampleOrders(userId);
    }
  };

  // Set sample orders for demo
  const setSampleOrders = (userId: number) => {
    const user = getCurrentUser();
    const sampleOrders: Order[] = [
      {
        id: 'ORD-001',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'delivered',
        total: '₹1,299',
        items: [
          {
            id: 1,
            name: 'Vitamin C Face Serum',
            quantity: 1,
            price: '₹699',
            image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300'
          },
          {
            id: 2,
            name: 'Hair Growth Serum',
            quantity: 1,
            price: '₹599',
            image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300'
          }
        ],
        trackingNumber: 'TRK001234567',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        shippingAddress: '123 Beauty Street, Mumbai, Maharashtra 400001',
        paymentMethod: 'Credit Card',
        userId: userId
      },
      {
        id: 'ORD-002',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'shipped',
        total: '₹899',
        items: [
          {
            id: 3,
            name: 'Anti-Aging Night Cream',
            quantity: 1,
            price: '₹899',
            image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300'
          }
        ],
        trackingNumber: 'TRK001234568',
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        shippingAddress: '456 Glow Avenue, Delhi, Delhi 110001',
        paymentMethod: 'UPI',
        userId: userId
      },
      {
        id: 'ORD-003',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'processing',
        total: '₹1,599',
        items: [
          {
            id: 4,
            name: 'Hyaluronic Acid Serum',
            quantity: 2,
            price: '₹799',
            image: 'https://images.unsplash.com/photo-1598662779094-110c2bad80b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300'
          }
        ],
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        shippingAddress: '789 Skincare Lane, Bangalore, Karnataka 560001',
        paymentMethod: 'Net Banking',
        userId: userId
      }
    ];

    setOrders(sampleOrders);
  };

  // Filter orders based on search and status
  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleRefresh = () => {
    fetchOrders(true);
  };

  const calculateOrderTotal = (items: OrderItem[]) => {
    return items.reduce((total, item) => {
      const price = parseInt(item.price.replace(/[₹,]/g, ""));
      return total + (price * item.quantity);
    }, 0);
  };

  const getTotalSpent = () => {
    return orders.reduce((total, order) => {
      const amount = parseInt(order.total.replace(/[₹,]/g, ""));
      return total + amount;
    }, 0);
  };

  const getOrderStats = () => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;
    const shippedOrders = orders.filter(o => o.status === 'shipped').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const totalSpent = getTotalSpent();

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalSpent
    };
  };

  const stats = getOrderStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-red-600 hover:text-red-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
              <p className="text-gray-600 mt-2">Track and manage all your orders</p>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              {refreshing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-3xl font-bold text-gray-900">₹{stats.totalSpent.toLocaleString()}</p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delivered</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.deliveredOrders}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Transit</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.shippedOrders}</p>
                </div>
                <Truck className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders or products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{order.id}</h3>
                        <Badge className={`${getStatusColor(order.status)} px-3 py-1 border`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                        <div>
                          <span className="font-medium">Order Date:</span> {new Date(order.date).toLocaleDateString('en-IN')}
                        </div>
                        <div>
                          <span className="font-medium">Items:</span> {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </div>
                        <div>
                          <span className="font-medium">Total:</span> <span className="font-bold text-gray-900">{order.total}</span>
                        </div>
                      </div>

                      {order.estimatedDelivery && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Expected Delivery:</span> {new Date(order.estimatedDelivery).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <Link href={`/track-order?orderId=${order.id}`}>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700">
                            <Truck className="h-4 w-4 mr-1" />
                            Track Order
                          </Button>
                        </Link>
                      )}
                      {order.status === 'delivered' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `/api/orders/${order.id}/invoice`;
                            link.download = `Invoice-${order.id}.html`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No matching orders found' : 'No orders yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : "You haven't placed any orders yet. Start shopping to see your orders here."}
              </p>
              <div className="flex justify-center gap-4">
                {(searchTerm || statusFilter !== 'all') && (
                  <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    Clear Filters
                  </Button>
                )}
                <Link href="/">
                  <Button className="bg-red-600 hover:bg-red-700">
                    Start Shopping
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details - {selectedOrder?.id}
              </DialogTitle>
              <DialogDescription>
                Complete information about your order
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Order Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Order Date:</span>
                      <p className="font-medium">{new Date(selectedOrder.date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <Badge className={`${getStatusColor(selectedOrder.status)} px-2 py-1 border mt-1`}>
                        {getStatusIcon(selectedOrder.status)}
                        <span className="ml-1">{selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}</span>
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Payment Method:</span>
                      <p className="font-medium">{selectedOrder.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Amount:</span>
                      <p className="font-bold text-lg">{selectedOrder.total}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Shipping Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Shipping Information</h4>
                  <p className="text-sm text-gray-600">{selectedOrder.shippingAddress}</p>
                  {selectedOrder.trackingNumber && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Tracking Number: </span>
                      <span className="font-mono text-sm font-medium">{selectedOrder.trackingNumber}</span>
                    </div>
                  )}
                  {selectedOrder.estimatedDelivery && (
                    <div className="mt-1">
                      <span className="text-sm text-gray-600">Expected Delivery: </span>
                      <span className="text-sm font-medium">{new Date(selectedOrder.estimatedDelivery).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                    <Link href={`/track-order?orderId=${selectedOrder.id}`}>
                      <Button className="bg-red-600 hover:bg-red-700">
                        <Truck className="h-4 w-4 mr-2" />
                        Track Order
                      </Button>
                    </Link>
                  )}
                  {selectedOrder.status === 'delivered' && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = `/api/orders/${selectedOrder.id}/invoice`;
                        link.download = `Invoice-${selectedOrder.id}.html`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
