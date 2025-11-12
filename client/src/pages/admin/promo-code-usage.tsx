
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tag, Calendar, User, ShoppingCart, TrendingDown, Package } from 'lucide-react';

export default function PromoCodeUsage() {
  const { data: usageData = [], isLoading } = useQuery({
    queryKey: ['/api/admin/promo-codes/usage'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/promo-codes/usage', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch promo code usage');
      return response.json();
    }
  });

  const totalDiscount = usageData.reduce((sum: number, item: any) => 
    sum + parseFloat(item.discountAmount || 0), 0
  );

  const uniqueCodes = [...new Set(usageData.map((item: any) => item.code))].length;
  const totalOrders = usageData.length;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Promo Code Usage</h1>
        <p className="text-gray-600 mt-1">Track all promo code redemptions and discounts</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Codes Used</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCodes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders with Promo</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discounts Given</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalDiscount.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
          <CardDescription>Detailed list of all promo code redemptions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading usage data...</div>
          ) : usageData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No promo codes have been used yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promo Code</TableHead>
                    <TableHead>Customer Details</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Discount Amount</TableHead>
                    <TableHead>Usage Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageData.map((usage: any) => (
                    <TableRow key={usage.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono font-semibold">
                          {usage.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{usage.userName}</span>
                          </div>
                          <div className="text-sm text-gray-500">{usage.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="font-mono font-semibold">
                            {usage.orderId ? `ORD-${usage.orderId.toString().padStart(3, '0')}` : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">
                          ₹{parseFloat(usage.discountAmount).toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div className="space-y-1">
                            <div className="text-sm">
                              {new Date(usage.createdAt).toLocaleDateString('en-IN')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(usage.createdAt).toLocaleTimeString('en-IN')}
                            </div>
                          </div>
                        </div>
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
  );
}
