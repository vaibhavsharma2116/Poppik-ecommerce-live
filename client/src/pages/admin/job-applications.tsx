
import React, { useState, useEffect } from 'react';
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Download, Trash2, FileText, Mail, Phone, MapPin, Calendar, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminJobApplications() {
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/job-applications'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/job-applications?_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch job applications');
      }
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  // Subscribe to server-sent events for realtime updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const es = new EventSource('/api/admin/job-applications/stream');

    const handleCreate = (e: MessageEvent) => {
      try {
        const application = JSON.parse(e.data);
        queryClient.setQueryData(['/api/admin/job-applications'], (old: any[] = []) => {
          const filtered = old.filter(i => i.id !== application.id);
          return [application, ...filtered];
        });
        toast({ title: 'New Application', description: 'A new job application has been received' });
      } catch (err) {
        console.error('Error parsing jobApplicationCreated event', err);
      }
    };

    const handleUpdate = (e: MessageEvent) => {
      try {
        const application = JSON.parse(e.data);
        queryClient.setQueryData(['/api/admin/job-applications'], (old: any[] = []) => 
          old.map(i => i.id === application.id ? application : i)
        );
      } catch (err) {
        console.error('Error parsing jobApplicationUpdated event', err);
      }
    };

    const handleDelete = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const id = payload?.id;
        if (id === undefined) return;
        queryClient.setQueryData(['/api/admin/job-applications'], (old: any[] = []) => 
          old.filter(i => i.id !== id)
        );
      } catch (err) {
        console.error('Error parsing jobApplicationDeleted event', err);
      }
    };

    es.addEventListener('jobApplicationCreated', handleCreate as EventListener);
    es.addEventListener('jobApplicationUpdated', handleUpdate as EventListener);
    es.addEventListener('jobApplicationDeleted', handleDelete as EventListener);

    es.onerror = (err) => {
      console.warn('Job applications SSE error, will attempt to reconnect', err);
    };

    return () => {
      es.close();
    };
  }, [queryClient, toast]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/job-applications/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: async (data) => {
      // Update cache immediately with returned data
      const updatedApp = data.application;
      queryClient.setQueryData(['/api/admin/job-applications'], (old: any[] = []) => 
        old.map(i => i.id === updatedApp.id ? updatedApp : i)
      );
      
      // Force refetch to ensure sync
      await refetch();
      toast({ title: 'Success', description: 'Application status updated' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/job-applications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Failed to delete application');
      return response.json();
    },
    onSuccess: async (data, id) => {
      // Remove from cache immediately
      queryClient.setQueryData(['/api/admin/job-applications'], (old: any[] = []) => 
        old.filter(item => item.id !== id)
      );
      
      // Force refetch to ensure sync
      await refetch();
      toast({ title: 'Success', description: 'Application deleted successfully' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: 'Failed to delete application', variant: 'destructive' });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: 'Pending' },
      reviewing: { variant: 'default', label: 'Reviewing' },
      shortlisted: { variant: 'default', label: 'Shortlisted' },
      accepted: { variant: 'default', label: 'Accepted' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Job Applications</h2>
          <p className="text-muted-foreground">
            {applications.length} application{applications.length !== 1 ? 's' : ''} received
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
          <CardDescription>Manage and review job applications - Updates in realtime, no delays, no cache</CardDescription>
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
                  <TableHead>Applicant</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application: any) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{application.fullName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {application.email}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {application.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{application.position}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {application.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      {application.isFresher ? (
                        <Badge variant="outline">Fresher</Badge>
                      ) : (
                        `${application.experienceYears || 0}y ${application.experienceMonths || 0}m`
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(application.appliedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={application.status}
                        onValueChange={(status) =>
                          updateStatusMutation.mutate({ id: application.id, status })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="shortlisted">Shortlisted</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedApplication(application);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = application.resumeUrl;
                            link.download = `Resume_${application.fullName.replace(/\s+/g, '_')}_${application.position.replace(/\s+/g, '_')}.pdf`;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <Download className="h-4 w-4" />
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review the complete application
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedApplication.fullName}</p>
                    <p><strong>Email:</strong> {selectedApplication.email}</p>
                    <p><strong>Phone:</strong> {selectedApplication.phone}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Position Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Position:</strong> {selectedApplication.position}</p>
                    <p><strong>Location:</strong> {selectedApplication.location}</p>
                    <p>
                      <strong>Experience:</strong>{' '}
                      {selectedApplication.isFresher
                        ? 'Fresher'
                        : `${selectedApplication.experienceYears || 0} years ${selectedApplication.experienceMonths || 0} months`}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Cover Letter</h3>
                <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                  {selectedApplication.coverLetter}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Resume</h3>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedApplication.resumeUrl;
                    link.download = `Resume_${selectedApplication.fullName.replace(/\s+/g, '_')}_${selectedApplication.position.replace(/\s+/g, '_')}.pdf`;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Resume
                </Button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Applied on {new Date(selectedApplication.appliedAt).toLocaleDateString()}
                </div>
                {getStatusBadge(selectedApplication.status)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

