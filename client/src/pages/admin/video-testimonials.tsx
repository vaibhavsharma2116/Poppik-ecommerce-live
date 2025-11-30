
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Upload, X, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/lib/types";

interface VideoTestimonial {
  id: number;
  customerImage: string;
  videoUrl: string;
  thumbnailUrl: string;
  productId: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminVideoTestimonials() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<VideoTestimonial | null>(null);

  const [customerImageFile, setCustomerImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [customerImagePreview, setCustomerImagePreview] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    customerImage: '',
    videoUrl: '',
    thumbnailUrl: '',
    productId: '',
    isActive: true,
    sortOrder: 0,
  });

  const { data: testimonials = [], isLoading } = useQuery<VideoTestimonial[]>({
    queryKey: ['/api/admin/video-testimonials'],
    refetchInterval: 2000, // Auto-refresh every 2 seconds
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/admin/video-testimonials', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: (newTestimonial) => {
      queryClient.setQueryData(['/api/admin/video-testimonials'], (old: VideoTestimonial[] = []) => [...old, newTestimonial]);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/video-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/video-testimonials'] });
      toast({ title: "Success", description: "Video testimonial created" });
      resetForm();
      setIsAddModalOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      const response = await fetch(`/api/admin/video-testimonials/${id}`, {
        method: 'PUT',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: (updatedTestimonial) => {
      queryClient.setQueryData(['/api/admin/video-testimonials'], (old: VideoTestimonial[] = []) =>
        old.map(t => t.id === updatedTestimonial.id ? updatedTestimonial : t)
      );
      queryClient.invalidateQueries({ queryKey: ['/api/admin/video-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/video-testimonials'] });
      toast({ title: "Success", description: "Video testimonial updated" });
      resetForm();
      setIsEditModalOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/video-testimonials/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(['/api/admin/video-testimonials'], (old: VideoTestimonial[] = []) =>
        old.filter(t => t.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ['/api/admin/video-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/video-testimonials'] });
      toast({ title: "Success", description: "Video testimonial deleted" });
      setIsDeleteModalOpen(false);
      setSelectedTestimonial(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    },
  });

  const handleCustomerImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCustomerImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setCustomerImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setVideoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setThumbnailPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitFormData = new FormData();
    submitFormData.append('productId', formData.productId);
    submitFormData.append('isActive', formData.isActive.toString());
    submitFormData.append('sortOrder', formData.sortOrder.toString());

    if (customerImageFile) {
      submitFormData.append('customerImage', customerImageFile);
    } else if (formData.customerImage) {
      submitFormData.append('customerImage', formData.customerImage);
    }

    if (videoFile) {
      submitFormData.append('video', videoFile);
    } else if (formData.videoUrl) {
      submitFormData.append('videoUrl', formData.videoUrl);
    }

    if (thumbnailFile) {
      submitFormData.append('thumbnail', thumbnailFile);
    } else if (formData.thumbnailUrl) {
      submitFormData.append('thumbnailUrl', formData.thumbnailUrl);
    }

    if (selectedTestimonial) {
      updateMutation.mutate({ id: selectedTestimonial.id, formData: submitFormData });
    } else {
      createMutation.mutate(submitFormData);
    }
  };

  const handleEdit = (testimonial: VideoTestimonial) => {
    setSelectedTestimonial(testimonial);
    setFormData({
      customerImage: testimonial.customerImage,
      videoUrl: testimonial.videoUrl,
      thumbnailUrl: testimonial.thumbnailUrl,
      productId: testimonial.productId.toString(),
      isActive: testimonial.isActive,
      sortOrder: testimonial.sortOrder,
    });
    setCustomerImagePreview(testimonial.customerImage);
    setVideoPreview(testimonial.videoUrl);
    setThumbnailPreview(testimonial.thumbnailUrl);
    setIsEditModalOpen(true);
  };

  const handleDelete = () => {
    if (selectedTestimonial) {
      deleteMutation.mutate(selectedTestimonial.id);
    }
  };

  const resetForm = () => {
    setFormData({
      customerImage: '',
      videoUrl: '',
      thumbnailUrl: '',
      productId: '',
      isActive: true,
      sortOrder: 0,
    });
    setCustomerImageFile(null);
    setVideoFile(null);
    setThumbnailFile(null);
    setCustomerImagePreview('');
    setVideoPreview('');
    setThumbnailPreview('');
    setSelectedTestimonial(null);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">UGC Video</h2>
          <p className="text-muted-foreground mt-1">Manage product UGC Video</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Video Testimonial
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All UGC Video</CardTitle>
          <CardDescription>View and manage UGC Video with product links</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((testimonial) => {
                  const product = products.find(p => p.id === testimonial.productId);
                  return (
                    <TableRow key={testimonial.id}>
                      <TableCell>
                        {product ? (
                          <div className="flex items-center gap-2">
                            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                            <span className="text-sm">{product.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Product not found</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={testimonial.isActive ? "default" : "secondary"}>
                          {testimonial.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{testimonial.sortOrder}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(testimonial)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedTestimonial(testimonial); setIsDeleteModalOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) { resetForm(); setIsAddModalOpen(false); setIsEditModalOpen(false); }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTestimonial ? 'Edit' : 'Add'} Video Testimonial</DialogTitle>
            <DialogDescription>{selectedTestimonial ? 'Update' : 'Create a new'} video testimonial with product link</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Video *</Label>
              {videoPreview && (
                <div className="relative">
                  <video src={videoPreview} className="w-full h-48 object-cover rounded" controls />
                  <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => { setVideoFile(null); setVideoPreview(''); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="border-2 border-dashed rounded-lg p-4">
                <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" id="video-upload" />
                <Label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Click to upload video</p>
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productId">Product *</Label>
              <Select value={formData.productId} onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      <div className="flex items-center gap-2">
                        <img src={product.imageUrl} alt={product.name} className="w-6 h-6 rounded object-cover" />
                        {product.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input id="sortOrder" type="number" value={formData.sortOrder} onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))} />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))} />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setIsAddModalOpen(false); setIsEditModalOpen(false); }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedTestimonial ? 'Update' : 'Create'} Video Testimonial
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Video Testimonial</DialogTitle>
            <DialogDescription>Are you sure you want to delete this video testimonial? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
