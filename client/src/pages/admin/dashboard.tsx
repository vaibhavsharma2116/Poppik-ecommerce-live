
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLocation } from 'wouter';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  Eye,
  Heart,
  Star,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw
} from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState('Last 30 days');

  // Fetch real data from APIs
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['/api/admin/customers'],
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/admin/orders'],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
  });

  const handleViewReports = () => {
    setLocation('/reports');
  };

  const handleViewAllProducts = () => {
    setLocation('/products');
  };

  const handleViewAllCustomers = () => {
    setLocation('/customers');
  };

  const handleViewAllOrders = () => {
    setLocation('/orders');
  };

  const handleDateRangeChange = () => {
    const ranges = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last year'];
    const currentIndex = ranges.indexOf(dateRange);
    const nextIndex = (currentIndex + 1) % ranges.length;
    setDateRange(ranges[nextIndex]);
  };

  // Calculate real stats from data
  const calculateStats = () => {
    if (customersLoading || ordersLoading || productsLoading) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        activeUsers: 0,
        revenueChange: "+0%",
        ordersChange: "+0%",
        productsChange: "+0%",
        usersChange: "+0%"
      };
    }

    // Calculate total revenue from orders
    const totalRevenue = orders.reduce((sum, order) => {
      const amount = typeof order.totalAmount === 'string' 
        ? parseFloat(order.totalAmount.replace(/[₹,]/g, '')) 
        : order.totalAmount || 0;
      return sum + amount;
    }, 0);

    // Calculate active users (customers with orders)
    const customersWithOrders = new Set(orders.map(order => order.userId));
    const activeUsers = customersWithOrders.size;

    // Calculate recent stats for percentage changes (mock for now)
    const totalOrders = orders.length;
    const totalProducts = products.length;

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      activeUsers,
      revenueChange: totalRevenue > 0 ? "+20.1%" : "+0%",
      ordersChange: totalOrders > 0 ? "+180.1%" : "+0%", 
      productsChange: totalProducts > 0 ? "+19%" : "+0%",
      usersChange: activeUsers > 0 ? "+12.5%" : "+0%"
    };
  };

  const stats = calculateStats();

  const dashboardStats = [
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      change: stats.revenueChange,
      trend: "up",
      icon: DollarSign,
      color: "from-emerald-500 to-green-600",
      onClick: handleViewAllOrders
    },
    {
      title: "Orders",
      value: stats.totalOrders.toString(),
      change: stats.ordersChange,
      trend: "up",
      icon: ShoppingCart,
      color: "from-blue-500 to-cyan-600",
      onClick: handleViewAllOrders
    },
    {
      title: "Products",
      value: stats.totalProducts.toString(),
      change: stats.productsChange,
      trend: "up",
      icon: Package,
      color: "from-purple-500 to-violet-600",
      onClick: handleViewAllProducts
    },
    {
      title: "Active Users",
      value: stats.activeUsers.toString(),
      change: stats.usersChange,
      trend: "up",
      icon: Users,
      color: "from-rose-500 to-pink-600",
      onClick: handleViewAllCustomers
    },
  ];

  // Get recent activity from orders
  const getRecentActivity = () => {
    if (!orders.length) return [];
    
    return orders
      .slice(0, 4)
      .map(order => ({
        action: `New order ${order.id}`,
        user: order.customer?.name || "Customer",
        time: calculateTimeAgo(order.date),
        amount: order.total
      }));
  };

  const calculateTimeAgo = (dateString) => {
    const orderDate = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - orderDate) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  // Get top products from orders
  const getTopProducts = () => {
    if (!orders.length) return [];
    
    const productSales = {};
    
    orders.forEach(order => {
      if (order.products) {
        order.products.forEach(product => {
          const name = product.name;
          if (!productSales[name]) {
            productSales[name] = {
              name,
              sales: 0,
              revenue: 0
            };
          }
          productSales[name].sales += product.quantity;
          const price = typeof product.price === 'string' 
            ? parseFloat(product.price.replace(/[₹,]/g, '')) 
            : product.price || 0;
          productSales[name].revenue += price * product.quantity;
        });
      }
    });

    return Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 4)
      .map(product => ({
        ...product,
        revenue: `₹${product.revenue.toLocaleString('en-IN')}`,
        trend: Math.floor(Math.random() * 30) + 5 // Mock trend for now
      }));
  };

  const recentActivity = getRecentActivity();
  const topProducts = getTopProducts();

  if (customersLoading || ordersLoading || productsLoading) {
    return (
      <div className="flex-1 space-y-8 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-pink-600" />
          <span className="ml-2 text-slate-600">Loading dashboard data...</span>
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
            Dashboard Overview
          </h2>
          <p className="text-slate-600 mt-1">Welcome back! Here's what's happening with your store today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleDateRangeChange}>
            <Calendar className="h-4 w-4 mr-2" />
            {dateRange}
          </Button>
          <Button 
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
            onClick={handleViewReports}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className="relative overflow-hidden border-0 shadow-xl bg-white/70 backdrop-blur-sm cursor-pointer hover:shadow-2xl transition-all duration-200"
              onClick={stat.onClick}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`}></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="flex items-center mt-2">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    stat.trend === "up" ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Products */}
        <Card className="lg:col-span-2 border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900">Top Products</CardTitle>
                <CardDescription>Best performing products based on actual orders</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleViewAllProducts}>
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-6">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">{product.name}</h4>
                        <Badge variant={product.trend > 0 ? "default" : "destructive"} className="text-xs">
                          {product.trend > 0 ? "+" : ""}{product.trend}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>{product.sales} sales</span>
                        <span className="font-medium text-slate-900">{product.revenue}</span>
                      </div>
                      <Progress value={Math.min((product.sales / 100) * 100, 100)} className="h-2 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No product sales data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest store activities from real orders</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50/80 transition-colors">
                    <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                      <p className="text-xs text-slate-500">{activity.user} • {activity.time}</p>
                      {activity.amount && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {activity.amount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity to display</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
