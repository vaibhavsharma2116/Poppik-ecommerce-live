
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
  Wallet as WalletIcon,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AffiliateWalletData {
  userId: number;
  cashbackBalance: string;
  commissionBalance: string;
  totalEarnings: string;
  totalWithdrawn: string;
  createdAt: string;
  updatedAt: string;
}

interface AffiliateTransaction {
  id: number;
  type: string;
  amount: string;
  description: string;
  orderId?: number;
  status: string;
  createdAt: string;
  balanceType: string;
}

export default function AffiliateWallet() {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);

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
  }, []);

  // Fetch affiliate wallet data
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useQuery<AffiliateWalletData>({
    queryKey: ['/api/affiliate/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/affiliate/wallet?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch affiliate wallet');
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Fetch affiliate transactions
  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery<AffiliateTransaction[]>({
    queryKey: ['/api/affiliate/wallet/transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/affiliate/wallet/transactions?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

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

  // Calculate statistics from wallet data
  const totalEarnings = parseFloat(walletData?.totalEarnings || '0');
  const totalWithdrawn = parseFloat(walletData?.totalWithdrawn || '0');
  const availableBalance = parseFloat(walletData?.commissionBalance || '0') + parseFloat(walletData?.cashbackBalance || '0');

  const thisMonthTransactions = transactions.filter(t => {
    const date = new Date(t.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const handleWithdrawal = async () => {
    if (!user?.id) return;
    
    if (withdrawAmount < 500) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal amount is ₹500",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this withdrawal",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingWithdrawal(true);

    try {
      const response = await fetch('/api/affiliate/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          amount: withdrawAmount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process withdrawal');
      }

      toast({
        title: "Withdrawal Request Submitted",
        description: `Your withdrawal request for ₹${withdrawAmount.toFixed(2)} has been submitted successfully. It will be processed within 3-5 business days.`,
      });

      setWithdrawDialogOpen(false);
      setWithdrawAmount(0);
      refetchWallet();
      refetchTransactions();
    } catch (error: any) {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal request",
        variant: "destructive",
      });
    } finally {
      setIsProcessingWithdrawal(false);
    }
  };

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-purple-600 mx-auto mb-4"></div>
            <WalletIcon className="h-6 w-6 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 font-medium">Loading your affiliate wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header Section */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <WalletIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Affiliate Wallet</h1>
                <p className="text-sm text-gray-500">Track your commission earnings and manage withdrawals</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              <Link href="/affiliate-dashboard">
                <Button variant="outline" className="gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Balance Card */}
        <Card className="mb-8 border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 p-8 text-white">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-purple-100 text-sm mb-2 font-medium">Total Available Balance</p>
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-sm">Active</Badge>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-5xl font-bold mb-2">
                ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-purple-100 text-sm">Commission + Cashback earnings available</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
              <div>
                <p className="text-purple-100 text-xs mb-1">Affiliate Partner</p>
                <p className="text-white font-semibold">{user?.firstName || user?.name || 'Valued Partner'}</p>
              </div>
              <div className="text-right">
                <p className="text-purple-100 text-xs mb-1">Member Since</p>
                <p className="text-white font-semibold">
                  {walletData?.createdAt ? new Date(walletData.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Nov 2025'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <CardContent className="p-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs text-green-700 font-medium mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-green-900">
                  ₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                </div>
                <p className="text-xs text-orange-700 font-medium mb-1">Total Withdrawn</p>
                <p className="text-2xl font-bold text-orange-900">
                  ₹{totalWithdrawn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

        {/* Withdraw Button */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Withdraw Your Earnings
                  </h3>
                  <p className="text-sm text-gray-600">
                    Minimum withdrawal amount: ₹500
                  </p>
                </div>
                <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      disabled={availableBalance < 500}
                    >
                      <WalletIcon className="h-4 w-4 mr-2" />
                      Withdraw Funds
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Withdraw Earnings</DialogTitle>
                      <DialogDescription>
                        Enter the amount you want to withdraw from your affiliate wallet
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Available Balance</Label>
                        <div className="text-2xl font-bold text-purple-600">
                          ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="withdrawAmount">Withdrawal Amount</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                            <Input
                              id="withdrawAmount"
                              type="number"
                              step="0.01"
                              min="500"
                              max={availableBalance}
                              value={withdrawAmount || ''}
                              onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                              placeholder="500.00"
                              className="pl-8"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setWithdrawAmount(availableBalance)}
                          >
                            Max
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Minimum: ₹500 | Maximum: ₹{availableBalance.toFixed(2)}
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> Withdrawal requests are processed within 3-5 business days. The amount will be transferred to your registered bank account.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setWithdrawDialogOpen(false);
                            setWithdrawAmount(0);
                          }}
                          disabled={isProcessingWithdrawal}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          onClick={handleWithdrawal}
                          disabled={isProcessingWithdrawal || withdrawAmount < 500 || withdrawAmount > availableBalance}
                        >
                          {isProcessingWithdrawal ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <WalletIcon className="h-4 w-4 mr-2" />
                              Withdraw
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

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
                  <CardDescription>All your commission and cashback transactions</CardDescription>
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
                  className="pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="commission">Commission Only</SelectItem>
                  <SelectItem value="cashback">Cashback Only</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500">
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
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600 mx-auto mb-4"></div>
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
                    : "Start earning commissions to see transactions!"}
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
                          transaction.type === 'commission' || transaction.type === 'cashback'
                            ? 'bg-gradient-to-br from-green-400 to-green-500' 
                            : 'bg-gradient-to-br from-red-400 to-red-500'
                        }`}>
                          {transaction.type === 'commission' || transaction.type === 'cashback' ? (
                            <ArrowDownRight className="h-6 w-6 text-white" />
                          ) : (
                            <ArrowUpRight className="h-6 w-6 text-white" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{transaction.description}</p>
                            <Badge variant="outline" className="text-xs">
                              {transaction.balanceType === 'commission' ? 'Commission' : 'Cashback'}
                            </Badge>
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
                          transaction.type === 'commission' || transaction.type === 'cashback' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'commission' || transaction.type === 'cashback' ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge
                          variant={
                            transaction.status === "completed"
                              ? "default"
                              : transaction.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {transaction.status}
                        </Badge>
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
