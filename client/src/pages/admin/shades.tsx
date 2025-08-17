import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Palette,
  Eye,
  EyeOff,
  Loader2,
  Package
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";


interface Shade {
  id: number;
  name: string;
  colorCode: string;
  value: string;
  isActive: boolean;
  sortOrder: number;
  categoryIds?: number[];
  subcategoryIds?: number[];
  productIds?: number[];
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Subcategory {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
}

interface Product {
  id: number;
  name: string;
  category: string;
  subcategory?: string;
  imageUrl: string;
  price: number;
}

export default function AdminShades() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedShade, setSelectedShade] = useState<Shade | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    colorCode: '#F7E7CE',
    value: '',
    isActive: true,
    sortOrder: 0,
    categoryIds: [] as number[],
    subcategoryIds: [] as number[],
    productIds: [] as number[],
    imageFile: null as File | null
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories and subcategories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['/api/subcategories'],
    queryFn: async () => {
      const response = await fetch('/api/subcategories');
      if (!response.ok) throw new Error('Failed to fetch subcategories');
      return response.json();
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Fetch shades
  const { data: shades = [], isLoading } = useQuery<Shade[]>({
    queryKey: ['/api/admin/shades'],
  });

  // Create shade mutation
  const createShadeMutation = useMutation({
    mutationFn: async (shadeData: any) => {
      const response = await fetch('/api/admin/shades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shadeData),
      });
      if (!response.ok) throw new Error('Failed to create shade');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shades'] });
      setIsAddModalOpen(false);
      resetForm();
      toast({ title: "Success", description: "Shade created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update shade mutation
  const updateShadeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log("Updating shade:", data);
      const response = await fetch(`/api/admin/shades/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("Update response:", result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update shade');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shades'] });
      setIsEditModalOpen(false);
      resetForm();
      toast({ title: "Success", description: "Shade updated successfully" });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update shade", 
        variant: "destructive" 
      });
    },
  });

  // Delete shade mutation
  const deleteShadeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/shades/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete shade');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shades'] });
      setIsDeleteModalOpen(false);
      setSelectedShade(null);
      toast({ title: "Success", description: "Shade deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      colorCode: '#F7E7CE',
      value: '',
      isActive: true,
      sortOrder: 0,
      categoryIds: [],
      subcategoryIds: [],
      productIds: [],
      imageFile: null
    });
    setSelectedShade(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleEdit = (shade: Shade) => {
    setSelectedShade(shade);
    setFormData({
      name: shade.name,
      colorCode: shade.colorCode,
      value: shade.value,
      isActive: shade.isActive,
      sortOrder: shade.sortOrder,
      categoryIds: shade.categoryIds || [],
      subcategoryIds: shade.subcategoryIds || [],
      productIds: shade.productIds || [],
      imageFile: null
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (shade: Shade) => {
    setSelectedShade(shade);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (isEdit: boolean) => {
    if (!formData.name || !formData.colorCode) {
      toast({ title: "Error", description: "Name and color code are required", variant: "destructive" });
      return;
    }

    const value = formData.value || formData.name.toLowerCase().replace(/\s+/g, '-');
    let imageUrl = null;

    // Handle image upload if there's a file
    if (formData.imageFile) {
      const imageFormData = new FormData();
      imageFormData.append('image', formData.imageFile);

      try {
        const uploadResponse = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: imageFormData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.imageUrl;
        } else {
          toast({ title: "Warning", description: "Image upload failed, shade will be created without image", variant: "destructive" });
        }
      } catch (error) {
        console.error('Image upload error:', error);
        toast({ title: "Warning", description: "Image upload failed, shade will be created without image", variant: "destructive" });
      }
    }

    const shadeData = { 
      ...formData, 
      value,
      imageUrl: imageUrl || (isEdit && selectedShade ? selectedShade.imageUrl : null)
    };

    if (isEdit && selectedShade) {
      updateShadeMutation.mutate({ 
        id: selectedShade.id, 
        data: shadeData
      });
    } else {
      createShadeMutation.mutate(shadeData);
    }
  };

  const handleToggleActive = (shade: Shade) => {
    updateShadeMutation.mutate({
      id: shade.id,
      data: { ...shade, isActive: !shade.isActive }
    });
  };

  // Get subcategories for selected categories
  const getAvailableSubcategories = (selectedCategoryIds: number[]) => {
    return subcategories.filter(sub => selectedCategoryIds.includes(sub.categoryId));
  };

  // Get products for shade's categories/subcategories
  const getShadeProducts = (shade: Shade) => {
    if (!shade.categoryIds?.length && !shade.subcategoryIds?.length) return [];

    return products.filter(product => {
      const categoryMatch = shade.categoryIds?.some(catId => {
        const category = categories.find(c => c.id === catId);
        return category?.name.toLowerCase() === product.category.toLowerCase();
      });

      const subcategoryMatch = shade.subcategoryIds?.some(subId => {
        const subcategory = subcategories.find(s => s.id === subId);
        return subcategory?.name.toLowerCase() === product.subcategory?.toLowerCase();
      });

      return categoryMatch || subcategoryMatch;
    });
  };

  // Get filtered products based on current form selection
  const getFilteredProducts = (selectedCategoryIds: number[], selectedSubcategoryIds: number[]) => {
    if (!selectedCategoryIds.length && !selectedSubcategoryIds.length) return [];

    return products.filter(product => {
      const categoryMatch = selectedCategoryIds.some(catId => {
        const category = categories.find(c => c.id === catId);
        return category?.name.toLowerCase() === product.category.toLowerCase();
      });

      const subcategoryMatch = selectedSubcategoryIds.some(subId => {
        const subcategory = subcategories.find(s => s.id === subId);
        return subcategory?.name.toLowerCase() === product.subcategory?.toLowerCase();
      });

      return categoryMatch || subcategoryMatch;
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    const id = parseInt(categoryId);
    const newCategoryIds = formData.categoryIds.includes(id) 
      ? formData.categoryIds.filter(cId => cId !== id)
      : [...formData.categoryIds, id];

    // Remove subcategories that don't belong to selected categories
    const validSubcategoryIds = formData.subcategoryIds.filter(subId => {
      const subcategory = subcategories.find(s => s.id === subId);
      return subcategory && newCategoryIds.includes(subcategory.categoryId);
    });

    setFormData(prev => ({ 
      ...prev, 
      categoryIds: newCategoryIds,
      subcategoryIds: validSubcategoryIds
    }));
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    const id = parseInt(subcategoryId);
    const newSubcategoryIds = formData.subcategoryIds.includes(id)
      ? formData.subcategoryIds.filter(sId => sId !== id)
      : [...formData.subcategoryIds, id];

    setFormData(prev => ({ ...prev, subcategoryIds: newSubcategoryIds }));
  };

  const handleProductChange = (productId: string) => {
    const id = parseInt(productId);
    const newProductIds = formData.productIds.includes(id)
      ? formData.productIds.filter(pId => pId !== id)
      : [...formData.productIds, id];

    setFormData(prev => ({ ...prev, productIds: newProductIds }));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading shades...</p>
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
            Shade Management
          </h2>
          <p className="text-slate-600 mt-1">Manage product shade colors and their category associations</p>
        </div>
        <Button onClick={handleAdd} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <Plus className="h-4 w-4 mr-2" />
          Add New Shade
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Shades</p>
                <p className="text-2xl font-bold text-slate-900">{shades.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                <Palette className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Shades</p>
                <p className="text-2xl font-bold text-slate-900">{shades.filter(s => s.isActive).length}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                <Eye className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Inactive Shades</p>
                <p className="text-2xl font-bold text-slate-900">{shades.filter(s => !s.isActive).length}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                <EyeOff className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Products</p>
                <p className="text-2xl font-bold text-slate-900">{products.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shades Table */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>All Shades</CardTitle>
          <CardDescription>Manage your product shade colors and their category associations</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/50">
                <TableHead className="text-slate-800 font-semibold py-4">Preview</TableHead>
                <TableHead className="text-slate-800 font-semibold py-4">Name</TableHead>
                <TableHead className="text-slate-800 font-semibold py-4">Color Code</TableHead>
                <TableHead className="text-slate-800 font-semibold py-4">Categories</TableHead>
                <TableHead className="text-slate-800 font-semibold py-4">Products</TableHead>
                <TableHead className="text-slate-800 font-semibold py-4">Status</TableHead>
                <TableHead className="text-slate-800 font-semibold py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shades.map((shade) => {
                const shadeProducts = getShadeProducts(shade);
                const shadeCategories = categories.filter(cat => shade.categoryIds?.includes(cat.id));
                const shadeSubcategories = subcategories.filter(sub => shade.subcategoryIds?.includes(sub.id));

                return (
                  <TableRow key={shade.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-all duration-200">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                          style={{ backgroundColor: shade.colorCode }}
                          title={`${shade.name} - ${shade.colorCode}`}
                        ></div>
                        {shade.imageUrl && (
                          <img 
                            src={shade.imageUrl} 
                            alt={shade.name}
                            className="w-8 h-8 rounded object-cover border-2 border-gray-300"
                            title="Actual shade image"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 font-medium">{shade.name}</TableCell>
                    <TableCell className="py-4">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{shade.colorCode}</code>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        {shadeCategories.map(cat => (
                          <Badge key={cat.id} variant="outline" className="mr-1">
                            {cat.name}
                          </Badge>
                        ))}
                        {shadeSubcategories.map(sub => (
                          <Badge key={sub.id} variant="secondary" className="mr-1">
                            {sub.name}
                          </Badge>
                        ))}
                        {!shadeCategories.length && !shadeSubcategories.length && (
                          <span className="text-gray-400 text-sm">No categories</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm font-medium">{shadeProducts.length} products</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(shade)}
                        className="p-1"
                      >
                        <Badge 
                          variant={shade.isActive ? "default" : "secondary"}
                          className={shade.isActive 
                            ? "bg-green-100 text-green-800 border border-green-200" 
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                          }
                        >
                          {shade.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-9 w-9 p-0 rounded-lg transition-all hover:bg-emerald-50 hover:text-emerald-600"
                          onClick={() => handleEdit(shade)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-9 w-9 p-0 rounded-lg transition-all hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(shade)}
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

      {/* Add Shade Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-600" />
              Add New Shade
            </DialogTitle>
            <DialogDescription>
              Create a new shade color option and assign it to categories
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Shade Name *</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Fair to Light"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-sort">Sort Order</Label>
                <Input
                  id="add-sort"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-color">Color Code *</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="add-color"
                  type="color"
                  value={formData.colorCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                  className="w-16 h-10"
                  required
                />
                <Input
                  value={formData.colorCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                  placeholder="#F7E7CE"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-image">Shade Image (Optional)</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="add-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData(prev => ({ ...prev, imageFile: file }));
                    }
                  }}
                  className="flex-1"
                />
                {formData.imageFile && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={URL.createObjectURL(formData.imageFile)} 
                      alt="Preview" 
                      className="w-10 h-10 rounded object-cover border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, imageFile: null }))}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">Upload an image to show the actual shade color</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-value">Value (auto-generated if empty)</Label>
              <Input
                id="add-value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="fair-light"
              />
            </div>

            <div className="space-y-4">
              <Label>Categories</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cat-${category.id}`}
                      checked={formData.categoryIds.includes(category.id)}
                      onCheckedChange={() => handleCategoryChange(category.id.toString())}
                    />
                    <Label htmlFor={`cat-${category.id}`} className="text-sm">{category.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            {formData.categoryIds.length > 0 && (
              <div className="space-y-4">
                <Label>Subcategories</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                  {getAvailableSubcategories(formData.categoryIds).map(subcategory => (
                    <div key={subcategory.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sub-${subcategory.id}`}
                        checked={formData.subcategoryIds.includes(subcategory.id)}
                        onCheckedChange={() => handleSubcategoryChange(subcategory.id.toString())}
                      />
                      <Label htmlFor={`sub-${subcategory.id}`} className="text-sm">{subcategory.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Products Selection */}
            <div className="space-y-4">
              <Label>Individual Products (Optional)</Label>
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">Select specific products that should have this shade option (overrides category-based selection)</p>
                {formData.categoryIds.length > 0 || formData.subcategoryIds.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {(() => {
                      // Filter products based on selected categories and subcategories
                      const filteredProducts = products.filter(product => {
                        // Check if product matches selected categories
                        const categoryMatch = formData.categoryIds.length === 0 || formData.categoryIds.some(catId => {
                          const category = categories.find(c => c.id === catId);
                          return category?.name.toLowerCase() === product.category.toLowerCase();
                        });

                        // Check if product matches selected subcategories
                        const subcategoryMatch = formData.subcategoryIds.length === 0 || formData.subcategoryIds.some(subId => {
                          const subcategory = subcategories.find(s => s.id === subId);
                          return subcategory?.name.toLowerCase() === product.subcategory?.toLowerCase();
                        });

                        return categoryMatch && subcategoryMatch;
                      });

                      return filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
                          <div key={product.id} className="flex items-center space-x-3 p-2 bg-white rounded border hover:bg-gray-50">
                            <Checkbox
                              id={`prod-${product.id}`}
                              checked={formData.productIds.includes(product.id)}
                              onCheckedChange={() => handleProductChange(product.id.toString())}
                            />
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                            <div className="flex-1">
                              <Label htmlFor={`prod-${product.id}`} className="text-sm font-medium cursor-pointer">{product.name}</Label>
                              <p className="text-xs text-gray-500">{product.category} • ₹{product.price}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No products found for selected categories/subcategories</p>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Please select categories or subcategories first to see filtered products</p>
                  </div>
                )}
                {formData.productIds.length > 0 && (
                  <p className="text-sm text-blue-600 mt-2">{formData.productIds.length} products selected individually</p>
                )}
              </div>
            </div>

            {/* Products Preview */}
            {(formData.categoryIds.length > 0 || formData.subcategoryIds.length > 0 || formData.productIds.length > 0) && (
              <div className="space-y-4">
                <Label>Products that will use this shade</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                  {(() => {
                    const categoryProducts = getFilteredProducts(formData.categoryIds, formData.subcategoryIds);
                    const individualProducts = products.filter(p => formData.productIds.includes(p.id));
                    const allProducts = [...categoryProducts, ...individualProducts.filter(p => !categoryProducts.some(cp => cp.id === p.id))];

                    return allProducts.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {allProducts.slice(0, 8).map(product => (
                          <div key={product.id} className="flex items-center space-x-3 p-2 bg-white rounded border">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-gray-500">
                                {product.category} • ₹{product.price}
                                {formData.productIds.includes(product.id) && (
                                  <span className="ml-2 text-blue-600">• Individual</span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                        {allProducts.length > 8 && (
                          <p className="text-sm text-gray-500 text-center">...and {allProducts.length - 8} more products ({allProducts.length} total)</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No products selected</p>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
              />
              <Label htmlFor="add-active" className="text-sm">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleSubmit(false)} 
              disabled={createShadeMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createShadeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Shade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Shade Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-emerald-600" />
              Edit Shade
            </DialogTitle>
            <DialogDescription>
              Update shade information and category assignments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Shade Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Fair to Light"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-sort">Sort Order</Label>
                <Input
                  id="edit-sort"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-color">Color Code *</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.colorCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                  className="w-16 h-10"
                  required
                />
                <Input
                  value={formData.colorCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                  placeholder="#F7E7CE"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-image">Shade Image</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData(prev => ({ ...prev, imageFile: file }));
                    }
                  }}
                  className="flex-1"
                />
                {(formData.imageFile || selectedShade?.imageUrl) && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={formData.imageFile ? URL.createObjectURL(formData.imageFile) : selectedShade?.imageUrl} 
                      alt="Preview" 
                      className="w-10 h-10 rounded object-cover border"
                    />
                    {formData.imageFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, imageFile: null }))}
                      >
                        Remove New
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {selectedShade?.imageUrl ? 'Upload a new image to replace the current one' : 'Upload an image to show the actual shade color'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-value">Value</Label>
              <Input
                id="edit-value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="fair-light"
              />
            </div>

            <div className="space-y-4">
              <Label>Categories</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-cat-${category.id}`}
                      checked={formData.categoryIds.includes(category.id)}
                      onCheckedChange={() => handleCategoryChange(category.id.toString())}
                    />
                    <Label htmlFor={`edit-cat-${category.id}`} className="text-sm">{category.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            {formData.categoryIds.length > 0 && (
              <div className="space-y-4">
                <Label>Subcategories</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                  {getAvailableSubcategories(formData.categoryIds).map(subcategory => (
                    <div key={subcategory.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-sub-${subcategory.id}`}
                        checked={formData.subcategoryIds.includes(subcategory.id)}
                        onCheckedChange={() => handleSubcategoryChange(subcategory.id.toString())}
                      />
                      <Label htmlFor={`edit-sub-${subcategory.id}`} className="text-sm">{subcategory.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Products Selection */}
            <div className="space-y-4">
              <Label>Individual Products (Optional)</Label>
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">Select specific products that should have this shade option (overrides category-based selection)</p>
                {formData.categoryIds.length > 0 || formData.subcategoryIds.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {(() => {
                      // Filter products based on selected categories and subcategories
                      const filteredProducts = products.filter(product => {
                        // Check if product matches selected categories
                        const categoryMatch = formData.categoryIds.length === 0 || formData.categoryIds.some(catId => {
                          const category = categories.find(c => c.id === catId);
                          return category?.name.toLowerCase() === product.category.toLowerCase();
                        });

                        // Check if product matches selected subcategories
                        const subcategoryMatch = formData.subcategoryIds.length === 0 || formData.subcategoryIds.some(subId => {
                          const subcategory = subcategories.find(s => s.id === subId);
                          return subcategory?.name.toLowerCase() === product.subcategory?.toLowerCase();
                        });

                        return categoryMatch && subcategoryMatch;
                      });

                      return filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
                          <div key={product.id} className="flex items-center space-x-3 p-2 bg-white rounded border hover:bg-gray-50">
                            <Checkbox
                              id={`edit-prod-${product.id}`}
                              checked={formData.productIds.includes(product.id)}
                              onCheckedChange={() => handleProductChange(product.id.toString())}
                            />
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                            <div className="flex-1">
                              <Label htmlFor={`edit-prod-${product.id}`} className="text-sm font-medium cursor-pointer">{product.name}</Label>
                              <p className="text-xs text-gray-500">{product.category} • ₹{product.price}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No products found for selected categories/subcategories</p>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Please select categories or subcategories first to see filtered products</p>
                  </div>
                )}
                {formData.productIds.length > 0 && (
                  <p className="text-sm text-blue-600 mt-2">{formData.productIds.length} products selected individually</p>
                )}
              </div>
            </div>

            {/* Current form products preview */}
            {(formData.categoryIds.length > 0 || formData.subcategoryIds.length > 0 || formData.productIds.length > 0) && (
              <div className="space-y-4">
                <Label>Products that will use this shade</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                  {(() => {
                    const categoryProducts = getFilteredProducts(formData.categoryIds, formData.subcategoryIds);
                    const individualProducts = products.filter(p => formData.productIds.includes(p.id));
                    const allProducts = [...categoryProducts, ...individualProducts.filter(p => !categoryProducts.some(cp => cp.id === p.id))];

                    return allProducts.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {allProducts.slice(0, 8).map(product => (
                          <div key={product.id} className="flex items-center space-x-3 p-2 bg-white rounded border">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-gray-500">
                                {product.category} • ₹{product.price}
                                {formData.productIds.includes(product.id) && (
                                  <span className="ml-2 text-blue-600">• Individual</span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                        {allProducts.length > 8 && (
                          <p className="text-sm text-gray-500 text-center">...and {allProducts.length - 8} more products ({allProducts.length} total)</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No products selected</p>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
              />
              <Label htmlFor="edit-active" className="text-sm">Active</Label>
            </div>

            {/* Show currently saved products for this shade */}
            {selectedShade && (
              <div className="space-y-2">
                <Label>Currently Associated Products ({getShadeProducts(selectedShade).length})</Label>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-3 bg-blue-50">
                  {getShadeProducts(selectedShade).length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {getShadeProducts(selectedShade).slice(0, 5).map(product => (
                        <div key={product.id} className="flex items-center space-x-2 text-sm">
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                          <span className="flex-1">{product.name}</span>
                          <span className="text-gray-500">₹{product.price}</span>
                        </div>
                      ))}
                      {getShadeProducts(selectedShade).length > 5 && (
                        <p className="text-sm text-gray-500">...and {getShadeProducts(selectedShade).length - 5} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No products currently associated</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleSubmit(true)} 
              disabled={updateShadeMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateShadeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Shade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Shade
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete this shade?
            </DialogDescription>
          </DialogHeader>
          {selectedShade && (
            <div>
              <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: selectedShade.colorCode }}
                ></div>
                <div>
                  <p className="font-medium text-slate-900">{selectedShade.name}</p>
                  <p className="text-sm text-slate-600">{selectedShade.colorCode}</p>
                </div>
              </div>

              {getShadeProducts(selectedShade).length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ This shade is used by {getShadeProducts(selectedShade).length} product(s). 
                    Consider updating those products before deleting this shade.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedShade && deleteShadeMutation.mutate(selectedShade.id)}
              disabled={deleteShadeMutation.isPending}
            >
              {deleteShadeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Shade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}