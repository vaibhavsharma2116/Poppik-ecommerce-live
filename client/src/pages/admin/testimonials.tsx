
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Star, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Testimonial {
  id: number;
  customerName: string;
  customerImage: string | null;
  rating: number;
  reviewText: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    customerName: '',
    customerImage: '',
    rating: 5,
    reviewText: '',
    isActive: true,
    sortOrder: 0,
  });

  const fetchTestimonials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/testimonials');
      if (response.ok) {
        const data = await response.json();
        setTestimonials(data);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      toast({
        title: "Error",
        description: "Failed to fetch testimonials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, customerImage: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.customerImage;

      // Upload image if selected
      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('image', imageFile);

        const imageResponse = await fetch('/api/upload/image', {
          method: 'POST',
          body: imageFormData,
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          imageUrl = imageData.imageUrl;
        }
      }

      const submitFormData = new FormData();
      submitFormData.append('customerName', formData.customerName);
      submitFormData.append('customerImage', imageUrl);
      submitFormData.append('rating', formData.rating.toString());
      submitFormData.append('reviewText', formData.reviewText);
      submitFormData.append('isActive', formData.isActive.toString());
      submitFormData.append('sortOrder', formData.sortOrder.toString());

      const url = selectedTestimonial
        ? `/api/admin/testimonials/${selectedTestimonial.id}`
        : '/api/admin/testimonials';

      const response = await fetch(url, {
        method: selectedTestimonial ? 'PUT' : 'POST',
        body: submitFormData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Testimonial ${selectedTestimonial ? 'updated' : 'created'} successfully`,
        });
        await fetchTestimonials();
        resetForm();
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving testimonial:', error);
      toast({
        title: "Error",
        description: "Failed to save testimonial",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setFormData({
      customerName: testimonial.customerName,
      customerImage: testimonial.customerImage || '',
      rating: testimonial.rating,
      reviewText: testimonial.reviewText,
      isActive: testimonial.isActive,
      sortOrder: testimonial.sortOrder,
    });
    setImagePreview(testimonial.customerImage || '');
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedTestimonial) return;

    try {
      const response = await fetch(`/api/admin/testimonials/${selectedTestimonial.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Testimonial deleted successfully",
        });
        await fetchTestimonials();
        setIsDeleteModalOpen(false);
        setSelectedTestimonial(null);
      }
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      toast({
        title: "Error",
        description: "Failed to delete testimonial",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerImage: '',
      rating: 5,
      reviewText: '',
      isActive: true,
      sortOrder: 0,
    });
    setImageFile(null);
    setImagePreview('');
    setSelectedTestimonial(null);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Testimonials Management</h2>
          <p className="text-muted-foreground mt-1">Manage customer reviews and testimonials</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Testimonials</CardTitle>
          <CardDescription>View and manage customer testimonials</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((testimonial) => (
                  <TableRow key={testimonial.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {testimonial.customerImage && (
                          <img
                            src={testimonial.customerImage}
                            alt={testimonial.customerName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium">{testimonial.customerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{testimonial.reviewText}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedTestimonial(testimonial); setIsDeleteModalOpen(true); }}
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

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) { resetForm(); setIsAddModalOpen(false); setIsEditModalOpen(false); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedTestimonial ? 'Edit' : 'Add'} Testimonial</DialogTitle>
            <DialogDescription>
              {selectedTestimonial ? 'Update' : 'Create a new'} customer testimonial
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name * (Max 15 characters)</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 15);
                  setFormData(prev => ({ ...prev, customerName: value }));
                }}
                maxLength={15}
                required
              />
              <p className="text-xs text-gray-500">
                {formData.customerName.length}/15 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label>Customer Image</Label>
              {imagePreview && (
                <div className="relative w-24 h-24">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <Label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Click to upload image</p>
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Rating *</Label>
              <Input
                id="rating"
                type="number"
                min="1"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewText">Review Text * (Max 80 words)</Label>
              <Textarea
                id="reviewText"
                value={formData.reviewText}
                onChange={(e) => {
                  const text = e.target.value;
                  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
                  if (wordCount <= 80) {
                    setFormData(prev => ({ ...prev, reviewText: text }));
                  }
                }}
                rows={4}
                required
              />
              <p className="text-xs text-gray-500">
                {formData.reviewText.trim().split(/\s+/).filter(word => word.length > 0).length} / 80 words
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                resetForm();
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedTestimonial ? 'Update' : 'Create'} Testimonial
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Testimonial</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this testimonial? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
