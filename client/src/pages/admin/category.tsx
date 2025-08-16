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
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Eye,
  Layers,
  Tag,
  FolderOpen,
  Package,
  TrendingUp
} from "lucide-react";
import type { Category, Subcategory } from "@/lib/types";

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

  const queryClient = useQueryClient();

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
      const response = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subcategory)
      });
      if (!response.ok) throw new Error('Failed to create subcategory');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      setIsAddSubcategoryModalOpen(false);
      setSubcategoryFormData({ name: '', slug: '', description: '', categoryId: '', status: 'Active' });
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
    const slug = subcategoryFormData.slug || subcategoryFormData.name.toLowerCase().replace(/\s+/g, '-');
    createSubcategoryMutation.mutate({
      ...subcategoryFormData,
      slug,
      categoryId: parseInt(subcategoryFormData.categoryId)
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
    { label: "Total Products", value: categories.reduce((sum: number, cat: Category) => sum + cat.productCount, 0).toString(), icon: TrendingUp, color: "from-orange-500 to-red-500" }
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
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedCategory(category);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedCategory(category);
                              setIsDeleteModalOpen(true);
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingCategory ? <Edit className="h-5 w-5 text-emerald-600" /> : <Layers className="h-5 w-5 text-blue-600" />}
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the category details' : 'Create a new product category for your store'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-600" />
              {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
            </DialogTitle>
            <DialogDescription>
              {editingSubcategory ? 'Update the subcategory details' : 'Create a new subcategory under an existing category'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
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
    </div>
  );
}