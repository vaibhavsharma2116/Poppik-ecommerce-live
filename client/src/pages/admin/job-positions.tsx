
import React, { useState } from 'react';
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
  const [editingPosition, setEditingPosition] = useState(null);
  const [selectedJobType, setSelectedJobType] = useState('Full-Time Job');
  const [aboutRoleContent, setAboutRoleContent] = useState('');
  const [responsibilitiesContent, setResponsibilitiesContent] = useState('');
  const [requirementsContent, setRequirementsContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: positions = [], isLoading, error } = useQuery({
    queryKey: ['/api/admin/job-positions'],
    queryFn: async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      console.log('🔑 Fetching admin job positions with token:', token ? 'Present' : 'Missing');

      if (!token) {
        toast({ title: 'Authentication Required', description: 'Please login to continue', variant: 'destructive' });
        window.location.href = '/admin/auth/admin-login';
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/job-positions', {
        headers: { 'Authorization': `Bearer ${token}` }
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
      return data;
    },
    enabled: !!(localStorage.getItem('token') || localStorage.getItem('adminToken')),
    select: (data) => Array.isArray(data) ? data : [],
  });

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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create job position');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/job-positions'] });
      setIsDialogOpen(false);
      toast({ title: 'Success', description: 'Job position created successfully' });
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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update job position');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/job-positions'] });
      setIsDialogOpen(false);
      setEditingPosition(null);
      toast({ title: 'Success', description: 'Job position updated successfully' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/admin/job-positions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete job position');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/job-positions'] });
      toast({ title: 'Success', description: 'Job position deleted successfully' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      title: formData.get('title'),
      slug: editingPosition?.slug || (formData.get('title') as string).toLowerCase().replace(/\s+/g, '-'),
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
      updateMutation.mutate({ id: editingPosition.id, data });
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
                    defaultValue={editingPosition?.title}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="jobId">Job ID</Label>
                  <Input
                    id="jobId"
                    name="jobId"
                    defaultValue={editingPosition?.jobId}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    name="department"
                    defaultValue={editingPosition?.department}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={editingPosition?.location}
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
                    defaultValue={editingPosition?.experienceLevel}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="workExperience">Work Experience *</Label>
                  <Input
                    id="workExperience"
                    name="workExperience"
                    defaultValue={editingPosition?.workExperience}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="education">Education *</Label>
                <Input
                  id="education"
                  name="education"
                  defaultValue={editingPosition?.education}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Short Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingPosition?.description}
                  required
                />
              </div>

              <div>
                <Label htmlFor="aboutRole">About the Role *</Label>
                <RichTextEditor
                  content={aboutRoleContent || editingPosition?.aboutRole || ''}
                  onChange={setAboutRoleContent}
                />
              </div>

              <div>
                <Label htmlFor="responsibilities">Responsibilities *</Label>
                <RichTextEditor
                  content={responsibilitiesContent || (typeof editingPosition?.responsibilities === 'string' ? editingPosition.responsibilities : '')}
                  onChange={setResponsibilitiesContent}
                />
              </div>

              <div>
                <Label htmlFor="requirements">Requirements *</Label>
                <RichTextEditor
                  content={requirementsContent || (typeof editingPosition?.requirements === 'string' ? editingPosition.requirements : '')}
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
                    defaultValue={editingPosition?.sortOrder || 0}
                    className="w-24"
                  />
                </div>
                <div>
                  <Label htmlFor="expiresAt">Expires At (15 days default)</Label>
                  <Input
                    id="expiresAt"
                    name="expiresAt"
                    type="date"
                    defaultValue={editingPosition?.expiresAt ? new Date(editingPosition.expiresAt).toISOString().split('T')[0] : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
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
