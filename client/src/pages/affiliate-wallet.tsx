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
  DollarSign,
  ArrowLeft,
  Download,
  CheckCircle,
  Clock,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link as WouterLink, useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface Withdrawal {
  id: number;
  userId: number;
  amount: string;
  status: string;
  paymentMethod: string;
  requestedAt: string;
  processedAt?: string | null;
  rejectedReason?: string | null;
}

export default function AffiliateWallet() {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [showCashbackInfoDialog, setShowCashbackInfoDialog] = useState(false);

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
      const data = await res.json();
      console.log('Fetched wallet data:', data);

      // Dispatch custom event to update layout
      window.dispatchEvent(new CustomEvent('affiliateWalletUpdated'));

      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 3000, // Refetch every 3 seconds
    staleTime: 0, // Always consider data stale
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch affiliate transactions
  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery<AffiliateTransaction[]>({
    queryKey: ['/api/affiliate/wallet/transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/affiliate/wallet/transactions?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      console.log('Fetched transactions:', data);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
    refetchInterval: 3000, // Refetch every 3 seconds
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch withdrawals
  const { data: withdrawalsData, isLoading: loadingWithdrawals, refetch: refetchWithdrawals } = useQuery<Withdrawal[]>({
    queryKey: ['/api/affiliate/wallet/withdrawals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/affiliate/wallet/withdrawals?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch withdrawals');
      const data = await res.json();
      console.log('Fetched withdrawals:', data);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : [];
  const withdrawals = Array.isArray(withdrawalsData) ? withdrawalsData : [];

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
  const availableCommissionBalance = parseFloat(walletData?.commissionBalance || '0');
  const availableCashbackBalance = parseFloat(walletData?.cashbackBalance || '0');
  const availableBalance = availableCommissionBalance + availableCashbackBalance;

  const thisMonthTransactions = transactions.filter(t => {
    const date = new Date(t.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const handleWithdrawal = async () => {
    if (!user?.id) return;

    if (withdrawAmount < 2500) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal amount is ₹2500",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > availableCommissionBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough commission balance for this withdrawal",
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
      refetchWithdrawals();
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
      {/* Header - Fully Responsive */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">Affiliate Wallet</h1>
              <p className="text-purple-100 text-xs sm:text-sm md:text-base">Track your commission earnings and manage withdrawals</p>
            </div>
            <Button
              onClick={() => setLocation("/affiliate-dashboard")}
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100 w-full sm:w-auto text-sm sm:text-base h-9 sm:h-10"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Wallet Balance Cards - Fully Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Cashback Balance - Mobile Optimized */}
          <Card 
            className="border-2 border-blue-200 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setShowCashbackInfoDialog(true)}
          >
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <WalletIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs sm:text-sm">Cashback</Badge>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Cashback Balance</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                ₹{availableCashbackBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1 sm:mt-2">Usable on Poppik purchases only</p>
            </CardContent>
          </Card>

          {/* Commission Balance - Mobile Optimized */}
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs sm:text-sm">Commission</Badge>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Commission Balance</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                ₹{availableCommissionBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <Button
                onClick={() => setShowWithdrawalDialog(true)}
                disabled={availableCommissionBalance < 2500}
                className="w-full mt-3 sm:mt-4 bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm h-8 sm:h-9"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Request Withdrawal
              </Button>
              {availableCommissionBalance < 2500 && (
                <p className="text-xs text-red-500 mt-1 sm:mt-2">Minimum withdrawal: ₹2500</p>
              )}
            </CardContent>
          </Card>

          {/* Total Earnings - Mobile Optimized */}
          <Card className="border-2 border-green-200 shadow-lg">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs sm:text-sm">Lifetime</Badge>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Total Earnings</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">
                ₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          {/* Total Withdrawn - Mobile Optimized */}
          <Card className="border-2 border-amber-200 shadow-lg">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-600 rounded-lg flex items-center justify-center">
                  <Download className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs sm:text-sm">Withdrawn</Badge>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">Total Withdrawn</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">
                ₹{totalWithdrawn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cashback Info Dialog */}
        <Dialog open={showCashbackInfoDialog} onOpenChange={setShowCashbackInfoDialog}>
          <DialogContent className="max-w-md w-11/12 sm:w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5 text-blue-600" />
                Cashback Balance Information
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  💡 Important Information
                </p>
                <p className="text-sm text-blue-800">
                  Cashback balance is <strong>only usable on Poppik purchases</strong>. 
                  No cash withdrawal is allowed for cashback amounts.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Your Cashback Balance</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₹{availableCashbackBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  <strong>Want to withdraw cash?</strong><br/>
                  Only your Commission Balance (₹{availableCommissionBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) can be withdrawn as cash.
                </p>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowCashbackInfoDialog(false)}
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Withdraw Button - Integrated into Dialog */}
        <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
          <DialogContent className="max-w-md w-11/12 sm:w-full">
            <DialogHeader>
              <DialogTitle>Withdraw Commission Earnings</DialogTitle>
              <DialogDescription>
                Enter the amount you want to withdraw from your Commission Balance only. Minimum withdrawal is ₹2500. Cashback balance cannot be withdrawn.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Available Commission Balance</Label>
                <div className="text-2xl font-bold text-purple-600">
                  ₹{availableCommissionBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      min="2500"
                      max={availableCommissionBalance}
                      value={withdrawAmount || ''}
                      onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                      placeholder="2500.00"
                      className="pl-8"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWithdrawAmount(availableCommissionBalance)}
                    className="text-xs sm:text-sm h-9 sm:h-10"
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Minimum: ₹2500 | Maximum: ₹{availableCommissionBalance.toFixed(2)}
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
                    setShowWithdrawalDialog(false);
                    setWithdrawAmount(0);
                  }}
                  disabled={isProcessingWithdrawal}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={handleWithdrawal}
                  disabled={isProcessingWithdrawal || withdrawAmount < 2500 || withdrawAmount > availableCommissionBalance}
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

        {/* Transaction History Section */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-white border-b p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <History className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Transaction History</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">All your commission and cashback transactions</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-gray-300 text-gray-700 w-fit text-xs sm:text-sm h-7 sm:h-8">
                {filteredTransactions.length} Transactions
              </Badge>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
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
                <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 h-9 sm:h-10 text-xs sm:text-sm">
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
                <SelectTrigger className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 h-9 sm:h-10 text-xs sm:text-sm">
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

          <CardContent className="p-3 sm:p-4 md:pt-6">
            {transactionsLoading ? (
              <div className="text-center py-8 sm:py-10 md:py-12">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-gray-200 border-t-purple-600 mx-auto mb-3 sm:mb-4"></div>
                <p className="text-gray-600 font-medium text-sm sm:text-base">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 sm:py-14 md:py-16 px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Gift className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300" />
                </div>
                <p className="text-gray-500 text-base sm:text-lg font-semibold mb-2">No transactions found</p>
                <p className="text-gray-400 text-sm sm:text-base">
                  {searchQuery || filterType !== "all" || dateRange !== "all"
                    ? "Try adjusting your filters"
                    : "Start earning commissions to see transactions!"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    {/* Mobile Layout (< 640px) */}
                    <div className="block sm:hidden">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow flex-shrink-0 ${
                            transaction.type === 'commission' || transaction.type === 'cashback'
                              ? 'bg-gradient-to-br from-green-400 to-green-500'
                              : 'bg-gradient-to-br from-red-400 to-red-500'
                          }`}>
                            {transaction.type === 'commission' || transaction.type === 'cashback' ? (
                              <ArrowDownRight className="h-5 w-5 text-white" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5 text-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{transaction.description}</p>
                            <Badge variant="outline" className="text-xs">
                              {transaction.balanceType === 'commission' ? 'Commission' : 'Cashback'}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg font-bold mb-1 ${
                            transaction.type === 'commission' || transaction.type === 'cashback' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'commission' || transaction.type === 'cashback' ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge
                            className="text-xs"
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

                      <div className="flex flex-col gap-1.5 text-xs text-gray-500 border-t border-gray-100 pt-2.5">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </span>
                        {transaction.orderId && (
                          <span className="text-gray-700 font-medium truncate">Order #{transaction.orderId}</span>
                        )}
                      </div>
                    </div>

                    {/* Desktop Layout (>= 640px) */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow flex-shrink-0 ${
                          transaction.type === 'commission' || transaction.type === 'cashback'
                            ? 'bg-gradient-to-br from-green-400 to-green-500'
                            : 'bg-gradient-to-br from-red-400 to-red-500'
                        }`}>
                          {transaction.type === 'commission' || transaction.type === 'cashback' ? (
                            <ArrowDownRight className="h-5 w-5 md:h-6 md:w-6 text-white" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5 md:h-6 md:w-6 text-white" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-sm md:text-base truncate">{transaction.description}</p>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {transaction.balanceType === 'commission' ? 'Commission' : 'Cashback'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 md:gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span className="hidden md:inline">
                                {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="inline md:hidden">
                                {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </span>
                            {transaction.orderId && (
                              <span className="text-gray-700 font-medium truncate">Order #{transaction.orderId}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-3">
                        <p className={`text-lg md:text-xl font-bold mb-1 ${
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

        {/* Withdrawal History - Fully Responsive */}
        <Card className="shadow-lg border-0 mt-8">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                <CardTitle className="text-base sm:text-lg md:text-xl">Withdrawal History</CardTitle>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Export
              </Button>
            </div>
            <CardDescription className="text-xs sm:text-sm mt-1">Track all your withdrawal requests</CardDescription>
          </CardHeader>

          <CardContent className="p-3 sm:p-4 md:pt-6">
            {loadingWithdrawals ? (
              <div className="text-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-3 sm:mb-4"></div>
                <p className="text-gray-600 text-sm sm:text-base">Loading withdrawal history...</p>
              </div>
            ) : withdrawals && withdrawals.length > 0 ? (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Request ID</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Amount</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Date</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">Payment Method</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap hidden lg:table-cell">Processed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-md sm:rounded-lg flex items-center justify-center">
                              <WalletIcon className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                            </div>
                            <span className="font-semibold text-purple-700 text-xs sm:text-sm">
                              #WD{String(withdrawal.id).padStart(4, '0')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">
                            ₹{parseFloat(withdrawal.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                              {new Date(withdrawal.requestedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(withdrawal.requestedAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              withdrawal.status === 'completed'
                                ? 'default'
                                : withdrawal.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className={`text-xs whitespace-nowrap ${
                              withdrawal.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : withdrawal.status === 'pending'
                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : ''
                            }`}
                          >
                            {withdrawal.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {withdrawal.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {withdrawal.status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">{withdrawal.paymentMethod}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {withdrawal.processedAt ? (
                            <div className="flex flex-col">
                              <span className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                                {new Date(withdrawal.processedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <History className="mx-auto h-12 w-12 text-gray-300" />
                <p className="text-gray-500 text-lg font-semibold mt-4 mb-2">No withdrawal history</p>
                <p className="text-gray-400">Your withdrawal requests will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}