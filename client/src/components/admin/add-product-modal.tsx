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
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface AddProductModalProps {
  onAddProduct: (product: any) => void;
}

export default function AddProductModal({ onAddProduct }: AddProductModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch categories and subcategories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ['/api/subcategories'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: shades = [] } = useQuery({
    queryKey: ['/api/admin/shades'], // Assuming /api/admin/shades is the correct endpoint for admin shades
    staleTime: 5 * 60 * 1000,
  });

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subcategory: '',
    price: '',
    originalPrice: '',
    discount: '',
    description: '',
    shortDescription: '',
    rating: '4.0',
    reviewCount: '0',
    inStock: true,
    featured: false,
    bestseller: false,
    newLaunch: false,
    size: '',
    ingredients: '',
    benefits: '',
    howToUse: '',
    tags: '',
    shadeIds: [] as number[] // Added to store selected shade IDs
  });

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);


  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) {
      return ['https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400'];
    }

    setIsUploadingImages(true);
    try {
      const uploadPromises = selectedImages.map(async (image, index) => {
        const formData = new FormData();
        formData.append('image', image);

        console.log(`Uploading image ${index + 1}/${selectedImages.length}:`, image.name);

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to upload image ${image.name}:`, errorText);
          throw new Error(`Failed to upload image ${image.name}: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Image uploaded successfully:`, data.imageUrl);
        return data.imageUrl;
      });

      const imageUrls = await Promise.all(uploadPromises);
      console.log('All images uploaded:', imageUrls);
      return imageUrls;
    } catch (error) {
      console.error('Image upload error:', error);
      alert(`Image upload failed: ${error.message}`);
      return ['https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400'];
    } finally {
      setIsUploadingImages(false);
    }
  };

  const uploadVideo = async (): Promise<string | null> => {
    if (!selectedVideo) {
      return null;
    }

    setIsUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('video', selectedVideo);

      console.log('Uploading video:', selectedVideo.name);

      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to upload video ${selectedVideo.name}:`, errorText);
        throw new Error(`Failed to upload video ${selectedVideo.name}: ${response.status}`);
      }

      const data = await response.json();
      console.log('Video uploaded successfully:', data.videoUrl);
      return data.videoUrl;
    } catch (error) {
      console.error('Video upload error:', error);
      alert(`Video upload failed: ${error.message}`);
      return null;
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (loading || isUploadingImages || isUploadingVideo) return;

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

      // Upload images first
      console.log('Starting image upload process...');
      const imageUrls = await uploadImages();
      console.log('Images uploaded, URLs:', imageUrls);

      // Upload video if selected
      let videoUrl: string | null = null;
      if (selectedVideo) {
        console.log('Starting video upload process...');
        videoUrl = await uploadVideo();
        if (!videoUrl) {
          console.warn('Video upload failed, continuing without video');
          // Don't stop the process, just continue without video
        } else {
          console.log('Video uploaded, URL:', videoUrl);
        }
      }

      // Generate slug from product name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Find the category name from the category ID
      const selectedCategory = categories?.find((cat: any) => cat.id === parseInt(formData.category));
      const categoryName = selectedCategory ? selectedCategory.name : formData.category;

      const newProduct = {
        name: formData.name,
        slug: slug,
        category: categoryName, // Use the category name, not the ID
        subcategory: formData.subcategory || null,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        discount: formData.discount ? parseFloat(formData.discount) : null,
        cashbackPercentage: null, // Default to null
        cashbackPrice: null, // Default to null
        description: formData.description,
        shortDescription: formData.shortDescription || formData.description.substring(0, 100),
        rating: parseFloat(formData.rating),
        reviewCount: parseInt(formData.reviewCount),
        inStock: formData.inStock,
        featured: formData.featured,
        bestseller: formData.bestseller,
        newLaunch: formData.newLaunch,
        size: formData.size || null,
        ingredients: formData.ingredients || null,
        benefits: formData.benefits || null,
        howToUse: formData.howToUse || null,
        tags: formData.tags || null,
        imageUrl: imageUrls[0], // Primary thumbnail image
        images: imageUrls, // All uploaded images
        videoUrl: videoUrl || null, // Uploaded video URL (null if not uploaded)
        shadeIds: formData.shadeIds // Include selected shade IDs
      };

      console.log('Product data with video:', { ...newProduct, videoUrl });

      console.log('Product data to be sent:', newProduct);

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
      if (formData.shadeIds.length > 0) {
        try {
          await fetch(`/api/admin/products/${createdProduct.id}/shades`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ shadeIds: formData.shadeIds }),
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
      toast({
        title: 'Product Created',
        description: 'The new product has been added successfully.',
      });
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
      originalPrice: '',
      discount: '',
      description: '',
      shortDescription: '',
      rating: '4.0',
      reviewCount: '0',
      inStock: true,
      featured: false,
      bestseller: false,
      newLaunch: false,
      size: '',
      ingredients: '',
      benefits: '',
      howToUse: '',
      tags: '',
      shadeIds: []
    });
    setSelectedImages([]);
    setImagePreviews([]);
    setSelectedVideo(null);
    setVideoPreview('');
  };

  const handleInputChange = (field: string, value: string | boolean | number[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const validFiles = files.filter(file => {
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit

        if (!isValidType) {
          alert(`${file.name} is not a valid image file`);
          return false;
        }
        if (!isValidSize) {
          alert(`${file.name} is too large (max 5MB)`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        event.target.value = '';
        return;
      }

      // Create a batch to update both states together
      const previewPromises = validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(previewPromises).then(previews => {
        // Update both states in a single batch to prevent duplicates
        setSelectedImages(prev => [...prev, ...validFiles]);
        setImagePreviews(prev => [...prev, ...previews]);
        
        console.log(`Total images after update: ${selectedImages.length + validFiles.length}`);
        console.log(`Total previews after update: ${imagePreviews.length + previews.length}`);
      });
    }
    
    // Reset input value to allow selecting same file again if needed
    event.target.value = '';
  };

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const file = files[0];
      const isValidType = file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit

      if (!isValidType) {
        alert(`${file.name} is not a valid video file`);
        return;
      }
      if (!isValidSize) {
        alert(`${file.name} is too large (max 50MB)`);
        return;
      }

      setSelectedVideo(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setVideoPreview(e.target?.result as string);
        console.log('Video preview generated');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
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
            Create a new product for your Beauty, Lifestyle & Wellness store inventory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Images Upload */}
          <div className="space-y-2">
            <Label>Product Images</Label>
            <div className="space-y-3">
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Product preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {index === 0 && (
                        <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                          Primary
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="images-upload"
                  />
                  <Label
                    htmlFor="images-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload multiple images</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB each</p>
                  </Label>
                  {selectedImages.length > 0 && (
                    <p className="text-sm text-green-600 mt-2">Selected: {selectedImages.length} images</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Product Video Upload */}
          <div className="space-y-2">
            <Label>Product Video (Optional)</Label>
            {videoPreview && (
              <div className="relative">
                <video src={videoPreview} className="w-full h-48 object-cover rounded" controls />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => { setSelectedVideo(null); setVideoPreview(''); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
                id="video-upload"
              />
              <Label
                htmlFor="video-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Click to upload video</p>
                <p className="text-xs text-gray-500 mt-1">MP4, WebM up to 50MB</p>
              </Label>
              {selectedVideo && (
                <p className="text-sm text-green-600 mt-2">Selected video: {selectedVideo.name}</p>
              )}
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
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  handleInputChange('category', value);
                  handleInputChange('subcategory', ''); // Reset subcategory when category changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length > 0 ? (
                    categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-categories" disabled>
                      No categories available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Select
                value={formData.subcategory}
                onValueChange={(value) => handleInputChange('subcategory', value)}
                disabled={!formData.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.category ? "Select subcategory" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {formData.category ? (
                    subcategories
                      .filter((sub: any) => sub.categoryId.toString() === formData.category)
                      .length > 0 ? (
                        subcategories
                          .filter((sub: any) => sub.categoryId.toString() === formData.category)
                          .map((subcategory: any) => (
                            <SelectItem key={subcategory.id} value={subcategory.name}>
                              {subcategory.name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="no-subcategories" disabled>
                          No subcategories available
                        </SelectItem>
                      )
                  ) : (
                    <SelectItem value="select-category" disabled>
                      Select category first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price and Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="originalPrice">Original Price (₹)</Label>
              <Input
                id="originalPrice"
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => {
                  handleInputChange('originalPrice', e.target.value);
                  // Auto-calculate discount if price is set
                  if (formData.price && e.target.value) {
                    const discount = ((parseFloat(e.target.value) - parseFloat(formData.price)) / parseFloat(e.target.value) * 100).toFixed(2);
                    handleInputChange('discount', discount);
                  }
                }}
                placeholder="599"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={formData.discount}
                onChange={(e) => {
                  handleInputChange('discount', e.target.value);
                  // Auto-calculate sale price if original price is set
                  if (formData.originalPrice && e.target.value) {
                    const salePrice = (parseFloat(formData.originalPrice) * (1 - parseFloat(e.target.value) / 100)).toFixed(2);
                    handleInputChange('price', salePrice);
                  }
                }}
                placeholder="e.g., 20"
              />
              <p className="text-xs text-gray-500">Enter discount percentage to calculate sale price</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Sale Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="Auto-calculated from discount"
                disabled
                required
              />
              <p className="text-xs text-gray-500">Auto-calculated from original price and discount</p>
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
          <div className="space-y-2">
            <Label>Product Shades (Optional)</Label>
            <p className="text-sm text-gray-500">Select shades available for this product</p>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {shades && shades.length > 0 ? (
                shades.map((shade: any) => (
                  <div key={shade.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      id={`shade-${shade.id}`}
                      checked={formData.shadeIds?.includes(shade.id) || false}
                      onCheckedChange={(checked) => {
                        handleInputChange('shadeIds', checked
                          ? [...(formData.shadeIds || []), shade.id]
                          : (formData.shadeIds || []).filter(id => id !== shade.id)
                        );
                      }}
                    />
                    <Label
                      htmlFor={`shade-${shade.id}`}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: shade.colorCode }}
                      />
                      <span>{shade.name}</span>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No shades available. Create shades in the Shades section first.</p>
              )}
            </div>
          </div>

          {/* Product Flags */}
          <div className="space-y-4">
            <Label>Product Status & Features</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-inStock"
                  checked={formData.inStock}
                  onCheckedChange={(checked) => handleInputChange('inStock', checked === true)}
                />
                <Label htmlFor="add-inStock" className="text-sm cursor-pointer select-none">In Stock</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-bestseller"
                  checked={formData.bestseller}
                  onCheckedChange={(checked) => handleInputChange('bestseller', checked === true)}
                />
                <Label htmlFor="add-bestseller" className="text-sm cursor-pointer select-none">Bestseller</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-newLaunch"
                  checked={formData.newLaunch}
                  onCheckedChange={(checked) => handleInputChange('newLaunch', checked === true)}
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploadingImages || loading || isUploadingVideo}
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingImages ? 'Uploading Images...' : isUploadingVideo ? 'Uploading Video...' : loading ? 'Creating Product...' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}