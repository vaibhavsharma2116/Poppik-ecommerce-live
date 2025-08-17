
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  RefreshCw
} from "lucide-react";

export default function AdminReports() {
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('overview');

  // Export functionality
  const handleExport = () => {
    if (!analyticsData) return;
    
    // Create CSV data
    const csvData = [
      ['Metric', 'Value'],
      ['Date Range', `Last ${dateRange} days`],
      ['Report Type', reportType],
      ['Generated At', new Date().toLocaleString()],
      [''],
      ['SUMMARY'],
      ['Total Revenue', `₹${analyticsData.totalRevenue.toLocaleString('en-IN')}`],
      ['Total Orders', analyticsData.totalOrders],
      ['Average Order Value', `₹${analyticsData.avgOrderValue.toLocaleString('en-IN')}`],
      ['New Customers', analyticsData.customerStats.newCustomers],
      [''],
      ['TOP PRODUCTS'],
      ['Product Name', 'Revenue', 'Quantity Sold'],
      ...analyticsData.topProducts.map(product => [
        product.name,
        `₹${product.revenue.toLocaleString('en-IN')}`,
        product.quantity
      ]),
      [''],
      ['ORDER STATUS DISTRIBUTION'],
      ['Status', 'Count', 'Percentage'],
      ...analyticsData.statusData.map(status => [
        status.status,
        status.count,
        `${status.percentage}%`
      ]),
      [''],
      ['REVENUE TREND'],
      ['Date', 'Revenue', 'Orders'],
      ...analyticsData.revenueData.map(data => [
        data.date,
        `₹${data.revenue.toLocaleString('en-IN')}`,
        data.orders
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    
    const exportFileDefaultName = `analytics-report-${dateRange}days-${new Date().toISOString().split('T')[0]}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Fetch data from APIs
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/admin/orders'],
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['/api/admin/customers'],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
  });

  const isLoading = ordersLoading || customersLoading || productsLoading;

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    if (isLoading || !orders.length) return null;

    const now = new Date();
    const daysBack = parseInt(dateRange);
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Filter orders by date range
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.date);
      return orderDate >= startDate && orderDate <= now;
    });

    // Revenue over time
    const revenueByDate = {};
    filteredOrders.forEach(order => {
      const date = order.date;
      const amount = typeof order.totalAmount === 'number' 
        ? order.totalAmount 
        : parseFloat(order.total.replace(/[₹,]/g, '')) || 0;
      
      if (!revenueByDate[date]) {
        revenueByDate[date] = 0;
      }
      revenueByDate[date] += amount;
    });

    const revenueData = Object.entries(revenueByDate)
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        revenue: revenue,
        orders: filteredOrders.filter(o => o.date === date).length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Order status distribution
    const statusCounts = {};
    filteredOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: Math.round((count / filteredOrders.length) * 100)
    }));

    // Top products by sales
    const productSales = {};
    filteredOrders.forEach(order => {
      if (order.products) {
        order.products.forEach(product => {
          const name = product.name;
          if (!productSales[name]) {
            productSales[name] = { name, quantity: 0, revenue: 0 };
          }
          productSales[name].quantity += product.quantity;
          const price = typeof product.price === 'string' 
            ? parseFloat(product.price.replace(/[₹,]/g, '')) 
            : product.price || 0;
          productSales[name].revenue += price * product.quantity;
        });
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Customer metrics
    const customerStats = {
      newCustomers: customers.filter(c => {
        const joinDate = new Date(c.joinedDate);
        return joinDate >= startDate;
      }).length,
      activeCustomers: customers.filter(c => c.orders > 0).length,
      vipCustomers: customers.filter(c => c.status === 'VIP').length
    };

    // Calculate totals
    const totalRevenue = filteredOrders.reduce((sum, order) => {
      const amount = typeof order.totalAmount === 'number' 
        ? order.totalAmount 
        : parseFloat(order.total.replace(/[₹,]/g, '')) || 0;
      return sum + amount;
    }, 0);

    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      revenueData,
      statusData,
      topProducts,
      customerStats
    };
  }, [orders, customers, products, dateRange, isLoading]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  if (isLoading) {
    return (
      <div className="flex-1 space-y-8 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-pink-600" />
          <span className="ml-2 text-slate-600">Loading reports data...</span>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex-1 space-y-8 p-8 pt-6">
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Data Available</h3>
          <p className="text-slate-600">No orders found for the selected period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Analytics & Reports
          </h2>
          <p className="text-slate-600 mt-1">Comprehensive insights into your store performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="customers">Customers</SelectItem>
              <SelectItem value="products">Products</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ₹{analyticsData.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center mt-2 text-sm text-emerald-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>+12.5% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{analyticsData.totalOrders}</div>
            <div className="flex items-center mt-2 text-sm text-blue-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>+8.2% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ₹{analyticsData.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center mt-2 text-sm text-purple-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>+5.1% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">New Customers</CardTitle>
            <Users className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{analyticsData.customerStats.newCustomers}</div>
            <div className="flex items-center mt-2 text-sm text-rose-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>+15.3% from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Revenue Trend</CardTitle>
            <CardDescription>Daily revenue for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Order Status Distribution</CardTitle>
            <CardDescription>Breakdown of orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Top Performing Products</CardTitle>
          <CardDescription>Best selling products by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analyticsData.topProducts.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                formatter={(value, name) => [
                  name === 'revenue' 
                    ? `₹${value.toLocaleString('en-IN')}` 
                    : `${value} units`,
                  name === 'revenue' ? 'Revenue' : 'Quantity'
                ]}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="quantity" fill="#10b981" name="Quantity" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Performance Summary</CardTitle>
          <CardDescription>Key metrics comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900">Sales Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Revenue:</span>
                  <span className="font-medium">₹{analyticsData.totalRevenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Orders:</span>
                  <span className="font-medium">{analyticsData.totalOrders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Avg Order Value:</span>
                  <span className="font-medium">₹{analyticsData.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900">Customer Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">New Customers:</span>
                  <span className="font-medium">{analyticsData.customerStats.newCustomers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Active Customers:</span>
                  <span className="font-medium">{analyticsData.customerStats.activeCustomers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">VIP Customers:</span>
                  <span className="font-medium">{analyticsData.customerStats.vipCustomers}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900">Product Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Products:</span>
                  <span className="font-medium">{products.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Top Product:</span>
                  <span className="font-medium text-xs">{analyticsData.topProducts[0]?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Best Revenue:</span>
                  <span className="font-medium">₹{analyticsData.topProducts[0]?.revenue.toLocaleString('en-IN') || '0'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
