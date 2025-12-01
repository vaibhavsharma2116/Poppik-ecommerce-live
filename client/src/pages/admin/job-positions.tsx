
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import RichTextEditor from "@/components/admin/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Pencil, Trash2, Briefcase, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminJobPositions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<any>(null);
  const [selectedJobType, setSelectedJobType] = useState('Full-Time Job');
  const [aboutRoleContent, setAboutRoleContent] = useState('');
  const [responsibilitiesContent, setResponsibilitiesContent] = useState('');
  const [requirementsContent, setRequirementsContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: positions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/job-positions'],
    queryFn: async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      console.log('🔑 Fetching admin job positions with token:', token ? 'Present' : 'Missing');

      if (!token) {
        toast({ title: 'Authentication Required', description: 'Please login to continue', variant: 'destructive' });
        window.location.href = '/admin/auth/admin-login';
        throw new Error('No authentication token found');
      }

      // Add timestamp to prevent any caching
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/job-positions?_t=${timestamp}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.status === 401) {
        toast({ title: 'Session Expired', description: 'Please login again', variant: 'destructive' });
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/auth/admin-login';
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        console.error('Failed to fetch admin job positions:', response.status);
        throw new Error('Failed to fetch job positions');
      }
      const data = await response.json();
      console.log('Admin job positions received:', data);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!(localStorage.getItem('token') || localStorage.getItem('adminToken')),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  // Subscribe to server-sent events for realtime updates (create/update/delete)
  useEffect(() => {
    // Only run if admin token exists
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (!token) return;

    const es = new EventSource('/api/admin/job-positions/stream');

    const handleCreate = (e: MessageEvent) => {
      try {
        const position = JSON.parse(e.data);
        queryClient.setQueryData(['/api/admin/job-positions'], (old: any[] = []) => {
          // Avoid duplicates
          const filtered = old.filter(i => i.id !== position.id);
          return [position, ...filtered];
        });
      } catch (err) {
        console.error('Error parsing jobPositionCreated event', err);
      }
    };

    const handleUpdate = (e: MessageEvent) => {
      try {
        const position = JSON.parse(e.data);
        queryClient.setQueryData(['/api/admin/job-positions'], (old: any[] = []) => old.map(i => i.id === position.id ? position : i));
      } catch (err) {
        console.error('Error parsing jobPositionUpdated event', err);
      }
    };

    const handleDelete = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const id = payload?.id;
        if (id === undefined) return;
        queryClient.setQueryData(['/api/admin/job-positions'], (old: any[] = []) => old.filter(i => i.id !== id));
      } catch (err) {
        console.error('Error parsing jobPositionDeleted event', err);
      }
    };

    es.addEventListener('jobPositionCreated', handleCreate as EventListener);
    es.addEventListener('jobPositionUpdated', handleUpdate as EventListener);
    es.addEventListener('jobPositionDeleted', handleDelete as EventListener);

    es.onerror = (err) => {
      console.warn('Job positions SSE error, will attempt to reconnect', err);
      // EventSource will automatically attempt to reconnect
    };

    return () => {
      es.close();
    };
  }, [queryClient]);

  if (error) {
    console.error('Error loading job positions:', error);
  }

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/admin/job-positions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create job position');
      return response.json();
    },
    onSuccess: async (newPosition) => {
      // Immediately update cache with real data
      queryClient.setQueryData(['/api/admin/job-positions'], (old: any[] = []) => {
        return [newPosition, ...old.filter(p => p.id !== newPosition.id)];
      });
      
      // Force immediate refetch to ensure sync
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/job-positions'] });
      await refetch();
      
      setIsDialogOpen(false);
      setEditingPosition(null);
      setSelectedJobType('Full-Time Job');
      setAboutRoleContent('');
      setResponsibilitiesContent('');
      setRequirementsContent('');
      setIsActive(true);
      toast({ title: 'Success', description: 'Job position created successfully' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: 'Failed to create job position', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/admin/job-positions/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update job position');
      return response.json();
    },
    onSuccess: async (updatedPosition) => {
      // Immediately update cache with real data
      queryClient.setQueryData(['/api/admin/job-positions'], (old: any[] = []) => {
        return old.map(item => item.id === updatedPosition.id ? updatedPosition : item);
      });
      
      // Force immediate refetch to ensure sync
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/job-positions'] });
      await refetch();
      
      setIsDialogOpen(false);
      setEditingPosition(null);
      setSelectedJobType('Full-Time Job');
      setAboutRoleContent('');
      setResponsibilitiesContent('');
      setRequirementsContent('');
      setIsActive(true);
      toast({ title: 'Success', description: 'Job position updated successfully' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: 'Failed to update job position', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/admin/job-positions/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Failed to delete job position');
      return response.json();
    },
    onSuccess: async (data, id) => {
      // Immediately remove from cache
      queryClient.setQueryData(['/api/admin/job-positions'], (old: any[] = []) => {
        return old.filter(item => item.id !== id);
      });
      
      // Force immediate refetch to ensure sync
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/job-positions'] });
      await refetch();
      
      toast({ title: 'Success', description: 'Job position deleted successfully' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: 'Failed to delete job position', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      title: formData.get('title'),
      slug: (editingPosition as any)?.slug || (formData.get('title') as string).toLowerCase().replace(/\s+/g, '-'),
      department: formData.get('department'),
      location: formData.get('location'),
      type: formData.get('type'),
      jobId: formData.get('jobId'),
      experienceLevel: formData.get('experienceLevel'),
      workExperience: formData.get('workExperience'),
      education: formData.get('education'),
      description: formData.get('description'),
      aboutRole: aboutRoleContent,
      responsibilities: responsibilitiesContent,
      requirements: requirementsContent,
      skills: [], // Empty array for skills
      isActive: isActive, // Use state value instead of FormData
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
    };

    if (editingPosition) {
      updateMutation.mutate({ id: (editingPosition as any).id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Job Positions</h2>
          <p className="text-muted-foreground">Manage career opportunities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPosition(null);
              setSelectedJobType('Full-Time Job');
              setAboutRoleContent('');
              setResponsibilitiesContent('');
              setRequirementsContent('');
              setIsActive(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPosition ? 'Edit' : 'Add'} Job Position</DialogTitle>
              <DialogDescription>
                {editingPosition ? 'Update' : 'Create a new'} job position listing
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={(editingPosition as any)?.title}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="jobId">Job ID</Label>
                  <Input
                    id="jobId"
                    name="jobId"
                    defaultValue={(editingPosition as any)?.jobId}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    name="department"
                    defaultValue={(editingPosition as any)?.department}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={(editingPosition as any)?.location}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={selectedJobType}
                    onValueChange={(value) => {
                      setSelectedJobType(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-Time Job">Full-Time Job</SelectItem>
                      <SelectItem value="Part-Time Job">Part-Time Job</SelectItem>
                      <SelectItem value="Contract Job">Contract Job</SelectItem>
                      <SelectItem value="Freelance/Consulting">Freelance/Consulting</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Temporary Job">Temporary Job</SelectItem>
                      <SelectItem value="Remote Job">Remote Job</SelectItem>
                      <SelectItem value="Hybrid Job">Hybrid Job</SelectItem>
                      <SelectItem value="On-Call Job">On-Call Job</SelectItem>
                      <SelectItem value="Apprenticeship">Apprenticeship</SelectItem>
                      <SelectItem value="Shift-Based Job">Shift-Based Job</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="type"
                    name="type"
                    type="hidden"
                    value={selectedJobType}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="experienceLevel">Experience Level *</Label>
                  <Input
                    id="experienceLevel"
                    name="experienceLevel"
                    defaultValue={(editingPosition as any)?.experienceLevel}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="workExperience">Work Experience *</Label>
                  <Input
                    id="workExperience"
                    name="workExperience"
                    defaultValue={(editingPosition as any)?.workExperience}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="education">Education *</Label>
                <Input
                  id="education"
                  name="education"
                  defaultValue={(editingPosition as any)?.education}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Short Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={(editingPosition as any)?.description}
                  required
                />
              </div>

              <div>
                <Label htmlFor="aboutRole">About the Role *</Label>
                <RichTextEditor
                  content={aboutRoleContent || (editingPosition as any)?.aboutRole || ''}
                  onChange={setAboutRoleContent}
                />
              </div>

              <div>
                <Label htmlFor="responsibilities">Responsibilities *</Label>
                <RichTextEditor
                  content={responsibilitiesContent || (typeof (editingPosition as any)?.responsibilities === 'string' ? (editingPosition as any).responsibilities : '')}
                  onChange={setResponsibilitiesContent}
                />
              </div>

              <div>
                <Label htmlFor="requirements">Requirements *</Label>
                <RichTextEditor
                  content={requirementsContent || (typeof (editingPosition as any)?.requirements === 'string' ? (editingPosition as any).requirements : '')}
                  onChange={setRequirementsContent}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    name="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    defaultValue={(editingPosition as any)?.sortOrder || 0}
                    className="w-24"
                  />
                </div>
                <div>
                  <Label htmlFor="expiresAt">Expires At (15 days default)</Label>
                  <Input
                    id="expiresAt"
                    name="expiresAt"
                    type="date"
                    defaultValue={(editingPosition as any)?.expiresAt ? new Date((editingPosition as any).expiresAt).toISOString().split('T')[0] : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPosition ? 'Update' : 'Create'} Position
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Positions</CardTitle>
          <CardDescription>
            {positions.length} job position{positions.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading positions...
                  </TableCell>
                </TableRow>
              ) : positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No job positions found
                  </TableCell>
                </TableRow>
              ) : positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{position.title}</div>
                      <div className="text-sm text-muted-foreground">{position.jobId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{position.department}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {position.location}
                    </div>
                  </TableCell>
                  <TableCell>{position.type}</TableCell>
                  <TableCell>
                    <Badge variant={position.isActive ? 'default' : 'secondary'}>
                      {position.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingPosition(position);
                        setSelectedJobType(position.type || 'Full-Time Job');
                        setAboutRoleContent(typeof position?.aboutRole === 'string' ? position.aboutRole : '');
                        setResponsibilitiesContent(typeof position?.responsibilities === 'string' ? position.responsibilities : '');
                        setRequirementsContent(typeof position?.requirements === 'string' ? position.requirements : '');
                        setIsActive(position?.isActive ?? true);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this position?')) {
                          deleteMutation.mutate(position.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
