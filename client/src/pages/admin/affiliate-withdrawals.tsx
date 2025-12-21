
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, CheckCircle, XCircle, Wallet, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminAffiliateWithdrawals() {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: withdrawalsData, isLoading } = useQuery({
    queryKey: ['/api/admin/affiliate/withdrawals'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/affiliate/withdrawals', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth/admin-login';
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch withdrawals');
      }
      
      return response.json();
    },
  });

  const withdrawals = Array.isArray(withdrawalsData) ? withdrawalsData : [];

  const approveWithdrawalMutation = useMutation({
    mutationFn: async ({ id, transactionId, notes }: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/affiliate/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ transactionId, notes }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to approve withdrawal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/affiliate/withdrawals'] });
      setIsViewDialogOpen(false);
      setNotes('');
      setTransactionId('');
      toast({ title: 'Success', description: 'Withdrawal approved successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve withdrawal',
        variant: 'destructive'
      });
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async ({ id, notes }: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/affiliate/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject withdrawal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/affiliate/withdrawals'] });
      setIsViewDialogOpen(false);
      setNotes('');
      toast({ title: 'Success', description: 'Withdrawal rejected' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to reject withdrawal',
        variant: 'destructive'
      });
    },
  });

  const handleReject = () => {
    if (selectedWithdrawal) {
      rejectWithdrawalMutation.mutate({ 
        id: selectedWithdrawal.id, 
        notes: notes.trim() || 'Rejected by admin'
      });
    }
  };

  const handleApprove = () => {
    if (!selectedWithdrawal) return;
    const tx = transactionId.trim();
    if (!tx) {
      toast({
        title: 'Transaction ID required',
        description: 'Please enter the bank transaction/reference number to approve.',
        variant: 'destructive',
      });
      return;
    }
    approveWithdrawalMutation.mutate({
      id: selectedWithdrawal.id,
      transactionId: tx,
      notes: notes.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: 'Pending', className: 'bg-yellow-500' },
      approved: { variant: 'default', label: 'Approved', className: 'bg-green-500' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      completed: { variant: 'default', label: 'Completed', className: 'bg-blue-500' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Affiliate Withdrawals</h2>
          <p className="text-muted-foreground">
            {withdrawals.filter((w: any) => w.status === 'pending').length} pending withdrawal requests
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {withdrawals.filter((w: any) => w.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {withdrawals.filter((w: any) => w.status === 'approved' || w.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{withdrawals
                .filter((w: any) => w.status === 'pending')
                .reduce((sum: number, w: any) => sum + parseFloat(w.amount || '0'), 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>Manage affiliate withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading withdrawals...</div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No withdrawal requests yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal: any) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{withdrawal.userName}</div>
                          <div className="text-sm text-gray-500">{withdrawal.userEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-red-600">₹{parseFloat(withdrawal.amount).toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{withdrawal.balanceType || 'commission'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {new Date(withdrawal.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(withdrawal.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedWithdrawal(withdrawal);
                          setNotes(withdrawal.notes || '');
                          setTransactionId(withdrawal.transactionId || '');
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Withdrawal Request Details</DialogTitle>
            <DialogDescription>
              Review and process withdrawal request
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
              <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500">Affiliate Name</Label>
                    <p className="font-medium">{selectedWithdrawal.userName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <p className="text-sm">{selectedWithdrawal.userEmail}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Phone</Label>
                    <p className="text-sm">{selectedWithdrawal.userPhone || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500">Withdrawal Amount</Label>
                    <p className="text-2xl font-bold text-red-600">₹{parseFloat(selectedWithdrawal.amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Balance Type</Label>
                    <Badge variant="outline">{selectedWithdrawal.balanceType || 'commission'}</Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Request Date</Label>
                    <p className="text-sm">{new Date(selectedWithdrawal.createdAt).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <Label className="text-sm font-semibold mb-2 block">Banking Details</Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Bank:</span> {selectedWithdrawal.bankName || 'N/A'}
                  </div>
                  <div>
                    <span className="text-gray-500">Branch:</span> {selectedWithdrawal.branchName || 'N/A'}
                  </div>
                  <div>
                    <span className="text-gray-500">IFSC:</span> {selectedWithdrawal.ifscCode || 'N/A'}
                  </div>
                  <div>
                    <span className="text-gray-500">Account:</span> {selectedWithdrawal.accountNumber ? `****${selectedWithdrawal.accountNumber.slice(-4)}` : 'N/A'}
                  </div>
                </div>
              </div>

              {selectedWithdrawal.description && (
                <div>
                  <Label className="text-xs text-gray-500">Description</Label>
                  <p className="text-sm mt-1">{selectedWithdrawal.description}</p>
                </div>
              )}

              {selectedWithdrawal.status === 'pending' && (
                <div>
                  <Label htmlFor="transactionId">Transaction ID / Reference Number</Label>
                  <Input
                    id="transactionId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter bank transaction ID or reference number"
                    className="mt-1"
                  />
                  <Label htmlFor="notes" className="mt-3 block">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this withdrawal..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}

              {selectedWithdrawal.status !== 'pending' && (
                <div className="bg-gray-50 p-4 rounded">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedWithdrawal.status)}</div>
                    </div>
                    {selectedWithdrawal.transactionId && (
                      <div>
                        <Label className="text-xs text-gray-500">Transaction ID</Label>
                        <p className="text-sm font-mono">{selectedWithdrawal.transactionId}</p>
                      </div>
                    )}
                    {selectedWithdrawal.notes && (
                      <div>
                        <Label className="text-xs text-gray-500">Admin Notes</Label>
                        <p className="text-sm">{selectedWithdrawal.notes}</p>
                      </div>
                    )}
                    {selectedWithdrawal.processedAt && (
                      <div>
                        <Label className="text-xs text-gray-500">Processed At</Label>
                        <p className="text-sm">{new Date(selectedWithdrawal.processedAt).toLocaleString('en-IN')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedWithdrawal?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectWithdrawalMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveWithdrawalMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve & Process
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
