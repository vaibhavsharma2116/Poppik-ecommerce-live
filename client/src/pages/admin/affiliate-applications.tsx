
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Eye, Trash2, Mail, Phone, MapPin, Landmark, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminAffiliateApplications() {
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/affiliate-applications'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/affiliate-applications`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      return res.json();
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: any) => {
      const response = await fetch(`/api/admin/affiliate-applications/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ status, notes }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/affiliate-applications'] });
      setIsViewDialogOpen(false);
      setReviewNotes('');
      toast({ title: 'Success', description: 'Application status updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/affiliate-applications/${id}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to delete application');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/affiliate-applications'] });
      toast({ title: 'Success', description: 'Application deleted successfully' });
    },
  });

  const handleApprove = () => {
    if (selectedApplication) {
      updateStatusMutation.mutate({ 
        id: selectedApplication.id, 
        status: 'approved',
        notes: reviewNotes
      });
    }
  };

  const handleReject = () => {
    if (selectedApplication) {
      updateStatusMutation.mutate({ 
        id: selectedApplication.id, 
        status: 'rejected',
        notes: reviewNotes
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: 'Pending' },
      approved: { variant: 'default', label: 'Approved', className: 'bg-green-500' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Affiliate Applications</h2>
          <p className="text-muted-foreground">
            {applications.length} application{applications.length !== 1 ? 's' : ''} received
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
          <CardDescription>Manage and review affiliate program applications</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No applications received yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application: any) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="font-medium">{application.firstName} {application.lastName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {application.email}
                        </div>
                        <div className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {application.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {application.city || 'N/A'}, {application.state || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        {application.bankName || 'Not provided'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(application.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(application.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedApplication(application);
                            setReviewNotes(application.reviewNotes || '');
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this application?')) {
                              deleteMutation.mutate(application.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review the complete application and approve or reject
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedApplication.firstName} {selectedApplication.lastName}</p>
                    <p><strong>Email:</strong> {selectedApplication.email}</p>
                    <p><strong>Phone:</strong> {selectedApplication.phone}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Address</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Address:</strong> {selectedApplication.address}</p>
                    {selectedApplication.landmark && <p><strong>Landmark:</strong> {selectedApplication.landmark}</p>}
                    <p><strong>City:</strong> {selectedApplication.city || 'N/A'}</p>
                    <p><strong>State:</strong> {selectedApplication.state || 'N/A'}</p>
                    <p><strong>Pincode:</strong> {selectedApplication.pincode || 'N/A'}</p>
                    <p><strong>Country:</strong> {selectedApplication.country}</p>
                  </div>
                </div>
              </div>

              {/* <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-purple-600" />
                  Banking Details
                </h3>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-sm">
                      <p><strong>Bank Name:</strong> {selectedApplication.bankName || 'Not provided'}</p>
                      <p><strong>Branch Name:</strong> {selectedApplication.branchName || 'Not provided'}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><strong>IFSC Code:</strong> {selectedApplication.ifscCode || 'Not provided'}</p>
                      <p><strong>Account Number:</strong> {selectedApplication.accountNumber ? `****${selectedApplication.accountNumber.slice(-4)}` : 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div> */}

              {/* <div>
                <h3 className="font-semibold mb-2">Review Notes</h3>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={4}
                />
              </div> */}

              {/* {selectedApplication.reviewedAt && (
                <div className="text-sm text-muted-foreground bg-gray-50 p-4 rounded">
                  <p><strong>Reviewed on:</strong> {new Date(selectedApplication.reviewedAt).toLocaleDateString()}</p>
                  {selectedApplication.reviewNotes && (
                    <p className="mt-2"><strong>Previous Notes:</strong> {selectedApplication.reviewNotes}</p>
                  )}
                </div>
              )} */}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Applied on {new Date(selectedApplication.createdAt).toLocaleDateString()}
                </div>
                {getStatusBadge(selectedApplication.status)}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedApplication?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={updateStatusMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={updateStatusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
