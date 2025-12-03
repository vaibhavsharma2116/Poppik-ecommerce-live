import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, 
  Search, 
  Filter, 
  Download, 
  MoreVertical,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Edit,
  Save,
  RefreshCw,
  Send // Import Send icon
} from "lucide-react";

interface Order {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  date: string;
  total: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  paymentMethod: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  products: Array<{
    name: string;
    quantity: number;
    price: string;
    image: string;
    deliveryAddress?: string;
    recipientName?: string;
    recipientPhone?: string;
  }>;
  userId?: number;
  totalAmount?: number;
  shippingAddress?: string;
  awbCode?: string; // Add awbCode for Shiprocket
}

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const { toast } = useToast();

  // Fetch all orders from backend
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
      setOrders([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCashfreeOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sync-cashfree-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message,
        });
        // Refresh orders after sync
        await fetchOrders();
      } else {
        throw new Error('Failed to sync Cashfree orders');
      }
    } catch (error) {
      console.error('Error syncing Cashfree orders:', error);
      toast({
        title: "Error",
        description: "Failed to sync Cashfree orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to ship order via Shiprocket
  const handleShipOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/shiprocket/ship', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message,
        });
        // Refresh orders to show updated status and AWB code
        await fetchOrders();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to ship order');
      }
    } catch (error: any) {
      console.error('Error shipping order:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on search term, status, and date
  const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();

    // Date filtering logic can be enhanced based on requirements
    const matchesDate = dateFilter === 'all' || true; // Simplified for demo

    return matchesSearch && matchesStatus && matchesDate;
  }) : [];

  // Calculate stats
  const totalOrders = Array.isArray(orders) ? orders.length : 0;
  const pendingOrders = Array.isArray(orders) ? orders.filter(o => o.status === 'pending').length : 0;
  const processingOrders = Array.isArray(orders) ? orders.filter(o => o.status === 'processing').length : 0;
  const shippedOrders = Array.isArray(orders) ? orders.filter(o => o.status === 'shipped').length : 0;
  const deliveredOrders = Array.isArray(orders) ? orders.filter(o => o.status === 'delivered').length : 0;

  const totalRevenue = Array.isArray(orders) ? orders.reduce((sum, order) => {
    const amount = order.totalAmount || parseFloat(order.total.replace(/[₹$,]/g, ''));
    return sum + amount;
  }, 0) : 0;

  const stats = [
    { label: "Total Orders", value: totalOrders.toString(), icon: Package, color: "from-blue-500 to-cyan-500" },
    { label: "Pending", value: pendingOrders.toString(), icon: Clock, color: "from-yellow-500 to-orange-500" },
    { label: "Processing", value: processingOrders.toString(), icon: AlertCircle, color: "from-purple-500 to-pink-500" },
    { label: "Revenue", value: `₹${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "from-green-500 to-emerald-500" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <AlertCircle className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'shipped': return 'secondary';
      case 'processing': return 'outline';
      case 'pending': return 'destructive';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });

      if (response.ok) {
        // Update local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus as Order['status'] } : order
          )
        );

        toast({
          title: "Success",
          description: `Order ${orderId} status updated to ${newStatus}`,
        });

        // Send notification to customer
        await handleSendNotification(orderId, newStatus);
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTracking = async (orderId: string, trackingNumber: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/tracking`, { // Corrected endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackingNumber }),
        credentials: 'include',
      });

      if (response.ok) {
        // Update local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, trackingNumber } : order
          )
        );

        setEditingTracking(null);
        setTrackingInput('');

        toast({
          title: "Success",
          description: `Tracking number updated for order ${orderId}`,
        });
      } else {
        throw new Error('Failed to update tracking number');
      }
    } catch (error) {
      console.error('Error updating tracking:', error);
      toast({
        title: "Error",
        description: "Failed to update tracking number",
        variant: "destructive",
      });
    }
  };

  const handleSendNotification = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
        credentials: 'include',
      });

      if (response.ok) {
        console.log(`Notification sent for order ${orderId} with status ${status}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleDownloadInvoice = (order: Order) => {
    const link = document.createElement('a');
    link.href = `/api/orders/${order.id}/invoice`;
    link.download = `Invoice-${order.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditingTracking = (orderId: string, currentTracking?: string) => {
    setEditingTracking(orderId);
    setTrackingInput(currentTracking || '');
  };

  const saveTracking = (orderId: string) => {
    if (trackingInput.trim()) {
      handleUpdateTracking(orderId, trackingInput.trim());
    }
  };

  const cancelEditingTracking = () => {
    setEditingTracking(null);
    setTrackingInput('');
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Order Management
          </h2>
          <p className="text-slate-600 mt-1">Track and manage customer orders efficiently</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncCashfreeOrders}>
            <Package className="h-4 w-4 mr-2" />
            Sync Cashfree Orders
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search orders by ID, customer name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Orders ({filteredOrders.length})
          </CardTitle>
          <CardDescription>Manage customer orders and track their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold">Order ID</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Items</TableHead>
                  <TableHead className="font-semibold">Total</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Tracking</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-medium text-slate-900">{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{order.customer.name}</div>
                        <div className="text-sm text-slate-500">{order.customer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-slate-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        {order.date}
                      </div>
                    </TableCell>
                    <TableCell>{order.items} items</TableCell>
                    <TableCell className="font-semibold text-slate-900">{order.total}</TableCell>
                    <TableCell>
                      <Select onValueChange={(value) => handleStatusChange(order.id, value)}>
                        <SelectTrigger className="w-[120px]">
                          <Badge 
                            variant={getStatusColor(order.status)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getStatusIcon(order.status)}
                            {order.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {editingTracking === order.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={trackingInput}
                            onChange={(e) => setTrackingInput(e.target.value)}
                            placeholder="Enter tracking number"
                            className="w-32"
                          />
                          <Button size="sm" onClick={() => saveTracking(order.id)}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditingTracking}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">
                            {order.trackingNumber || 'Not assigned'}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditingTracking(order.id, order.trackingNumber)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendNotification(order.id, order.status)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Notify
                        </Button>
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShipOrder(order.id)}
                            className="ml-2"
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Ship
                          </Button>
                        )}
                        {order.awbCode && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/api/orders/${order.id}/track-shiprocket`, '_blank')}
                            className="ml-2"
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Track
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details - {selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>
              Complete information about the selected order
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="customer">Customer</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Order ID:</span>
                        <span className="font-medium">{selectedOrder.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Date:</span>
                        <span className="font-medium">{selectedOrder.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Status:</span>
                        <Badge variant={getStatusColor(selectedOrder.status)}>
                          {getStatusIcon(selectedOrder.status)}
                          {selectedOrder.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Amount:</span>
                        <span className="font-bold text-lg">{selectedOrder.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Payment Method:</span>
                        <span className="font-medium">{selectedOrder.paymentMethod}</span>
                      </div>
                      {selectedOrder.trackingNumber && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tracking Number:</span>
                          <span className="font-medium">{selectedOrder.trackingNumber}</span>
                        </div>
                      )}
                      {selectedOrder.estimatedDelivery && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Est. Delivery:</span>
                          <span className="font-medium">{selectedOrder.estimatedDelivery}</span>
                        </div>
                      )}
                      {selectedOrder.awbCode && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">AWB Code:</span>
                          <span className="font-medium">{selectedOrder.awbCode}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => startEditingTracking(selectedOrder.id, selectedOrder.trackingNumber)}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Update Tracking
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handleSendNotification(selectedOrder.id, selectedOrder.status)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Notification
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => handleDownloadInvoice(selectedOrder)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Invoice
                      </Button>
                      {selectedOrder.status === 'pending' && (
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          onClick={() => handleShipOrder(selectedOrder.id)}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Ship via Shiprocket
                        </Button>
                      )}
                      {selectedOrder.awbCode && (
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          onClick={() => window.open(`/api/orders/${selectedOrder.id}/track-shiprocket`, '_blank')}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Track Shipment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="customer" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-600">Customer Name</Label>
                        <p className="font-medium">{selectedOrder.customer.name}</p>
                      </div>
                      <div>
                        <Label className="text-slate-600">Email Address</Label>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {selectedOrder.customer.email}
                        </p>
                      </div>
                      <div>
                        <Label className="text-slate-600">Phone Number</Label>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {selectedOrder.customer.phone}
                        </p>
                      </div>
                      <div>
                        <Label className="text-slate-600">Shipping Address</Label>
                                <p className="font-medium flex items-start gap-1">
                                  <MapPin className="h-4 w-4 mt-0.5" />
                                  {selectedOrder.customer.address}
                                </p>
                                {/* Render multi-address details if shippingAddress contains multi-address JSON */}
                                {(() => {
                                  try {
                                    const raw = selectedOrder.shippingAddress;
                                    if (!raw) return null;
                                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                    if (parsed && parsed.multi && Array.isArray(parsed.items)) {
                                      return (
                                        <Card className="mt-4">
                                          <CardHeader>
                                            <CardTitle className="text-md">Delivery Addresses</CardTitle>
                                          </CardHeader>
                                          <CardContent>
                                            <div className="text-sm text-slate-600 mb-2 flex items-center gap-2">
                                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                                              Multiple delivery addresses present for this order
                                            </div>
                                            <div className="overflow-auto">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow className="bg-slate-50/80">
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Recipient</TableHead>
                                                    <TableHead>Phone</TableHead>
                                                    <TableHead>Address</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {parsed.items.map((it: any, idx: number) => (
                                                    <TableRow key={idx}>
                                                      <TableCell>{it.productName || it.name || `Item ${idx + 1}`}</TableCell>
                                                      <TableCell>{it.recipientName || '-'}</TableCell>
                                                      <TableCell>{it.recipientPhone || '-'}</TableCell>
                                                      <TableCell className="whitespace-pre-wrap">{it.deliveryAddress || it.address || '-'}</TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    }
                                  } catch (e) {
                                    // parsing failed or no multi-address data; fall back silently
                                  }
                                  return null;
                                })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="products" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ordered Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedOrder.products.map((product, index) => (
                        <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                <Package className="h-6 w-6 text-slate-400" />
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-slate-600">Quantity: {product.quantity}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{product.price}</p>
                            </div>
                          </div>
                          
                          {/* Show delivery address info if available */}
                          {(product.deliveryAddress || product.recipientName || product.recipientPhone) && (
                            <div className="pt-3 border-t border-slate-100 space-y-2 bg-slate-50 p-3 rounded-md">
                              {product.recipientName && (
                                <div className="flex items-start gap-2">
                                  <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-slate-500">Recipient Name</p>
                                    <p className="text-sm font-medium">{product.recipientName}</p>
                                  </div>
                                </div>
                              )}
                              {product.recipientPhone && (
                                <div className="flex items-start gap-2">
                                  <Phone className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-slate-500">Phone</p>
                                    <p className="text-sm font-medium">{product.recipientPhone}</p>
                                  </div>
                                </div>
                              )}
                              {product.deliveryAddress && (
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-slate-500">Delivery Address</p>
                                    <p className="text-sm font-medium whitespace-pre-wrap">{product.deliveryAddress}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}