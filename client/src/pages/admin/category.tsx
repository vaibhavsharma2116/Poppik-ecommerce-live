import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Eye, Layers, Tag, FolderOpen, Package, TrendingUp, ImageIcon, X, Search, Edit } from "lucide-react";
import type { Category, Subcategory } from "@/lib/types";
import { AlertDialog, AlertDialogFooter, AlertDialogHeader } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@radix-ui/react-alert-dialog';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  productCount: number; // Added productCount for stats
}

interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  productCount: number; // Added productCount for stats
}

interface CategorySlider {
  id: number;
  categoryId: number;
  imageUrl: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCategories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddSubcategoryModalOpen, setIsAddSubcategoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);

  // Slider Management State
  const [isSliderModalOpen, setIsSliderModalOpen] = useState(false);
  const [categorySliders, setCategorySliders] = useState<CategorySlider[]>([]);
  const [selectedCategoryForSliders, setSelectedCategoryForSliders] = useState<Category | null>(null);
  const [sliderFormData, setSliderFormData] = useState({
    imageUrl: '',
    title: '',
    subtitle: '',
    isActive: true,
    sortOrder: 0
  });
  const [editingSlider, setEditingSlider] = useState<CategorySlider | null>(null);
  const [selectedSliderImage, setSelectedSliderImage] = useState<File | null>(null);
  const [sliderImagePreview, setSliderImagePreview] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  });

  // Fetch subcategories
  const { data: subcategories = [], isLoading: subcategoriesLoading, error: subcategoriesError } = useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const response = await fetch('/api/subcategories');
      if (!response.ok) throw new Error('Failed to fetch subcategories');
      return response.json();
    },
    retry: 3,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'productCount'>) => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsAddCategoryModalOpen(false);
      setCategoryFormData({ name: '', slug: '', description: '', status: 'Active' });
      setSelectedImage(null);
      setImagePreview('');
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...category }: Partial<Category> & { id: number }) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsEditModalOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', slug: '', description: '', status: 'Active' });
      setSelectedImage(null);
      setImagePreview('');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    }
  });

  // Subcategory mutations
  const createSubcategoryMutation = useMutation({
    mutationFn: async (subcategory: Omit<Subcategory, 'id' | 'productCount'>) => {
      console.log('Creating subcategory:', subcategory);
      const response = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subcategory)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Subcategory creation failed:', data);
        throw new Error(data.error || 'Failed to create subcategory');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      setIsAddSubcategoryModalOpen(false);
      setSubcategoryFormData({ name: '', slug: '', description: '', categoryId: '', status: 'Active' });
    },
    onError: (error: Error) => {
      console.error('Subcategory creation error:', error);
      // You can add a toast notification here if you have a toast system
      alert(`Error creating subcategory: ${error.message}`);
    }
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: async ({ id, ...subcategory }: Partial<Subcategory> & { id: number }) => {
      const response = await fetch(`/api/subcategories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subcategory)
      });
      if (!response.ok) throw new Error('Failed to update subcategory');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      setIsEditModalOpen(false);
      setEditingSubcategory(null);
      setSubcategoryFormData({ name: '', slug: '', description: '', categoryId: '', status: 'Active' });
    }
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/subcategories/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete subcategory');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      setIsDeleteModalOpen(false);
      setSelectedSubcategory(null);
    }
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'Active' as const
  });

  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    categoryId: '',
    status: 'Active' as const
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Filter categories
  const filteredCategories = categories.filter((category: Category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || category.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter subcategories
  const filteredSubcategories = subcategories.filter((subcategory: Subcategory) => {
    const matchesSearch = subcategory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subcategory.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subcategory.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const uploadedUrl = data.imageUrl;

      // Update the preview to show the uploaded image
      setImagePreview(uploadedUrl);

      return uploadedUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      const slug = categoryFormData.slug || categoryFormData.name.toLowerCase().replace(/\s+/g, '-');

      // Upload image if selected
      let imageUrl = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400';
      if (selectedImage) {
        const uploadedImageUrl = await uploadImage();
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl;
        }
      } else if (imagePreview && !imagePreview.startsWith('data:')) {
        // If we have an image preview that's not a data URL, use it
        imageUrl = imagePreview;
      }

      createCategoryMutation.mutate({
        ...categoryFormData,
        slug,
        imageUrl
      });
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleAddSubcategory = () => {
    // Validation
    if (!subcategoryFormData.name.trim()) {
      alert('Subcategory name is required');
      return;
    }

    if (!subcategoryFormData.description.trim()) {
      alert('Subcategory description is required');
      return;
    }

    if (!subcategoryFormData.categoryId) {
      alert('Please select a parent category');
      return;
    }

    const categoryId = parseInt(subcategoryFormData.categoryId);
    if (isNaN(categoryId) || categoryId <= 0) {
      alert('Please select a valid parent category');
      return;
    }

    const slug = subcategoryFormData.slug || subcategoryFormData.name.toLowerCase().replace(/\s+/g, '-');

    createSubcategoryMutation.mutate({
      ...subcategoryFormData,
      slug,
      categoryId
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
      status: category.status as 'Active' | 'Inactive'
    });
    // Set the existing image as preview
    setImagePreview(category.imageUrl || '');
    setSelectedImage(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryFormData({
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description,
      categoryId: subcategory.categoryId.toString(),
      status: subcategory.status as 'Active' | 'Inactive'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      const slug = categoryFormData.slug || categoryFormData.name.toLowerCase().replace(/\s+/g, '-');

      // Upload new image if selected, otherwise keep existing or use preview
      let imageUrl = editingCategory.imageUrl;
      if (selectedImage) {
        const uploadedImageUrl = await uploadImage();
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl;
        }
      } else if (imagePreview && !imagePreview.startsWith('data:') && imagePreview !== editingCategory.imageUrl) {
        // If we have a new image preview that's not a data URL and different from existing, use it
        imageUrl = imagePreview;
      }

      updateCategoryMutation.mutate({
        id: editingCategory.id,
        ...categoryFormData,
        slug,
        imageUrl
      });
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleUpdateSubcategory = () => {
    if (!editingSubcategory) return;
    const slug = subcategoryFormData.slug || subcategoryFormData.name.toLowerCase().replace(/\s+/g, '-');
    updateSubcategoryMutation.mutate({
      id: editingSubcategory.id,
      ...subcategoryFormData,
      slug,
      categoryId: parseInt(subcategoryFormData.categoryId)
    });
  };

  const stats = [
    { label: "Total Categories", value: categories.length.toString(), icon: Layers, color: "from-blue-500 to-cyan-500" },
    { label: "Total Subcategories", value: subcategories.length.toString(), icon: Tag, color: "from-purple-500 to-pink-500" },
    { label: "Active Categories", value: categories.filter((c: Category) => c.status === 'Active').length.toString(), icon: Package, color: "from-green-500 to-emerald-500" },
    { label: "Total Products", value: categories.reduce((sum: number, cat: Category) => sum + (cat.productCount || 0), 0).toString(), icon: TrendingUp, color: "from-orange-500 to-red-500" }
  ];

  if ((categoriesLoading && categories.length === 0) || (subcategoriesLoading && subcategories.length === 0)) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading categories...</div>
        </div>
      </div>
    );
  }

  if (categoriesError || subcategoriesError) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-lg text-red-600">Error loading categories</div>
          <Button onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['subcategories'] });
          }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setCategoryFormData({
      name: '',
      slug: '',
      description: '',
      status: 'Active'
    });
    setSelectedImage(null);
    setImagePreview('');
    setEditingCategory(null);
  };

  const resetSliderForm = () => {
    setSliderFormData({
      imageUrl: '',
      title: '',
      subtitle: '',
      isActive: true,
      sortOrder: 0
    });
    setSelectedSliderImage(null);
    setSliderImagePreview('');
    setEditingSlider(null);
  };

  const openSliderManager = async (category: Category) => {
    setSelectedCategoryForSliders(category);
    setIsSliderModalOpen(true);
    await fetchCategorySliders(category.id);
  };

  const fetchCategorySliders = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}/sliders`);

      if (!response.ok) {
        throw new Error('Failed to fetch category sliders');
      }

      const sliders = await response.json();
      setCategorySliders(sliders);
    } catch (error) {
      console.error('Error fetching category sliders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch category sliders",
        variant: "destructive",
      });
    }
  };

  const handleSliderImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedSliderImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSliderImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSliderImage = async (): Promise<string> => {
    if (!selectedSliderImage) {
      throw new Error('No image selected');
    }

    const formData = new FormData();
    formData.append('image', selectedSliderImage);

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.imageUrl;
  };

  const handleSliderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryForSliders) return;

    try {
      setUploading(true);

      let imageUrl = sliderFormData.imageUrl;

      if (selectedSliderImage) {
        imageUrl = await uploadSliderImage();
      }

      if (!imageUrl) {
        toast({
          title: "Error",
          description: "Please provide an image URL or upload an image",
          variant: "destructive",
        });
        return;
      }

      const url = editingSlider
        ? `/api/admin/categories/${selectedCategoryForSliders.id}/sliders/${editingSlider.id}`
        : `/api/admin/categories/${selectedCategoryForSliders.id}/sliders`;

      const method = editingSlider ? 'PUT' : 'POST';

      const requestData = {
        imageUrl: imageUrl.trim(),
        title: sliderFormData.title.trim(),
        subtitle: sliderFormData.subtitle.trim(),
        isActive: sliderFormData.isActive,
        sortOrder: Number(sliderFormData.sortOrder) || 0
      };

      console.log('Sending slider data:', requestData);

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to ${editingSlider ? 'update' : 'create'} slider`);
      }

      toast({
        title: "Success",
        description: `Slider ${editingSlider ? 'updated' : 'created'} successfully`,
      });

      await fetchCategorySliders(selectedCategoryForSliders.id);
      resetSliderForm();
    } catch (error) {
      console.error('Error saving slider:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingSlider ? 'update' : 'create'} slider`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEditSlider = (slider: CategorySlider) => {
    setEditingSlider(slider);
    setSliderFormData({
      imageUrl: slider.imageUrl,
      title: slider.title || '',
      subtitle: slider.subtitle || '',
      isActive: slider.isActive,
      sortOrder: slider.sortOrder
    });
    setSliderImagePreview(slider.imageUrl);
  };

  const handleDeleteSlider = async (sliderId: number) => {
    if (!selectedCategoryForSliders) return;

    try {
      const response = await fetch(`/api/admin/categories/${selectedCategoryForSliders.id}/sliders/${sliderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete slider');
      }

      toast({
        title: "Success",
        description: "Slider deleted successfully",
      });

      await fetchCategorySliders(selectedCategoryForSliders.id);
    } catch (error) {
      console.error('Error deleting slider:', error);
      toast({
        title: "Error",
        description: "Failed to delete slider",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Category Management
          </h2>
          <p className="text-slate-600 mt-1">Organize your product categories and subcategories</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => setIsAddCategoryModalOpen(true)} className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
          <Button onClick={() => setIsAddSubcategoryModalOpen(true)} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Plus className="mr-2 h-4 w-4" />
            Add Subcategory
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Categories ({filteredCategories.length})
          </TabsTrigger>
          <TabsTrigger value="subcategories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Subcategories ({filteredSubcategories.length})
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Manage your product categories</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Subcategories</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category: Category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="w-12 h-12 rounded-lg overflow-hidden border bg-gray-50">
                          {category.imageUrl ? (
                            <img 
                              src={category.imageUrl} 
                              alt={category.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-sm text-slate-500">{category.slug}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-slate-600 truncate">{category.description}</p>
                      </TableCell>
                      <TableCell>{category.productCount}</TableCell>
                      <TableCell>{subcategories.filter((sub: Subcategory) => sub.categoryId === category.id).length}</TableCell>
                      <TableCell>
                        <Badge variant={category.status === 'Active' ? 'default' : 'destructive'}>
                          {category.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSliderManager(category)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditCategory(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedCategory(category);
                              setIsDeleteModalOpen(true);
                            }}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subcategories Tab */}
        <TabsContent value="subcategories" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Subcategories</CardTitle>
              <CardDescription>Manage your product subcategories</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Parent Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubcategories.map((subcategory: Subcategory) => {
                    const parentCategory = categories.find((cat: Category) => cat.id === subcategory.categoryId);
                    return (
                      <TableRow key={subcategory.id}>
                        <TableCell className="font-medium">{subcategory.name}</TableCell>
                        <TableCell className="text-sm text-slate-500">{subcategory.slug}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <FolderOpen className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">{parentCategory?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-slate-600 truncate">{subcategory.description}</p>
                        </TableCell>
                        <TableCell>{subcategory.productCount}</TableCell>
                        <TableCell>
                          <Badge variant={subcategory.status === 'Active' ? 'default' : 'destructive'}>
                            {subcategory.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedSubcategory(subcategory);
                                setIsViewModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditSubcategory(subcategory)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setSelectedSubcategory(subcategory);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Category Modal */}
      <Dialog open={isAddCategoryModalOpen || (isEditModalOpen && editingCategory)} onOpenChange={(open) => {
        if (!open) {
          setIsAddCategoryModalOpen(false);
          setIsEditModalOpen(false);
          setEditingCategory(null);
          setCategoryFormData({ name: '', slug: '', description: '', status: 'Active' });
          setSelectedImage(null);
          setImagePreview('');
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingCategory ? <Edit className="h-5 w-5 text-emerald-600" /> : <Layers className="h-5 w-5 text-blue-600" />}
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the category details' : 'Create a new product category for your store'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto px-1">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Skincare"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="category-slug">URL Slug</Label>
              <Input
                id="category-slug"
                value={categoryFormData.slug}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g., skincare (auto-generated if empty)"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the category"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="category-image">Category Image</Label>
              {imagePreview ? (
                <div className="relative mt-2">
                  <img 
                    src={imagePreview} 
                    alt="Category Preview" 
                    className="w-full h-40 object-cover rounded-lg border shadow-sm"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                    onClick={() => {
                      setImagePreview('');
                      setSelectedImage(null);
                    }}
                  >
                    ×
                  </Button>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                    {selectedImage ? 'New Image Selected' : 'Current Image'}
                  </div>
                </div>
              ) : (
                <div className="mt-2 w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-500">
                    <div className="text-2xl mb-2">🖼️</div>
                    <span className="text-sm">No image available</span>
                  </div>
                </div>
              )}
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="category-image-upload"
                />
                <Label
                  htmlFor="category-image-upload"
                  className="cursor-pointer flex items-center justify-center w-full h-12 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center space-x-2 text-blue-600">
                    <span className="text-lg">📷</span>
                    <span className="text-sm font-medium">
                      {imagePreview ? 'Change Image' : 'Upload Image'}
                    </span>
                  </div>
                </Label>
              </div>
            </div>
            <div>
              <Label htmlFor="category-status">Status</Label>
              <Select value={categoryFormData.status} onValueChange={(value) => setCategoryFormData(prev => ({ ...prev, status: value as 'Active' | 'Inactive' }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddCategoryModalOpen(false);
              setIsEditModalOpen(false);
              setEditingCategory(null);
              setCategoryFormData({ name: '', slug: '', description: '', status: 'Active' });
              setSelectedImage(null);
              setImagePreview('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending || uploading}
              className={editingCategory ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {uploading ? 'Uploading Image...' :
               (createCategoryMutation.isPending || updateCategoryMutation.isPending) ? 'Saving...' :
               editingCategory ? 'Update Category' : 'Add Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Subcategory Modal */}
      <Dialog open={isAddSubcategoryModalOpen || (isEditModalOpen && editingSubcategory)} onOpenChange={(open) => {
        if (!open) {
          setIsAddSubcategoryModalOpen(false);
          setIsEditModalOpen(false);
          setEditingSubcategory(null);
          setSubcategoryFormData({ name: '', slug: '', description: '', categoryId: '', status: 'Active' });
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-600" />
              {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
            </DialogTitle>
            <DialogDescription>
              {editingSubcategory ? 'Update the subcategory details' : 'Create a new subcategory under an existing category'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto px-1">
            <div>
              <Label htmlFor="subcategory-category">Parent Category</Label>
              <Select value={subcategoryFormData.categoryId} onValueChange={(value) => setSubcategoryFormData(prev => ({ ...prev, categoryId: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter((cat: Category) => cat.status === 'Active').map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subcategory-name">Subcategory Name</Label>
              <Input
                id="subcategory-name"
                value={subcategoryFormData.name}
                onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Face Serums"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="subcategory-slug">URL Slug</Label>
              <Input
                id="subcategory-slug"
                value={subcategoryFormData.slug}
                onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g., face-serums (auto-generated if empty)"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="subcategory-description">Description</Label>
              <Textarea
                id="subcategory-description"
                value={subcategoryFormData.description}
                onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the subcategory"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="subcategory-status">Status</Label>
              <Select value={subcategoryFormData.status} onValueChange={(value) => setSubcategoryFormData(prev => ({ ...prev, status: value as 'Active' | 'Inactive' }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddSubcategoryModalOpen(false);
              setIsEditModalOpen(false);
              setEditingSubcategory(null);
              setSubcategoryFormData({ name: '', slug: '', description: '', categoryId: '', status: 'Active' });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editingSubcategory ? handleUpdateSubcategory : handleAddSubcategory}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {editingSubcategory ? 'Update Subcategory' : 'Add Subcategory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              {selectedCategory ? 'Category Details' : 'Subcategory Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden border">
                  {selectedCategory.imageUrl ? (
                    <img 
                      src={selectedCategory.imageUrl} 
                      alt={selectedCategory.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedCategory.name}</h3>
                  <p className="text-slate-600">{selectedCategory.slug}</p>
                  <Badge variant={selectedCategory.status === 'Active' ? 'default' : 'destructive'}>
                    {selectedCategory.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600">Description</Label>
                <p className="mt-1 text-slate-900">{selectedCategory.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-600">Products</Label>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{selectedCategory.productCount}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Subcategories</Label>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{subcategories.filter((sub: Subcategory) => sub.categoryId === selectedCategory.id).length}</p>
                </div>
              </div>
            </div>
          )}
          {selectedSubcategory && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Tag className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedSubcategory.name}</h3>
                  <p className="text-slate-600">{selectedSubcategory.slug}</p>
                  <Badge variant={selectedSubcategory.status === 'Active' ? 'default' : 'destructive'}>
                    {selectedSubcategory.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600">Parent Category</Label>
                <p className="mt-1 text-slate-900">{categories.find((cat: Category) => cat.id === selectedSubcategory.categoryId)?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600">Description</Label>
                <p className="mt-1 text-slate-900">{selectedSubcategory.description}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600">Products</Label>
                <p className="mt-1 text-2xl font-bold text-slate-900">{selectedSubcategory.productCount}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete {selectedCategory ? 'Category' : 'Subcategory'}
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete this {selectedCategory ? 'category' : 'subcategory'}?
            </DialogDescription>
          </DialogHeader>
          {(selectedCategory || selectedSubcategory) && (
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                {selectedCategory ? <Layers className="h-6 w-6 text-slate-400" /> : <Tag className="h-6 w-6 text-slate-400" />}
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedCategory?.name || selectedSubcategory?.name}</p>
                <p className="text-sm text-slate-600">{selectedCategory?.description || selectedSubcategory?.description}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedCategory) {
                  deleteCategoryMutation.mutate(selectedCategory.id);
                } else if (selectedSubcategory) {
                  deleteSubcategoryMutation.mutate(selectedSubcategory.id);
                }
              }}
            >
              Delete {selectedCategory ? 'Category' : 'Subcategory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slider Management Modal */}
      <Dialog open={isSliderModalOpen} onOpenChange={setIsSliderModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Sliders - {selectedCategoryForSliders?.name}
            </DialogTitle>
            <DialogDescription>
              Add and manage slider images for this category page
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add/Edit Slider Form */}
            <form onSubmit={handleSliderSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold">
                {editingSlider ? 'Edit Slider' : 'Add New Slider'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="slider-title">Title</Label>
                  <Input
                    id="slider-title"
                    value={sliderFormData.title}
                    onChange={(e) => setSliderFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Slider title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="slider-subtitle">Subtitle</Label>
                  <Input
                    id="slider-subtitle"
                    value={sliderFormData.subtitle}
                    onChange={(e) => setSliderFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Slider subtitle"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="slider-sort-order">Sort Order</Label>
                  <Input
                    id="slider-sort-order"
                    type="number"
                    value={sliderFormData.sortOrder}
                    onChange={(e) => setSliderFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <input
                    type="checkbox"
                    id="slider-active"
                    checked={sliderFormData.isActive}
                    onChange={(e) => setSliderFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="slider-active">Active</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="slider-image">Slider Image</Label>
                {sliderImagePreview ? (
                  <div className="relative mt-2">
                    <img 
                      src={sliderImagePreview} 
                      alt="Slider Preview" 
                      className="w-full h-40 object-cover rounded-lg border shadow-sm"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                      onClick={() => {
                        setSliderImagePreview('');
                        setSelectedSliderImage(null);
                        setSliderFormData(prev => ({ ...prev, imageUrl: '' }));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="slider-image"
                    type="file"
                    accept="image/*"
                    onChange={handleSliderImageSelect}
                    className="mt-1"
                  />
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : editingSlider ? 'Update Slider' : 'Add Slider'}
                </Button>
                {editingSlider && (
                  <Button type="button" variant="outline" onClick={resetSliderForm}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>

            {/* Existing Sliders */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Existing Sliders</h3>
              {categorySliders.length === 0 ? (
                <p className="text-gray-500">No sliders added yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorySliders.map((slider) => (
                    <div key={slider.id} className="border rounded-lg p-4 space-y-2">
                      <img 
                        src={slider.imageUrl} 
                        alt={slider.title || 'Slider'} 
                        className="w-full h-32 object-cover rounded"
                      />
                      <div>
                        <h4 className="font-medium">{slider.title || 'No Title'}</h4>
                        <p className="text-sm text-gray-600">{slider.subtitle || 'No Subtitle'}</p>
                        <p className="text-xs text-gray-500">
                          Order: {slider.sortOrder} | {slider.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSlider(slider)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSlider(slider.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete this {selectedCategory ? 'category' : 'subcategory'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedCategory) {
                  deleteCategoryMutation.mutate(selectedCategory.id);
                } else if (selectedSubcategory) {
                  deleteSubcategoryMutation.mutate(selectedSubcategory.id);
                }
                setIsDeleteModalOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}