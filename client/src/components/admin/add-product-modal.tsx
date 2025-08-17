import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Upload, X } from "lucide-react";
import { Product } from "@/lib/types";

interface AddProductModalProps {
  onAddProduct: (product: any) => void;
}

export default function AddProductModal({ onAddProduct }: AddProductModalProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [shades, setShades] = useState<any[]>([]);
  const [selectedShades, setSelectedShades] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subcategory: '',
    price: '',
    description: '',
    shortDescription: '',
    rating: '4.0',
    reviewCount: '0',
    inStock: true,
    featured: false,
    bestseller: false,
    newLaunch: false,
    saleOffer: '',
    size: '',
    ingredients: '',
    benefits: '',
    howToUse: '',
    tags: ''
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const uploadImage = async (): Promise<string> => {
    if (!selectedImage) return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400';

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Failed to upload image: ${response.status}`);
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400';
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (loading) return;

    // Client-side validation
    if (!formData.name.trim()) {
      alert('Product name is required');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      alert('Valid price is required');
      return;
    }

    if (!formData.category) {
      alert('Category is required');
      return;
    }

    if (!formData.description.trim()) {
      alert('Description is required');
      return;
    }

    try {
      setLoading(true);

      // Upload image first
      const imageUrl = await uploadImage();

      // Generate slug from product name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const selectedCategory = categories.find(cat => cat.id === parseInt(formData.category));
      const newProduct = {
        name: formData.name,
        slug: slug,
        category: selectedCategory?.name || formData.category,
        subcategory: formData.subcategory || null,
        price: parseFloat(formData.price),
        description: formData.description,
        shortDescription: formData.shortDescription,
        rating: parseFloat(formData.rating),
        reviewCount: parseInt(formData.reviewCount),
        inStock: formData.inStock,
        featured: formData.featured,
        bestseller: formData.bestseller,
        newLaunch: formData.newLaunch,
        saleOffer: formData.saleOffer || null,
        size: formData.size || null,
        ingredients: formData.ingredients || null,
        benefits: formData.benefits || null,
        howToUse: formData.howToUse || null,
        tags: formData.tags || null,
        imageUrl: imageUrl
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const responseText = await response.text();
          console.log('Raw response:', responseText);

          // Try to parse as JSON
          const errorData = JSON.parse(responseText);
          errorMessage = errorData?.error || errorData?.details || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server returned non-JSON response (${response.status})`;
        }

        console.error('Product creation failed:', errorMessage);
        alert(`Failed to create product: ${errorMessage}`);
        return;
      }

      const createdProduct = await response.json();

      // Assign selected shades to the product
      if (selectedShades.length > 0) {
        try {
          await fetch(`/api/admin/products/${createdProduct.id}/shades`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ shadeIds: selectedShades }),
          });
        } catch (shadeError) {
          console.error('Error assigning shades:', shadeError);
          // Product is created, but shade assignment failed
          alert('Product created successfully, but failed to assign shades. You can assign them later.');
        }
      }

      // Call onAddProduct to update the parent component's state
      await onAddProduct(createdProduct);

      // Close modal and reset form
      setOpen(false);
      resetForm();
      alert('Product created successfully!');
    } catch (error) {
      console.error('Error creating product:', error);
      alert(`Failed to create product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      subcategory: '',
      price: '',
      description: '',
      shortDescription: '',
      rating: '4.0',
      reviewCount: '0',
      inStock: true,
      featured: false,
      bestseller: false,
      newLaunch: false,
      saleOffer: '',
      size: '',
      ingredients: '',
      benefits: '',
      howToUse: '',
      tags: ''
    });
    setSelectedImage(null);
    setImagePreview('');
    setSelectedShades([]);
  };

  // Fetch categories, subcategories, and shades when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, subcategoriesRes, shadesRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/subcategories'),
          fetch('/api/admin/shades')
        ]);

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }

        if (subcategoriesRes.ok) {
          const subcategoriesData = await subcategoriesRes.json();
          setSubcategories(subcategoriesData);
        }

        if (shadesRes.ok) {
          const shadesData = await shadesRes.json();
          setShades(shadesData.filter((shade: any) => shade.isActive));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  // Get subcategories for selected category
  const getSubcategoriesForCategory = (categoryId: string) => {
    if (!categoryId) return [];

    return subcategories.filter(sub => sub.categoryId === parseInt(categoryId));
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      setOpen(open);
      if (!open) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
          <Plus className="mr-2 h-4 w-4" />
          Add New Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product for your beauty store inventory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Image Upload */}
          <div className="space-y-2">
            <Label>Product Image</Label>
            <div className="space-y-3">
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview('');
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                  </Label>
                  {selectedImage && (
                    <p className="text-sm text-green-600 mt-2">Selected: {selectedImage.name}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Moisturizing Face Cream"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => {
                handleInputChange('category', value);
                handleInputChange('subcategory', ''); // Reset subcategory when category changes
              }} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Select value={formData.subcategory} onValueChange={(value) => handleInputChange('subcategory', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {getSubcategoriesForCategory(formData.category).map((sub) => (
                    <SelectItem key={sub.id} value={sub.name || `subcategory-${sub.id}`}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price and Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="29.99"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Rating</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', e.target.value)}
                placeholder="4.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewCount">Review Count</Label>
              <Input
                id="reviewCount"
                type="number"
                value={formData.reviewCount}
                onChange={(e) => handleInputChange('reviewCount', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
                placeholder="e.g., 50ml"
              />
            </div>
          </div>

          {/* Product Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="organic, cruelty-free, vegan"
            />
          </div>

          {/* Shade Selection */}
          

          {/* Product Flags */}
          <div className="space-y-4">
            <Label>Product Status & Features</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-inStock"
                  checked={formData.inStock}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inStock: checked === true }))}
                />
                <Label htmlFor="add-inStock" className="text-sm cursor-pointer select-none">In Stock</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked === true }))}
                />
                <Label htmlFor="add-featured" className="text-sm cursor-pointer select-none">Featured</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-bestseller"
                  checked={formData.bestseller}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bestseller: checked === true }))}
                />
                <Label htmlFor="add-bestseller" className="text-sm cursor-pointer select-none">Bestseller</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-newLaunch"
                  checked={formData.newLaunch}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, newLaunch: checked === true }))}
                />
                <Label htmlFor="add-newLaunch" className="text-sm cursor-pointer select-none">New Launch</Label>
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                placeholder="Brief product description for listings"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Full Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed product description..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredients</Label>
              <Textarea
                id="ingredients"
                value={formData.ingredients}
                onChange={(e) => handleInputChange('ingredients', e.target.value)}
                placeholder="List of ingredients..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => handleInputChange('benefits', e.target.value)}
                placeholder="Product benefits..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="howToUse">How to Use</Label>
              <Textarea
                id="howToUse"
                value={formData.howToUse}
                onChange={(e) => handleInputChange('howToUse', e.target.value)}
                placeholder="Usage instructions..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="saleOffer">Sale Offer</Label>
              <Input
                id="saleOffer"
                value={formData.saleOffer}
                onChange={(e) => handleInputChange('saleOffer', e.target.value)}
                placeholder="e.g., 20% off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUploadingImage || loading}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingImage ? 'Uploading Image...' : loading ? 'Creating Product...' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
