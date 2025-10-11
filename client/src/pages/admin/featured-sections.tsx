
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RefreshCw,
  Upload,
  X
} from "lucide-react";

interface FeaturedSection {
  id: number;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  buttonText?: string;
  displayOrder: number;
  isActive: boolean;
}

export default function FeaturedSections() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<FeaturedSection | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    buttonText: '',
    displayOrder: 0,
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading, refetch } = useQuery<FeaturedSection[]>({
    queryKey: ['/api/admin/featured-sections'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/featured-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create section');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/featured-sections'] });
      toast({ title: "Section created successfully" });
      setIsAddModalOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/admin/featured-sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update section');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/featured-sections'] });
      toast({ title: "Section updated successfully" });
      setIsEditModalOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/featured-sections/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete section');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/featured-sections'] });
      toast({ title: "Section deleted successfully" });
    }
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '',
      buttonText: '',
      displayOrder: 0,
      isActive: true
    });
    setSelectedSection(null);
    setSelectedImage(null);
    setImagePreview('');
  };

  const handleEdit = (section: FeaturedSection) => {
    setSelectedSection(section);
    setFormData({
      title: section.title,
      subtitle: section.subtitle || '',
      imageUrl: section.imageUrl,
      linkUrl: section.linkUrl || '',
      buttonText: section.buttonText || '',
      displayOrder: section.displayOrder,
      isActive: section.isActive
    });
    setImagePreview(section.imageUrl);
    setIsEditModalOpen(true);
  };

  const handleSubmit = async () => {
    let imageUrl = formData.imageUrl;

    // Upload image if selected
    if (selectedImage) {
      const uploadFormData = new FormData();
      uploadFormData.append('image', selectedImage);

      try {
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          credentials: 'include',
          body: uploadFormData
        });

        if (!response.ok) throw new Error('Failed to upload image');
        const data = await response.json();
        imageUrl = data.imageUrl;
      } catch (error) {
        toast({ title: "Failed to upload image", variant: "destructive" });
        return;
      }
    }

    const submitData = { ...formData, imageUrl };

    if (selectedSection) {
      updateMutation.mutate({ id: selectedSection.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleToggleActive = (section: FeaturedSection) => {
    updateMutation.mutate({
      id: section.id,
      data: { ...section, isActive: !section.isActive }
    });
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Featured Sections
          </h2>
          <p className="text-slate-600 mt-1">Manage promotional sections on the home page</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>
      </div>

      {/* Sections Table */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Featured Sections ({sections.length})
          </CardTitle>
          <CardDescription>Manage promotional banners and featured content</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] rounded-lg border border-slate-200/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold">Order</TableHead>
                  <TableHead className="font-semibold">Preview</TableHead>
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold">Subtitle</TableHead>
                  <TableHead className="font-semibold">Link</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((section) => (
                    <TableRow key={section.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-medium">{section.displayOrder}</TableCell>
                      <TableCell>
                        <img 
                          src={section.imageUrl} 
                          alt={section.title}
                          className="w-20 h-12 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{section.title}</TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">
                        {section.subtitle || '-'}
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">
                        {section.linkUrl || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={section.isActive ? "default" : "secondary"}>
                          {section.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(section)}
                            title={section.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {section.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(section)}
                            title="Edit Section"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(section.id)}
                            title="Delete Section"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
          <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>{selectedSection ? 'Edit' : 'Add'} Featured Section</DialogTitle>
              <DialogDescription>
                {selectedSection ? 'Update' : 'Create a new'} promotional section for the home page
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 pr-4 pb-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter section title"
                  />
                </div>
                <div>
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Enter subtitle (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="imageUpload">Section Image *</Label>
                  {imagePreview ? (
                    <div className="relative mt-2">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg border shadow-sm"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="imageUpload"
                      />
                      <Label htmlFor="imageUpload" className="cursor-pointer">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Click to upload section image</p>
                        <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                      </Label>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="linkUrl">Link URL</Label>
                  <Input
                    id="linkUrl"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    placeholder="Enter link URL (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="buttonText">Button Text</Label>
                  <Input
                    id="buttonText"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="Enter button text (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2 pb-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter className="px-6 py-4 border-t">
              <Button variant="outline" onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {selectedSection ? 'Update' : 'Create'} Section
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
