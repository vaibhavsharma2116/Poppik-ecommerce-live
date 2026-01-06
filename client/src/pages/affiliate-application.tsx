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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Package,
  IndianRupee,
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

// Combos List Component
function CombosList({ affiliateCode, copyAffiliateLink }: { affiliateCode: string; copyAffiliateLink: (comboId?: number) => void }) {
  const [showAllCombos, setShowAllCombos] = useState(false);

  const { data: combos, isLoading } = useQuery({
    queryKey: ["/api/combos"],
    queryFn: async () => {
      const res = await fetch("/api/combos");
      if (!res.ok) throw new Error("Failed to fetch combos");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading combo offers...</p>
      </div>
    );
  }

  const activeCombos = combos?.filter((combo: any) => combo.isActive) || [];

  if (activeCombos.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Combo Offers Available</h3>
        <p className="text-gray-500">Check back soon for new combo deals!</p>
      </div>
    );
  }

  const displayedCombos = showAllCombos ? activeCombos : activeCombos.slice(0, 6);

  const getPrimaryImage = (combo: any) => {
    if (!combo) return null;
    if (Array.isArray(combo.imageUrl) && combo.imageUrl.length) return combo.imageUrl[0];
    if (Array.isArray(combo.imageUrls) && combo.imageUrls.length) return combo.imageUrls[0];
    if (Array.isArray(combo.images) && combo.images.length) return combo.images[0];
    if (typeof combo.imageUrl === 'string' && combo.imageUrl) return combo.imageUrl;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedCombos.map((combo: any) => {
          const price = typeof combo.price === 'string' ? parseFloat(combo.price) : combo.price;
          const originalPrice = typeof combo.originalPrice === 'string' ? parseFloat(combo.originalPrice) : combo.originalPrice;
          const discountPercentage = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

          return (
            <Card key={combo.id} className="border-2 border-gray-200 hover:border-pink-300 hover:shadow-lg transition-all">
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gray-100">
                  <img
                    src={getPrimaryImage(combo) || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=75'}
                    alt={combo.name}
                    className="w-full h-full object-cover"
                  />
                  {discountPercentage > 0 && (
                    <Badge className="absolute top-3 right-3 bg-red-600 text-white border-0">
                      {discountPercentage}% OFF
                    </Badge>
                  )}
                  <Badge className="absolute top-3 left-3 bg-pink-600 text-white border-0">
                    COMBO
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{combo.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{combo.description}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-bold text-pink-600">₹{price}</span>
                    {originalPrice > price && (
                      <span className="text-sm text-gray-500 line-through">₹{originalPrice}</span>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      const link = `${window.location.origin}/combo/${combo.id}?ref=${affiliateCode}`;
                      navigator.clipboard.writeText(link);
                      // Show toast notification
                    }}
                    className="w-full bg-pink-600 hover:bg-pink-700"
                    size="sm"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Get Affiliate Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeCombos.length > 6 && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => setShowAllCombos(!showAllCombos)}
            size="lg"
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg px-12"
          >
            {showAllCombos ? (
              <>
                <Package className="h-5 w-5 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <ExternalLink className="h-5 w-5 mr-2" />
                View All Combos
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Beauty Kits List Component
function BeautyKitsList({ affiliateCode, copyAffiliateLink }: { affiliateCode: string; copyAffiliateLink: (kitId?: string) => void }) {
  const beautyKits = [
    {
      id: 'micro',
      name: 'Micro Beauty Kit',
      description: 'Perfect starter kit for beauty essentials',
      imageUrl: '/attached_assets/Untitled_design.png',
      path: '/beauty-kit-micro',
      icon: '💄',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'small',
      name: 'Small Beauty Kit',
      description: 'Compact collection for everyday beauty',
      imageUrl: '/attached_assets/Untitled_design.png',
      path: '/beauty-kit-small',
      icon: '✨',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'medium',
      name: 'Medium Beauty Kit',
      description: 'Complete beauty solution for all occasions',
      imageUrl: '/attached_assets/Untitled_design.png',
      path: '/beauty-kit-medium',
      icon: '💅',
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'large',
      name: 'Large Beauty Kit',
      description: 'Premium collection for beauty professionals',
      imageUrl: '/attached_assets/Untitled_design.png',
      path: '/beauty-kit-large',
      icon: '👑',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {beautyKits.map((kit) => (
        <Card key={kit.id} className="border-2 border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all">
          <CardContent className="p-0">
            <div className="aspect-square relative overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-100 to-gray-200">
              <div className={`absolute inset-0 bg-gradient-to-br ${kit.color} opacity-20`}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl">{kit.icon}</span>
              </div>
              <Badge className={`absolute top-3 right-3 bg-gradient-to-r ${kit.color} text-white border-0`}>
                KIT
              </Badge>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-2">{kit.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{kit.description}</p>
              <Button
                onClick={() => {
                  const link = `${window.location.origin}${kit.path}?ref=${affiliateCode}`;
                  navigator.clipboard.writeText(link);
                  // Show toast notification
                }}
                className={`w-full bg-gradient-to-r ${kit.color} hover:opacity-90`}
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

// Products List Component
function ProductsList({ affiliateCode, copyAffiliateLink }: { affiliateCode: string; copyAffiliateLink: (productId?: number) => void }) {
  const [showAllProducts, setShowAllProducts] = useState(false);

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

  const displayedProducts = showAllProducts ? products : products.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedProducts.map((product: any) => (
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

      {products.length > 6 && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => setShowAllProducts(!showAllProducts)}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg px-12"
          >
            {showAllProducts ? (
              <>
                <Package className="h-5 w-5 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <ExternalLink className="h-5 w-5 mr-2" />
                View All Products
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AffiliateDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [affiliateCode, setAffiliateCode] = useState<string>("");
  const [showShareDialog, setShowShareDialog] = useState(false);

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

  // Fetch affiliate wallet
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["/api/affiliate/wallet", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/affiliate/wallet?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return res.json();
    },
    enabled: !!user.id && !!application && application.status === "approved",
    initialData: {
      cashbackBalance: "0.00",
      commissionBalance: "0.00",
      totalEarnings: "0.00",
      totalWithdrawn: "0.00"
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
        // Format user ID as 2-digit number (01, 02, 03, etc.)
        const formattedUserId = user.id.toString().padStart(2, '0');
        const code = `POPPIKAP${formattedUserId}`;
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
    const baseUrl = 'https://poppiklifestyle.com';
     
    const affiliateLink = productId 
      ? `${baseUrl}/product/${productId}?ref=${affiliateCode}`
      : `${baseUrl}/?ref=${affiliateCode}`;

    navigator.clipboard.writeText(affiliateLink);
    toast({
      title: "Copied!",
      description: "Affiliate link copied to clipboard",
    });
  };

  const shareToWhatsApp = () => {
    const baseUrl =  'https://poppiklifestyle.com' 
     
    const affiliateLink = `${baseUrl}/?ref=${affiliateCode}`;
    const message = `🌟 Check out Poppik Lifestyle! Use my code ${affiliateCode} for amazing beauty products. ${affiliateLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareToFacebook = () => {
    const baseUrl =  'https://poppiklifestyle.com' 
     
    const affiliateLink = `${baseUrl}/?ref=${affiliateCode}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(affiliateLink)}`, '_blank');
  };

  const shareToTwitter = () => {
    const baseUrl =  'https://poppiklifestyle.com' 
     
    const affiliateLink = `${baseUrl}/?ref=${affiliateCode}`;
    const message = `Check out @PoppikLifestyle! Use code ${affiliateCode} for amazing beauty products.`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(affiliateLink)}`, '_blank');
  };

  const shareToInstagram = () => {
    const baseUrl =  'https://poppiklifestyle.com' 
     
    const affiliateLink = `${baseUrl}/?ref=${affiliateCode}`;
    window.open('https://www.instagram.com/', '_blank');
    toast({
      title: "Instagram",
      description: `Copy your link: ${affiliateLink}`,
      duration: 5000,
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-100 shadow-sm">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <span className="text-sm font-medium">
                    Member since {application?.createdAt 
                      ? new Date(application.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                      : new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {stats?.monthlyGrowth !== undefined && stats?.monthlyGrowth !== 0 && (
                  <div className={`flex items-center gap-1 font-semibold text-sm ${stats.monthlyGrowth > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {stats.monthlyGrowth > 0 ? <ArrowUpRight className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span>{stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth}% this month</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => setShowShareDialog(true)}
                size="lg"
                className="bg-white text-purple-700 hover:bg-gray-100 shadow-lg font-semibold"
              >
                <Share2 className="h-5 w-5 mr-2" />
                Share Your Link
              </Button>
              <Button
                onClick={() => {
                  // Create affiliate marketing kit download
                  const affiliateKit = `
POPPIK AFFILIATE MARKETING KIT
================================

Welcome ${application?.firstName || 'Affiliate'}!

Your Unique Affiliate Code: ${affiliateCode}

QUICK LINKS:
------------
🔗 Your Affiliate Link: ${window.location.origin}?ref=${affiliateCode}
📊 Dashboard: ${window.location.origin}/affiliate-dashboard

SAMPLE PROMOTIONAL MESSAGES:
----------------------------

Instagram Caption:
"✨ Discover amazing beauty products at Poppik! Use my code ${affiliateCode} for exclusive deals! 💄💅 
Shop now: ${window.location.origin}?ref=${affiliateCode}
#PoppikBeauty #BeautyAffiliate #SkincareLover"

Facebook Post:
"Hey everyone! 🌟 I'm excited to share my favorite beauty brand - Poppik! 
Get amazing skincare & makeup products. Use my special code: ${affiliateCode}
Shop here: ${window.location.origin}?ref=${affiliateCode}"

YouTube Description:
"Shop Poppik Beauty Products
Use Code: ${affiliateCode}
Link: ${window.location.origin}?ref=${affiliateCode}

Get exclusive deals on premium beauty products!"

Email Template:
"Hi there!
I wanted to share this amazing beauty brand I've been loving - Poppik!
Use my affiliate code ${affiliateCode} when you shop to get the best deals.
Shop now: ${window.location.origin}?ref=${affiliateCode}

Happy Shopping! 💕"

TIPS FOR SUCCESS:
-----------------
✅ Share your affiliate link on all your social media platforms
✅ Create authentic content featuring Poppik products
✅ Engage with your followers about product benefits
✅ Track your performance in the dashboard regularly
✅ Use high-quality images and videos in your posts

Need help? Contact us at support@poppik.in

Generated on: ${new Date().toLocaleDateString('en-IN')}
                  `;

                  const blob = new Blob([affiliateKit], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Poppik_Affiliate_Kit_${affiliateCode}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);

                  toast({
                    title: "Resources Downloaded!",
                    description: "Your affiliate marketing kit has been downloaded successfully.",
                  });
                }}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm font-semibold"
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
                  onClick={() => setShowShareDialog(true)}
                  size="lg"
                  variant="outline"
                  className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50 w-full lg:w-auto"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Get Shareable Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid - Professional Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Cashback Balance Card */}
          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <IndianRupee className="h-7 w-7 text-white" />
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  Cashback
                </Badge>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ₹{parseFloat(wallet?.cashbackBalance || "0").toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Cashback Balance</p>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500" style={{ width: parseFloat(wallet?.cashbackBalance || "0") > 0 ? '60%' : '5%' }}></div>
              </div>
            </CardContent>
          </Card>

          {/* Commission Balance Card */}
          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <IndianRupee className="h-7 w-7 text-white" />
                </div>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  Commission
                </Badge>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ₹{parseFloat(wallet?.commissionBalance || "0").toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Commission Balance</p>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-500" style={{ width: parseFloat(wallet?.commissionBalance || "0") > 0 ? '60%' : '5%' }}></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <IndianRupee className="h-7 w-7 text-white" />
                </div>
                {stats?.earningsGrowth !== undefined && stats?.earningsGrowth !== 0 && (
                  <div className={`flex items-center gap-1 font-semibold text-sm ${stats.earningsGrowth > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {stats.earningsGrowth > 0 ? <ArrowUpRight className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span>{stats.earningsGrowth > 0 ? '+' : ''}{stats.earningsGrowth}%</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ₹{parseFloat(wallet?.totalEarnings || "0").toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Total Earnings</p>
              <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500" style={{ width: parseFloat(wallet?.totalEarnings || "0") > 0 ? '75%' : '5%' }}></div>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                    onClick={() => {
                      if (!recentSales || recentSales.length === 0) {
                        toast({
                          title: "No Data",
                          description: "No sales data available to export",
                          variant: "destructive"
                        });
                        return;
                      }

                      // Prepare CSV content
                      const headers = ['Date', 'Product', 'Customer', 'Sale Amount', 'Commission', 'Status'];
                      const csvContent = [
                        headers.join(','),
                        ...recentSales.map((sale: any) => [
                          new Date(sale.date).toLocaleDateString('en-IN'),
                          `"${sale.product}"`,
                          `"${sale.customer}"`,
                          sale.amount,
                          sale.commission,
                          sale.status
                        ].join(','))
                      ].join('\n');

                      // Create and download file
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `Poppik_Affiliate_Sales_${affiliateCode}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);

                      toast({
                        title: "Exported Successfully!",
                        description: "Your sales data has been downloaded as CSV",
                      });
                    }}
                  >
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
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    Top Products to Promote
                  </CardTitle>
                  <CardDescription className="mt-1">Generate affiliate links for our bestselling products</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ProductsList affiliateCode={affiliateCode} copyAffiliateLink={copyAffiliateLink} />
              </CardContent>
            </Card>

            {/* Combo Offers Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-pink-50 to-purple-50">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-pink-600" />
                    Combo Offers
                  </CardTitle>
                  <CardDescription className="mt-1">Promote our Glow & Harmony Combo and earn higher commissions</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <CombosList affiliateCode={affiliateCode} copyAffiliateLink={copyAffiliateLink} />
              </CardContent>
            </Card>

            {/* Design Your Kit Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-blue-50">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    Design Your Kit
                  </CardTitle>
                  <CardDescription className="mt-1">Customizable beauty kits for different needs and budgets</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <BeautyKitsList affiliateCode={affiliateCode} copyAffiliateLink={copyAffiliateLink} />
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
                          <IndianRupee className="h-6 w-6 text-white" />
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
                          <p className="text-3xl font-bold text-blue-600">{stats?.totalClicks?.toLocaleString('en-IN') || 0}</p>
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
                          <p className="text-3xl font-bold text-emerald-600">{stats?.totalSales?.toLocaleString('en-IN') || 0}</p>
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
                            <IndianRupee className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">Lifetime Earnings</p>
                            <p className="text-sm text-gray-600">Total commissions earned</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-purple-600">₹{stats?.totalEarnings?.toLocaleString('en-IN') || 0}</p>
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
                <CardDescription className="mt-1">Your account information and payment details</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="grid gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">First Name</label>
                      <p className="text-gray-900 text-xl font-semibold">{application.firstName}</p>
                    </div>
                    <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Last Name</label>
                      <p className="text-gray-900 text-xl font-semibold">{application.lastName}</p>
                    </div>
                  </div>

                  <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email Address</label>
                    <p className="text-gray-900 text-xl font-semibold">{application.email}</p>
                  </div>

                  <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone Number</label>
                    <p className="text-gray-900 text-xl font-semibold">{application.phone}</p>
                  </div>

                  <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full Address</label>
                    <p className="text-gray-900 text-lg">{application.address}</p>
                    {application.city && <p className="text-gray-700">{application.city}, {application.state} - {application.pincode}</p>}
                    <p className="text-gray-700">{application.country}</p>
                  </div>

                  {/* Bank Details Section */}
                  {(application.bankName || application.accountNumber) && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <IndianRupee className="h-6 w-6 text-green-600" />
                        Bank Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {application.bankName && (
                          <div className="space-y-2 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">Bank Name</label>
                            <p className="text-gray-900 text-lg font-semibold">{application.bankName}</p>
                          </div>
                        )}
                        {application.branchName && (
                          <div className="space-y-2 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">Branch Name</label>
                            <p className="text-gray-900 text-lg font-semibold">{application.branchName}</p>
                          </div>
                        )}
                        {application.ifscCode && (
                          <div className="space-y-2 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">IFSC Code</label>
                            <p className="text-gray-900 text-lg font-semibold">{application.ifscCode}</p>
                          </div>
                        )}
                        {application.accountNumber && (
                          <div className="space-y-2 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">Account Number</label>
                            <p className="text-gray-900 text-lg font-semibold">****{application.accountNumber.slice(-4)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Share Your Affiliate Link
            </DialogTitle>
            <DialogDescription>
              Share your link and start earning commissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 hover:bg-green-50 hover:border-green-300 transition-colors" 
              onClick={shareToWhatsApp}
            >
              <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 hover:bg-blue-50 hover:border-blue-300 transition-colors" 
              onClick={shareToFacebook}
            >
              <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 hover:bg-sky-50 hover:border-sky-300 transition-colors" 
              onClick={shareToTwitter}
            >
              <svg className="h-6 w-6 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              Twitter
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 hover:bg-pink-50 hover:border-pink-300 transition-colors" 
              onClick={shareToInstagram}
            >
              <svg className="h-6 w-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
              </svg>
              Instagram
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 hover:bg-purple-50 hover:border-purple-300 transition-colors"
              onClick={() => {
                copyAffiliateLink();
                setShowShareDialog(false);
              }}
            >
              <Copy className="h-5 w-5 text-purple-600" />
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}