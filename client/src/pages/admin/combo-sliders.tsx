
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ComboSlider {
  id: number;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminComboSliders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<ComboSlider | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    isActive: true,
    sortOrder: 0
  });

  const { data: sliders = [], isLoading } = useQuery<ComboSlider[]>({
    queryKey: ['/api/admin/combo-sliders'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/admin/combo-sliders', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) throw new Error('Failed to create slider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/combo-sliders'] });
      toast({ title: "Slider created successfully" });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await fetch(`/api/admin/combo-sliders/${id}`, {
        method: 'PUT',
        body: data,
      });
      if (!response.ok) throw new Error('Failed to update slider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/combo-sliders'] });
      toast({ title: "Slider updated successfully" });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/combo-sliders/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete slider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/combo-sliders'] });
      toast({ title: "Slider deleted successfully" });
    },
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const data = new FormData();
      
      if (selectedImage) {
        data.append('image', selectedImage);
      } else if (editingSlider?.imageUrl) {
        data.append('imageUrl', editingSlider.imageUrl);
      } else if (imagePreview) {
        data.append('imageUrl', imagePreview);
      } else {
        toast({
          title: "Error",
          description: "Please select an image",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      data.append('title', formData.title);
      data.append('subtitle', formData.subtitle);
      data.append('isActive', formData.isActive.toString());
      data.append('sortOrder', formData.sortOrder.toString());

      if (editingSlider) {
        updateMutation.mutate({ id: editingSlider.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Error saving slider:', error);
      toast({
        title: "Error",
        description: "Failed to save slider",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      isActive: true,
      sortOrder: 0
    });
    setSelectedImage(null);
    setImagePreview('');
    setEditingSlider(null);
    setIsModalOpen(false);
  };

  const handleEdit = (slider: ComboSlider) => {
    setEditingSlider(slider);
    setFormData({
      title: slider.title || '',
      subtitle: slider.subtitle || '',
      isActive: slider.isActive,
      sortOrder: slider.sortOrder
    });
    setImagePreview(slider.imageUrl);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Combo Page Sliders</h2>
          <p className="text-gray-600 mt-1">Manage slider images for the combo page</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Slider
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Combo Sliders</CardTitle>
          <CardDescription>Manage your combo page slider images</CardDescription>
        </CardHeader>
        <CardContent>
          {sliders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No sliders added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sliders.map((slider) => (
                <div key={slider.id} className="border rounded-lg p-4 space-y-3">
                  <img 
                    src={slider.imageUrl} 
                    alt={slider.title || 'Slider'} 
                    className="w-full h-48 object-cover rounded"
                  />
                  <div>
                    <h4 className="font-medium">{slider.title || 'No Title'}</h4>
                    <p className="text-sm text-gray-600">{slider.subtitle || 'No Subtitle'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Order: {slider.sortOrder} | {slider.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(slider)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(slider.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSlider ? 'Edit Slider' : 'Add New Slider'}</DialogTitle>
            <DialogDescription>
              {editingSlider ? 'Update slider details' : 'Create a new slider for combo page'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Slider Image</Label>
              {imagePreview ? (
                <div className="relative mt-2">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImagePreview('');
                      setSelectedImage(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="slider-image"
                  />
                  <Label htmlFor="slider-image" className="cursor-pointer">
                    <Plus className="h-8 w-8 mx-auto mb-2" />
                    <span>Click to upload image</span>
                  </Label>
                </div>
              )}
            </div>

            <div>
              <Label>Title (Optional)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Slider title"
              />
            </div>

            <div>
              <Label>Subtitle (Optional)</Label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Slider subtitle"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2 mt-6">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading...' : editingSlider ? 'Update Slider' : 'Add Slider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
