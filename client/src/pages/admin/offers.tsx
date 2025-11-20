import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, ImageIcon, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Offer {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  bannerImageUrl?: string; // Added bannerImageUrl
  price?: number;
  originalPrice?: number;
  discountType?: 'percentage' | 'flat' | 'none';
  discountValue?: number;
  discountText?: string;
  cashbackPercentage?: number;
  cashbackPrice?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  sortOrder: number;
  linkUrl?: string;
  buttonText?: string;
  productIds?: number[];
  detailedDescription?: string; // Added detailedDescription
  productsIncluded?: string; // Added productsIncluded
  benefits?: string; // Added benefits
  additionalImageUrls?: string[]; // To store URLs of additional images
  videoUrl?: string; // To store URL of the video
}

export default function AdminOffers() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null); // State for banner image
  const [imagePreview, setImagePreview] = useState<string>("");
  const [bannerImagePreview, setBannerImagePreview] = useState<string>(""); // Preview for banner image
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all products for selection
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    bannerImageUrl: "", // Added bannerImageUrl to form state
    price: "",
    originalPrice: "",
    discountType: 'none' as 'percentage' | 'flat' | 'none',
    discountValue: undefined as number | undefined,
    discountText: "",
    cashbackPercentage: "",
    cashbackPrice: "",
    validFrom: "",
    validUntil: "",
    isActive: true,
    sortOrder: 0,
    linkUrl: "",
    buttonText: 'Shop Now',
    productIds: [] as number[],
    detailedDescription: "", // Added detailedDescription
    productsIncluded: "", // Added productsIncluded
    benefits: "", // Added benefits
  });

  // Fetch offers with proper authorization
  const { data: offers, isLoading, error } = useQuery<Offer[]>({
    queryKey: ['/api/admin/offers'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      console.log('🔑 Fetching offers with token:', token ? 'Present' : 'Missing');

      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please login to continue",
          variant: "destructive",
        });
        window.location.href = '/admin/auth/admin-login';
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/offers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Offers API response status:', response.status);

      if (response.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please login again",
          variant: "destructive",
        });
        localStorage.removeItem('token');
        window.location.href = '/admin/auth/admin-login';
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Offers fetch error:', errorData);
        // Return empty array instead of throwing to prevent UI breakage
        return [];
      }

      const data = await response.json();
      console.log('✅ Offers fetched successfully:', data);
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
    enabled: !!localStorage.getItem('token'),
    retry: 1,
    staleTime: 30000
  });

  // Show error toast if fetch fails
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading Offers",
        description: error instanceof Error ? error.message : "Failed to load offers",
        variant: "destructive",
      });
    }
  }, [error]);

  const offersList = Array.isArray(offers) ? offers : [];

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please login again",
            variant: "destructive",
          });
          window.location.href = '/admin/auth/admin-login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create offer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/offers'] });
      toast({ title: "Success", description: "Offer created successfully" });
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update offer mutation
  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/offers/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please login again",
            variant: "destructive",
          });
          window.location.href = '/admin/auth/admin-login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update offer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/offers'] });
      toast({ title: "Success", description: "Offer updated successfully" });
      resetForm();
      setEditingOffer(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/offers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please login again",
            variant: "destructive",
          });
          window.location.href = '/admin/auth/admin-login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete offer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/offers'] });
      toast({ title: "Success", description: "Offer deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAdditionalImages(prev => [...prev, ...files]);

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAdditionalImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.description || !formData.validFrom || !formData.validUntil) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!imageFile && !formData.imageUrl) {
      toast({
        title: "Error",
        description: "Please select a main image",
        variant: "destructive"
      });
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid offer price",
        variant: "destructive"
      });
      return;
    }

    if (formData.discountType !== 'none' && (!formData.discountValue || formData.discountValue <= 0)) {
      toast({
        title: "Error",
        description: "Please enter a valid discount value",
        variant: "destructive"
      });
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('detailedDescription', formData.detailedDescription || ''); // Append new field
    formDataToSend.append('productsIncluded', formData.productsIncluded || ''); // Append new field
    formDataToSend.append('benefits', formData.benefits || ''); // Append new field
    formDataToSend.append('price', formData.price);
    formDataToSend.append('originalPrice', formData.originalPrice || formData.price);
    formDataToSend.append('discountType', formData.discountType);
    formDataToSend.append('discountValue', formData.discountValue?.toString() || '0');
    formDataToSend.append('discountText', formData.discountText || '');
    formDataToSend.append('cashbackPercentage', formData.cashbackPercentage || '0');
    formDataToSend.append('cashbackPrice', formData.cashbackPrice || '0');
    formDataToSend.append('validFrom', formData.validFrom);
    formDataToSend.append('validUntil', formData.validUntil);
    formDataToSend.append('isActive', String(formData.isActive));
    formDataToSend.append('sortOrder', String(formData.sortOrder));
    formDataToSend.append('linkUrl', formData.linkUrl || '');
    formDataToSend.append('buttonText', formData.buttonText || 'Shop Now');
    formDataToSend.append('productIds', JSON.stringify(formData.productIds || []));

    if (imageFile) {
      formDataToSend.append('image', imageFile);
    } else if (formData.imageUrl) {
      formDataToSend.append('imageUrl', formData.imageUrl); // Ensure existing imageUrl is sent if no new image
    }

    if (bannerImageFile) {
      formDataToSend.append('bannerImage', bannerImageFile);
    } else if (formData.bannerImageUrl) {
      formDataToSend.append('bannerImageUrl', formData.bannerImageUrl); // Ensure existing bannerImageUrl is sent if no new image
    }

    // Add additional images
    additionalImages.forEach((file, index) => {
      formDataToSend.append(`additionalImages`, file);
    });

    // Add video if present
    if (videoFile) {
      formDataToSend.append('video', videoFile);
    }


    if (editingOffer) {
      updateOfferMutation.mutate({ id: editingOffer.id, data: formDataToSend });
    } else {
      createOfferMutation.mutate(formDataToSend);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      bannerImageUrl: "", // Reset bannerImageUrl
      price: "",
      originalPrice: "",
      discountType: "none",
      discountValue: undefined,
      discountText: "",
      cashbackPercentage: "",
      cashbackPrice: "",
      validFrom: "",
      validUntil: "",
      isActive: true,
      sortOrder: 0,
      linkUrl: "",
      buttonText: "Shop Now",
      productIds: [],
      detailedDescription: "", // Reset new field
      productsIncluded: "", // Reset new field
      benefits: "", // Reset new field
    });
    setImageFile(null);
    setImagePreview("");
    setBannerImageFile(null); // Reset banner image state
    setBannerImagePreview(""); // Reset banner image preview
    setAdditionalImages([]); // Reset additional images state
    setAdditionalImagePreviews([]); // Reset additional image previews
    setVideoFile(null); // Reset video file state
    setVideoPreview(''); // Reset video preview
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);

    // Ensure productIds is always an array
    let offerProductIds: number[] = [];
    if (offer.productIds) {
      if (Array.isArray(offer.productIds)) {
        offerProductIds = offer.productIds;
      } else if (typeof offer.productIds === 'string') {
        try {
          // Assuming productIds might be stored as a stringified array in some cases
          offerProductIds = JSON.parse(offer.productIds);
        } catch (e) {
          console.error('Error parsing productIds:', e);
          offerProductIds = [];
        }
      }
      // Ensure all elements are numbers
      offerProductIds = offerProductIds.map(id => Number(id)).filter(id => !isNaN(id));
    }

    // Format dates properly for input fields (YYYY-MM-DD)
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };

    setFormData({
      title: offer.title,
      description: offer.description,
      imageUrl: offer.imageUrl,
      bannerImageUrl: offer.bannerImageUrl || "", // Set bannerImageUrl from offer
      price: offer.price ? String(offer.price) : "",
      originalPrice: offer.originalPrice ? String(offer.originalPrice) : "",
      discountType: offer.discountType || "none",
      discountValue: offer.discountValue,
      discountText: offer.discountText || "",
      cashbackPercentage: offer.cashbackPercentage ? String(offer.cashbackPercentage) : "",
      cashbackPrice: offer.cashbackPrice ? String(offer.cashbackPrice) : "",
      validFrom: formatDateForInput(offer.validFrom),
      validUntil: formatDateForInput(offer.validUntil),
      isActive: offer.isActive,
      sortOrder: offer.sortOrder,
      linkUrl: offer.linkUrl || "",
      buttonText: offer.buttonText || "Shop Now",
      productIds: offerProductIds,
      detailedDescription: offer.detailedDescription || "", // Set new field
      productsIncluded: offer.productsIncluded || "", // Set new field
      benefits: offer.benefits || "", // Set new field
    });
    setImagePreview(offer.imageUrl);
    setBannerImagePreview(offer.bannerImageUrl || ""); // Set banner image preview
    // Note: For editing existing offers, we don't load additional images or videos directly into the form state here.
    // The backend should handle associating existing additional images/videos with the offer and the frontend
    // would need a mechanism to display/manage them if they were fetched.
    // For simplicity in this example, we focus on upload for new/updated offers.
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      deleteOfferMutation.mutate(id);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Offers Management</h2>
          <p className="text-slate-600 mt-1">Manage promotional offers and discounts</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingOffer(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-pink-500 to-rose-500">
              <Plus className="h-4 w-4 mr-2" />
              Create Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOffer ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
              <DialogDescription>
                {editingOffer ? 'Update offer details' : 'Add a new promotional offer'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Short Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Brief offer description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              {/* Detailed Description */}
              <div className="space-y-2">
                <Label htmlFor="detailedDescription">Detailed Description (for Description tab)</Label>
                <Textarea
                  id="detailedDescription"
                  placeholder="Complete offer details..."
                  rows={5}
                  value={formData.detailedDescription || ''}
                  onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                />
              </div>

              {/* Products Included */}
              <div className="space-y-2">
                <Label htmlFor="productsIncluded">Products Included (for Products tab)</Label>
                <Textarea
                  id="productsIncluded"
                  placeholder="List all products included in this offer..."
                  rows={5}
                  value={formData.productsIncluded || ''}
                  onChange={(e) => setFormData({ ...formData, productsIncluded: e.target.value })}
                />
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <Label htmlFor="benefits">Key Benefits (for Benefits tab)</Label>
                <Textarea
                  id="benefits"
                  placeholder="List the key benefits of this offer..."
                  rows={5}
                  value={formData.benefits || ''}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                />
              </div>

              {/* Main Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image">Main Offer Image *</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img src={imagePreview} alt="Main Image Preview" className="w-full h-48 object-cover rounded-lg" />
                  </div>
                )}
              </div>

              {/* Listing Page Banner Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="bannerImage">Listing Page Banner Image (Optional)</Label>
                <Input
                  id="bannerImage"
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageChange}
                />
                {bannerImagePreview && (
                  <div className="mt-2">
                    <img src={bannerImagePreview} alt="Banner Image Preview" className="w-full h-48 object-cover rounded-lg" />
                  </div>
                )}
                <p className="text-xs text-slate-500">Banner for offers listing page only (recommended: 1920x400px)</p>
              </div>

              {/* Additional Images Upload */}
              <div className="space-y-2">
                <Label htmlFor="additionalImages">Additional Detail Page Images</Label>
                <Input
                  id="additionalImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalImagesChange}
                />
                {additionalImagePreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {additionalImagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt={`Additional ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeAdditionalImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500">Multiple images for offer detail page gallery</p>
              </div>

              {/* Video Upload */}
              <div className="space-y-2">
                <Label htmlFor="video">Offer Video (Optional)</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                />
                {videoPreview && (
                  <div className="mt-2">
                    <video src={videoPreview} controls className="w-full h-48 rounded-lg" />
                  </div>
                )}
                {editingOffer && offerData.videoUrl && !videoPreview && (
                  <div className="mt-2">
                    <p className="text-sm text-slate-600 mb-1">Current video:</p>
                    <video src={offerData.videoUrl} controls className="w-full h-48 rounded-lg" />
                  </div>
                )}
                <p className="text-xs text-slate-500">Video for offer detail page gallery</p>
              </div>

              {/* Price Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Offer Price (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 999"
                    value={formData.price}
                    onChange={(e) => {
                      const offerPrice = e.target.value;
                      setFormData(prev => ({ ...prev, price: offerPrice }));

                      // Auto-calculate discount if original price is set
                      if (formData.originalPrice && offerPrice) {
                        const original = parseFloat(formData.originalPrice);
                        const offer = parseFloat(offerPrice);
                        if (original > offer) {
                          const discountPercent = (((original - offer) / original) * 100).toFixed(2);
                          setFormData(prev => ({
                            ...prev,
                            price: offerPrice,
                            discountType: 'percentage',
                            discountValue: parseFloat(discountPercent)
                          }));
                        }
                      }

                      // Auto-calculate cashback if percentage is set
                      if (formData.cashbackPercentage && offerPrice) {
                        const cashback = (parseFloat(offerPrice) * parseFloat(formData.cashbackPercentage) / 100).toFixed(2);
                        setFormData(prev => ({ ...prev, cashbackPrice: cashback }));
                      }
                    }}
                    required
                  />
                  <p className="text-xs text-gray-500">Final price after all discounts</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Original Price (₹)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 1499"
                    value={formData.originalPrice}
                    onChange={(e) => {
                      const originalPrice = e.target.value;
                      setFormData(prev => ({ ...prev, originalPrice: originalPrice }));

                      // Auto-calculate discount if offer price is set
                      if (formData.price && originalPrice) {
                        const original = parseFloat(originalPrice);
                        const offer = parseFloat(formData.price);
                        if (original > offer) {
                          const discountPercent = (((original - offer) / original) * 100).toFixed(2);
                          setFormData(prev => ({
                            ...prev,
                            originalPrice: originalPrice,
                            discountType: 'percentage',
                            discountValue: parseFloat(discountPercent)
                          }));
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500">Price before discount (optional)</p>
                </div>
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discountType">Discount Type *</Label>
                  <select
                    id="discountType"
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.discountType || 'none'}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'flat' | 'none' })}
                  >
                    <option value="none">No Discount</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountValue">
                    Discount Value {formData.discountType !== 'none' && '*'}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.discountType === 'percentage' ? '100' : undefined}
                    placeholder={formData.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 300'}
                    value={formData.discountValue?.toString() || ''}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                    disabled={formData.discountType === 'none'}
                    required={formData.discountType !== 'none'}
                  />
                </div>
              </div>

              {/* Discount Text (Display Text) */}
              <div className="space-y-2">
                <Label htmlFor="discountText">Discount Display Text</Label>
                <Input
                  id="discountText"
                  placeholder="e.g., UPTO 50% OFF, FLAT ₹500 OFF"
                  value={formData.discountText || ''}
                  onChange={(e) => setFormData({ ...formData, discountText: e.target.value })}
                />
              </div>

              {/* Cashback Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cashbackPercentage">Cashback (%)</Label>
                  <Input
                    id="cashbackPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g., 5"
                    value={formData.cashbackPercentage}
                    onChange={(e) => {
                      setFormData({ ...formData, cashbackPercentage: e.target.value });
                      // Auto-calculate cashback amount
                      if (formData.price && e.target.value) {
                        const cashback = (parseFloat(formData.price) * parseFloat(e.target.value) / 100).toFixed(2);
                        setFormData(prev => ({ ...prev, cashbackPrice: cashback }));
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500">Cashback percentage on offer price</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cashbackPrice">Cashback Amount (₹)</Label>
                  <Input
                    id="cashbackPrice"
                    type="number"
                    step="0.01"
                    value={formData.cashbackPrice}
                    placeholder="Auto-calculated"
                    className="bg-gray-50"
                    readOnly
                  />
                  <p className="text-xs text-gray-500">Auto-calculated from cashback %</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Valid From *</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until *</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Select Products (Multi-select) */}
              <div className="space-y-3">
                <Label>Select Products (Optional)</Label>

                {/* Selected Products Display */}
                {formData.productIds && formData.productIds.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-purple-900 mb-2">
                      Selected Products ({formData.productIds.length})
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {formData.productIds.map((productId) => {
                        const product = products?.find((p: any) => p.id === productId);
                        return product ? (
                          <div key={productId} className="flex items-center gap-2 bg-white rounded p-2 shadow-sm">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover border"
                            />
                            <span className="text-sm font-medium text-gray-800 flex-1">
                              {product.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  productIds: formData.productIds?.filter(id => id !== productId) || []
                                });
                              }}
                              className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                            >
                              Remove
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Product Selection List */}
                <div className="border rounded-md p-3 max-h-64 overflow-y-auto bg-gray-50">
                  {products && products.length > 0 ? (
                    <div className="space-y-2">
                      {products.map((product: any) => {
                        const isSelected = formData.productIds?.includes(product.id) || false;
                        return (
                          <label
                            key={product.id}
                            htmlFor={`product-${product.id}`}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-white ${
                              isSelected ? 'bg-purple-100 border-2 border-purple-400' : 'bg-white border border-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              id={`product-${product.id}`}
                              checked={isSelected}
                              onChange={(e) => {
                                const currentIds = formData.productIds || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, productIds: [...currentIds, product.id] });
                                } else {
                                  setFormData({ ...formData, productIds: currentIds.filter(id => id !== product.id) });
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 rounded object-cover border"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{product.name}</p>
                              <p className="text-xs text-gray-500">
                                {product.category} • ₹{product.price}
                              </p>
                            </div>
                            {isSelected && (
                              <Badge className="bg-purple-600">Selected</Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No products available</p>
                  )}
                </div>
              </div>

              {/* Button Text & Link URL */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buttonText">Button Text</Label>
                  <Input
                    id="buttonText"
                    placeholder="e.g., Shop Now, Add to Cart"
                    value={formData.buttonText || 'Shop Now'}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkUrl">External Link URL (Optional)</Label>
                  <Input
                    id="linkUrl"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.linkUrl || ''}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  />
                </div>
              </div>

              {/* Active Status & Sort Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Is Active</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.sortOrder.toString()}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                    setEditingOffer(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-pink-500 to-rose-500">
                  {editingOffer ? 'Update Offer' : 'Create Offer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Offers</CardTitle>
          <CardDescription>Manage promotional offers and discounts</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : offersList.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No offers found. Create your first offer!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Cashback</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offersList.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <img
                        src={offer.imageUrl}
                        alt={offer.title}
                        className="w-20 h-20 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{offer.title}</div>
                        <div className="text-xs text-slate-500">{offer.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">₹{offer.price || 0}</div>
                      {offer.originalPrice && offer.originalPrice > (offer.price || 0) && (
                        <div className="text-xs text-slate-500 line-through">₹{offer.originalPrice}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {offer.discountType === 'percentage' && offer.discountValue && (
                        <Badge variant="secondary">{offer.discountValue}% OFF</Badge>
                      )}
                      {offer.discountType === 'flat' && offer.discountValue && (
                        <Badge variant="secondary">₹{offer.discountValue} OFF</Badge>
                      )}
                      {offer.discountType === 'none' && (
                        <Badge variant="outline">No Discount</Badge>
                      )}
                      {offer.discountText && (
                        <div className="text-xs text-slate-600 mt-1">{offer.discountText}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {offer.cashbackPercentage && offer.cashbackPercentage > 0 ? (
                        <div>
                          <Badge className="bg-orange-500">{offer.cashbackPercentage}%</Badge>
                          <div className="text-xs text-slate-600 mt-1">₹{offer.cashbackPrice || 0}</div>
                        </div>
                      ) : (
                        <Badge variant="outline">No Cashback</Badge>
                      )}
                    </TableCell>
                    <TableCell> {/* Products cell */}
                      {offer.productIds && offer.productIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {offer.productIds.slice(0, 2).map((productId: number) => {
                            const product = products?.find((p: any) => p.id === productId);
                            return (
                              <Badge key={productId} variant="outline" className="text-xs">
                                {product ? product.name : `Product ${productId}`}
                              </Badge>
                            );
                          })}
                          {offer.productIds.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{offer.productIds.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">No Products</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>{new Date(offer.validFrom).toLocaleDateString()}</div>
                        <div>to {new Date(offer.validUntil).toLocaleDateString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={offer.isActive ? "default" : "secondary"}>
                        {offer.isActive ? <><Eye className="h-3 w-3 mr-1" />Active</> : <><EyeOff className="h-3 w-3 mr-1" />Inactive</>}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(offer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(offer.id)}
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
    </div>
  );
}