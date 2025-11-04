
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Package,
  DollarSign,
  Users,
  Copy,
  Share2,
  BarChart3,
  ShoppingBag,
  CheckCircle,
  Clock,
  Instagram,
  Youtube,
  Facebook,
  Sparkles,
  Award,
  Target,
  ArrowUpRight,
  Link as LinkIcon,
  ExternalLink,
  Download,
  Calendar,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Products List Component
function ProductsList({ affiliateCode, copyAffiliateLink }: { affiliateCode: string; copyAffiliateLink: (productId?: number) => void }) {
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading products...</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Available</h3>
        <p className="text-gray-500">Check back soon for new products to promote!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.slice(0, 9).map((product: any) => (
        <Card key={product.id} className="border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all">
          <CardContent className="p-0">
            <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
              {product.images && product.images.length > 0 && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}
              {product.discount > 0 && (
                <Badge className="absolute top-3 right-3 bg-red-600 text-white border-0">
                  {product.discount}% OFF
                </Badge>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-bold text-purple-600">₹{product.salePrice || product.price}</span>
                {product.discount > 0 && (
                  <span className="text-sm text-gray-500 line-through">₹{product.price}</span>
                )}
              </div>
              <Button
                onClick={() => copyAffiliateLink(product.id)}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Get Affiliate Link
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AffiliateDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [affiliateCode, setAffiliateCode] = useState<string>("");

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Fetch affiliate application status
  const { data: application, isLoading } = useQuery({
    queryKey: ["/api/affiliate/my-application", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/affiliate/my-application?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch application");
      return res.json();
    },
    enabled: !!user.id,
  });

  // Fetch affiliate statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/affiliate/stats", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/affiliate/stats?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!user.id && !!application && application.status === "approved",
    initialData: {
      totalEarnings: 0,
      pendingEarnings: 0,
      totalClicks: 0,
      totalSales: 0,
      conversionRate: 0,
      monthlyGrowth: 0,
    }
  });

  // Fetch recent sales
  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ["/api/affiliate/sales", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/affiliate/sales?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch sales");
      return res.json();
    },
    enabled: !!user.id && !!application && application.status === "approved",
    initialData: []
  });

  useEffect(() => {
    console.log('Dashboard - Application status check:', application);
    if (application) {
      const status = application.status?.toLowerCase();
      console.log('Dashboard - Application status:', status);
      
      if (status === "approved") {
        const code = `POPPIK${user.email?.substring(0, 4).toUpperCase() || "USER"}${user.id}`;
        setAffiliateCode(code);
        console.log('Dashboard - Affiliate code generated:', code);
      } else {
        console.log('Dashboard - Not approved, redirecting to affiliate page');
        setLocation("/affiliate");
      }
    }
  }, [application, user.id, user.email, setLocation]);

  const copyAffiliateCode = () => {
    navigator.clipboard.writeText(affiliateCode);
    toast({
      title: "Copied!",
      description: "Affiliate code copied to clipboard",
    });
  };

  const copyAffiliateLink = (productId?: number) => {
    const baseUrl = window.location.origin;
    const link = productId 
      ? `${baseUrl}/product/${productId}?ref=${affiliateCode}`
      : `${baseUrl}?ref=${affiliateCode}`;
    
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Affiliate link copied to clipboard",
    });
  };

  if (isLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!application || application.status !== "approved") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Affiliate Portal</h1>
                <p className="text-sm text-gray-500">Manage your partnerships</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2 text-sm font-semibold">
              <CheckCircle className="mr-2 h-4 w-4" />
              Active Partner
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="h-6 w-6" />
                <h2 className="text-2xl font-bold">Welcome back, {application.firstName}!</h2>
              </div>
              <p className="text-purple-100 text-lg mb-4">
                Track your performance and grow your earnings with Poppik
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Member since {new Date(application.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </div>
                {stats?.monthlyGrowth !== undefined && stats?.monthlyGrowth !== 0 && (
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    {stats.monthlyGrowth > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span className="text-sm font-medium">{stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth}% this month</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => copyAffiliateLink()}
                size="lg"
                className="bg-white text-purple-700 hover:bg-gray-100 shadow-lg font-semibold"
              >
                <Share2 className="h-5 w-5 mr-2" />
                Share Your Link
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-purple-700 hover:bg-white/10 backdrop-blur-sm font-semibold"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Resources
              </Button>
            </div>
          </div>
        </div>

        {/* Affiliate Code Card - Premium Design */}
        <Card className="mb-8 overflow-hidden border-2 border-purple-200 shadow-lg">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <LinkIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Your Unique Code</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Use this code to track all your referrals and earn commissions
                </p>
                <div className="relative">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 text-center">
                    <code className="text-3xl lg:text-4xl font-bold text-purple-700 tracking-widest select-all">
                      {affiliateCode}
                    </code>
                  </div>
                  <div className="absolute -top-3 -right-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full lg:w-auto">
                <Button
                  onClick={copyAffiliateCode}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg w-full lg:w-auto"
                >
                  <Copy className="h-5 w-5 mr-2" />
                  Copy Code
                </Button>
                <Button
                  onClick={() => copyAffiliateLink()}
                  size="lg"
                  variant="outline"
                  className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50 w-full lg:w-auto"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Get Shareable Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid - Professional Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
                {stats?.earningsGrowth !== undefined && stats?.earningsGrowth !== 0 && (
                  <div className={`flex items-center gap-1 font-semibold text-sm ${stats.earningsGrowth > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {stats.earningsGrowth > 0 ? <ArrowUpRight className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span>{stats.earningsGrowth > 0 ? '+' : ''}{stats.earningsGrowth}%</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ₹{(stats?.totalEarnings || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Total Earnings</p>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500" style={{ width: stats?.totalEarnings > 0 ? '75%' : '5%' }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Clock className="h-7 w-7 text-white" />
                </div>
                <div className="flex items-center gap-1 text-amber-600 font-semibold text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Pending</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ₹{(stats?.pendingEarnings || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Pending Payout</p>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500" style={{ width: stats?.pendingEarnings > 0 ? '50%' : '5%' }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-7 w-7 text-white" />
                </div>
                {stats?.clicksGrowth !== undefined && stats?.clicksGrowth !== 0 && (
                  <div className={`flex items-center gap-1 font-semibold text-sm ${stats.clicksGrowth > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {stats.clicksGrowth > 0 ? <ArrowUpRight className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span>{stats.clicksGrowth > 0 ? '+' : ''}{stats.clicksGrowth}%</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {(stats?.totalClicks || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Total Clicks</p>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500" style={{ width: stats?.totalClicks > 0 ? Math.min((stats.totalClicks / 100) * 100, 100) + '%' : '5%' }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Target className="h-7 w-7 text-white" />
                </div>
                <div className="flex items-center gap-1 text-purple-600 font-semibold text-sm">
                  {stats?.conversionRate > 0 && <Target className="h-4 w-4" />}
                  <span>{(stats?.conversionRate || 0).toFixed(1)}%</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {(stats?.totalSales || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Total Sales</p>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-500" style={{ width: stats?.totalSales > 0 ? Math.min((stats.totalSales / 50) * 100, 100) + '%' : '5%' }}></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white shadow-md p-1.5 rounded-xl border border-gray-200 inline-flex gap-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-2.5 rounded-lg font-semibold transition-all"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-2.5 rounded-lg font-semibold transition-all"
            >
              <Package className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger 
              value="sales" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-2.5 rounded-lg font-semibold transition-all"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Sales
            </TabsTrigger>
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-6 py-2.5 rounded-lg font-semibold transition-all"
            >
              <Users className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      Recent Sales Activity
                    </CardTitle>
                    <CardDescription className="mt-1">Your latest commission earnings and transactions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="font-bold text-gray-700">Product</TableHead>
                      <TableHead className="font-bold text-gray-700">Customer</TableHead>
                      <TableHead className="font-bold text-gray-700">Sale Amount</TableHead>
                      <TableHead className="font-bold text-gray-700">Commission</TableHead>
                      <TableHead className="font-bold text-gray-700">Date</TableHead>
                      <TableHead className="font-bold text-gray-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <span className="ml-3 text-gray-600">Loading sales...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : recentSales && recentSales.length > 0 ? (
                      recentSales.map((sale: any) => (
                        <TableRow key={sale.id} className="hover:bg-purple-50/50 border-b border-gray-100">
                          <TableCell className="font-semibold text-gray-900">{sale.product}</TableCell>
                          <TableCell className="text-gray-600">{sale.customer}</TableCell>
                          <TableCell className="font-medium">₹{sale.amount}</TableCell>
                          <TableCell className="font-bold text-emerald-600 text-lg">
                            ₹{sale.commission}
                          </TableCell>
                          <TableCell className="text-gray-600">{new Date(sale.date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>
                            <Badge
                              variant={sale.status === "paid" ? "default" : "secondary"}
                              className={sale.status === "paid" 
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                : "bg-amber-100 text-amber-700 border-amber-200"
                              }
                            >
                              {sale.status === "paid" ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              {sale.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sales Yet</h3>
                            <p className="text-gray-500 mb-6">Start sharing your affiliate links to earn commissions!</p>
                            <Button 
                              onClick={() => copyAffiliateLink()}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Copy Affiliate Link
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      Top Products to Promote
                    </CardTitle>
                    <CardDescription className="mt-1">Generate affiliate links for our bestselling products</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setLocation("/products")}
                    variant="outline"
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    View All Products
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ProductsList affiliateCode={affiliateCode} copyAffiliateLink={copyAffiliateLink} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription className="mt-1">Your sales performance breakdown</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                          <Target className="h-6 w-6 text-white" />
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          {stats?.conversionRate || 0}%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 font-medium mb-2">Conversion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.totalSales || 0} / {stats?.totalClicks || 0}
                      </p>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          Average
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 font-medium mb-2">Avg. Commission</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{stats?.totalSales > 0 ? Math.round((stats?.totalEarnings || 0) / stats.totalSales) : 0}
                      </p>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                          {(stats?.monthlyGrowth || 0) >= 0 ? <TrendingUp className="h-6 w-6 text-white" /> : <TrendingDown className="h-6 w-6 text-white" />}
                        </div>
                        <Badge className={`${(stats?.monthlyGrowth || 0) >= 0 ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                          {(stats?.monthlyGrowth || 0) >= 0 ? 'Growth' : 'Decline'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 font-medium mb-2">Monthly Growth</p>
                      <p className={`text-2xl font-bold ${(stats?.monthlyGrowth || 0) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {(stats?.monthlyGrowth || 0) > 0 ? '+' : ''}{stats?.monthlyGrowth || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Performance</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">Total Link Clicks</p>
                            <p className="text-sm text-gray-600">All-time visitors</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-blue-600">{(stats?.totalClicks || 0).toLocaleString('en-IN')}</p>
                          {stats?.clicksGrowth !== undefined && stats?.clicksGrowth !== 0 && (
                            <p className={`text-sm font-semibold mt-1 ${stats.clicksGrowth > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {stats.clicksGrowth > 0 ? '↑' : '↓'} {Math.abs(stats.clicksGrowth)}% this month
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                            <ShoppingBag className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">Total Conversions</p>
                            <p className="text-sm text-gray-600">Successful sales</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-emerald-600">{(stats?.totalSales || 0).toLocaleString('en-IN')}</p>
                          {stats?.conversionRate !== undefined && stats?.conversionRate > 0 && (
                            <p className="text-sm font-semibold text-emerald-600 mt-1">
                              {stats.conversionRate.toFixed(1)}% conversion rate
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                            <DollarSign className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">Lifetime Earnings</p>
                            <p className="text-sm text-gray-600">Total commissions earned</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-purple-600">₹{(stats?.totalEarnings || 0).toLocaleString('en-IN')}</p>
                          {stats?.earningsGrowth !== undefined && stats?.earningsGrowth !== 0 && (
                            <p className={`text-sm font-semibold mt-1 ${stats.earningsGrowth > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {stats.earningsGrowth > 0 ? '↑' : '↓'} {Math.abs(stats.earningsGrowth)}% this month
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-pink-50 to-purple-50">
                <CardTitle className="text-xl">Affiliate Profile</CardTitle>
                <CardDescription className="mt-1">Your account information and social media connections</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="grid gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full Name</label>
                      <p className="text-gray-900 text-xl font-semibold">{application.firstName} {application.lastName}</p>
                    </div>
                    <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email Address</label>
                      <p className="text-gray-900 text-xl font-semibold">{application.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone Number</label>
                    <p className="text-gray-900 text-xl font-semibold">{application.phone}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Social Media Profiles</label>
                    <div className="grid gap-4">
                      {application.instagramHandle && (
                        <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 rounded-xl border border-pink-200 hover:shadow-md transition-shadow">
                          <div className="w-14 h-14 bg-gradient-to-br from-pink-500 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <Instagram className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-lg">{application.instagramHandle}</p>
                            <Badge variant="secondary" className="mt-2 bg-purple-100 text-purple-700 border-purple-200">
                              <Users className="h-3 w-3 mr-1" />
                              {application.instagramFollowers} followers
                            </Badge>
                          </div>
                        </div>
                      )}
                      {application.youtubeChannel && (
                        <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200 hover:shadow-md transition-shadow">
                          <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <Youtube className="h-7 w-7 text-white" />
                          </div>
                          <p className="font-bold text-gray-900 text-lg">{application.youtubeChannel}</p>
                        </div>
                      )}
                      {application.facebookProfile && (
                        <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-shadow">
                          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <Facebook className="h-7 w-7 text-white" />
                          </div>
                          <p className="font-bold text-gray-900 text-lg">{application.facebookProfile}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
