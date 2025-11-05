
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, 
  TrendingUp, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Filter,
  Search,
  Wallet as WalletIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WalletData {
  userId: number;
  cashbackBalance: number;
  totalEarned: number;
  totalRedeemed: number;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: number;
  type: 'credit' | 'redeem';
  amount: string;
  description: string;
  orderId?: number;
  balanceBefore: string;
  balanceAfter: string;
  status: string;
  createdAt: string;
}

export default function Wallet() {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  // Fetch wallet data
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useQuery<WalletData>({
    queryKey: ['/api/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/wallet?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch wallet');
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/wallet/transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/wallet/transactions?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Listen for wallet updates
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
        window.location.href = "/auth/login";
      }
    } else {
      window.location.href = "/auth/login";
    }

    const handleWalletUpdate = () => {
      refetchWallet();
      refetchTransactions();
    };

    window.addEventListener('walletUpdated', handleWalletUpdate);
    return () => window.removeEventListener('walletUpdated', handleWalletUpdate);
  }, [refetchTransactions, refetchWallet]);

  const transactions = Array.isArray(transactionsData) ? transactionsData : [];

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || transaction.type === filterType;

    let matchesDate = true;
    if (dateRange !== "all") {
      const transactionDate = new Date(transaction.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dateRange === "7days") matchesDate = daysDiff <= 7;
      else if (dateRange === "30days") matchesDate = daysDiff <= 30;
      else if (dateRange === "90days") matchesDate = daysDiff <= 90;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // Calculate statistics - use wallet data for accurate totals
  const totalCredits = walletData?.totalEarned ?? 0;
  const totalDebits = walletData?.totalRedeemed ?? 0;

  const thisMonthTransactions = transactions.filter(t => {
    const date = new Date(t.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-pink-600 mx-auto mb-4"></div>
            <WalletIcon className="h-6 w-6 text-pink-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 font-medium">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <WalletIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
                <p className="text-sm text-gray-500">Manage your cashback and track earnings</p>
              </div>
            </div>
            <Button 
              onClick={() => {
                refetchWallet();
                refetchTransactions();
                toast({ title: "Refreshed", description: "Wallet data updated" });
              }}
              variant="outline"
              className="border-gray-300 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Balance Card */}
        <Card className="mb-8 border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-pink-500 via-pink-600 to-purple-600 p-8 text-white">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-pink-100 text-sm mb-2 font-medium">Total Available Balance</p>
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-sm">Active</Badge>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-5xl font-bold mb-2">
                ₹{(walletData?.cashbackBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-pink-100 text-sm">Available for redemption on your next purchase</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
              <div>
                <p className="text-pink-100 text-xs mb-1">Card Holder</p>
                <p className="text-white font-semibold">{user?.name || 'Valued Customer'}</p>
              </div>
              <div className="text-right">
                <p className="text-pink-100 text-xs mb-1">Member Since</p>
                <p className="text-white font-semibold">
                  {walletData?.createdAt ? new Date(walletData.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Nov 2025'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <CardContent className="p-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs text-orange-700 font-medium mb-1">Total Redeemed</p>
                <p className="text-2xl font-bold text-orange-900">
                  ₹{(walletData?.totalRedeemed ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow">
                    <ArrowDownRight className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs text-blue-700 font-medium mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-900">
                  {transactions.length}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shadow">
                    <History className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs text-purple-700 font-medium mb-1">This Month</p>
                <p className="text-2xl font-bold text-purple-900">{thisMonthTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History Section */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-white border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <History className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Transaction History</CardTitle>
                  <CardDescription>All your wallet transactions</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-gray-300 text-gray-700 w-fit">
                {filteredTransactions.length} Transactions
              </Badge>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="border-gray-300 focus:border-pink-500 focus:ring-pink-500">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credits Only</SelectItem>
                  <SelectItem value="redeem">Debits Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="border-gray-300 focus:border-pink-500 focus:ring-pink-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {transactionsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-pink-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-10 w-10 text-gray-300" />
                </div>
                <p className="text-gray-500 text-lg font-semibold mb-2">No transactions found</p>
                <p className="text-gray-400">
                  {searchQuery || filterType !== "all" || dateRange !== "all" 
                    ? "Try adjusting your filters" 
                    : "Start shopping to earn cashback!"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow ${
                          transaction.type === 'credit' 
                            ? 'bg-gradient-to-br from-green-400 to-green-500' 
                            : 'bg-gradient-to-br from-red-400 to-red-500'
                        }`}>
                          {transaction.type === 'credit' ? (
                            <ArrowDownRight className="h-6 w-6 text-white" />
                          ) : (
                            <ArrowUpRight className="h-6 w-6 text-white" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{transaction.description}</p>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {transaction.orderId && (
                              <span className="text-gray-700 font-medium">Order #{transaction.orderId}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-xl font-bold mb-1 ${
                          transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">
                          Balance: <span className="font-semibold text-gray-700">₹{parseFloat(transaction.balanceAfter).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
