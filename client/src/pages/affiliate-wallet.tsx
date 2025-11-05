
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  TrendingUp,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Download,
  Eye,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";

interface WalletTransaction {
  id: number;
  amount: number;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

interface AffiliateStats {
  totalEarnings: number;
  availableBalance: number;
  pendingCommission: number;
  totalWithdrawn: number;
  thisMonthEarnings: number;
}

export default function AffiliateWallet() {
  const [filter, setFilter] = useState("all");

  // Fetch affiliate wallet stats
  const { data: stats, isLoading: statsLoading } = useQuery<AffiliateStats>({
    queryKey: ["/api/affiliate/wallet/stats"],
    queryFn: async () => {
      const response = await fetch("/api/affiliate/wallet/stats");
      if (!response.ok) throw new Error("Failed to fetch wallet stats");
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fetch transaction history
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<
    WalletTransaction[]
  >({
    queryKey: ["/api/affiliate/wallet/transactions", filter],
    queryFn: async () => {
      const response = await fetch(
        `/api/affiliate/wallet/transactions?filter=${filter}`
      );
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Affiliate Wallet
              </h1>
              <p className="text-gray-600">
                Track your commission earnings and withdraw your balance
              </p>
            </div>
            <Link href="/affiliate-dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Wallet Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsLoading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    <CardTitle className="text-sm font-medium">
                      Available Balance
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1">
                    ₹{stats?.availableBalance?.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-purple-100">
                    Ready to withdraw
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Earnings
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    ₹{stats?.totalEarnings?.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-gray-500">All time earnings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Pending Commission
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    ₹{stats?.pendingCommission?.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-gray-500">Under processing</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-sm font-medium text-gray-600">
                      This Month
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    ₹{stats?.thisMonthEarnings?.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-gray-500">Current month earnings</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

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
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  disabled={!stats || stats.availableBalance < 500}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Withdraw Funds
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                Transaction History
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No transactions yet</p>
                <p className="text-sm text-gray-400">
                  Your commission earnings will appear here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              transaction.type === "credit"
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {transaction.type === "credit" ? "+" : "-"}₹
                            {transaction.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
