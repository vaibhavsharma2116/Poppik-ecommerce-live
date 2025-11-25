import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/admin/rich-text-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, Package, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  category: string;
}

export default function AdminCombos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedCombo, setSelectedCombo] = useState<any>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [selectedProductShades, setSelectedProductShades] = useState<Record<number, number[]>>({});

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    discount: "",
    cashbackPercentage: "",
    cashbackPrice: "",
    imageUrl: "",
    products: [] as number[], // Store product IDs
    rating: "5.0",
    reviewCount: "0",
    isActive: true,
    sortOrder: 0,
    detailedDescription: "",
    productsIncluded: "",
    benefits: "",
    howToUse: "",
  });

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ["/api/admin/combos"],
  });

  // Fetch all products for selection
  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Fetch shades for all products
  const { data: allShades = [] } = useQuery({
    queryKey: ['/api/admin/shades'],
  });

  // Filter products based on search
  const filteredProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/admin/combos", {
        method: "POST",
        body: data,
      });
      if (!response.ok) throw new Error("Failed to create combo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/combos"] });
      toast({ title: "Combo created successfully" });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await fetch(`/api/admin/combos/${id}`, {
        method: "PUT",
        body: data,
      });
      if (!response.ok) throw new Error("Failed to update combo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/combos"] });
      toast({ title: "Combo updated successfully" });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/combos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete combo");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/combos"] });
      toast({ title: "Combo deleted successfully" });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Limit to 10 images max
      const newFiles = files.slice(0, 10 - selectedImages.length);
      setSelectedImages(prev => [...prev, ...newFiles]);
      
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const file = files[0];
      const isValidType = file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit

      if (!isValidType) {
        toast({
          title: "Invalid File",
          description: `${file.name} is not a valid video file`,
          variant: "destructive",
        });
        return;
      }
      if (!isValidSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} is too large (max 50MB)`,
          variant: "destructive",
        });
        return;
      }

      setSelectedVideo(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setVideoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.price || !formData.originalPrice) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.products.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one product for the combo",
        variant: "destructive",
      });
      return;
    }

    const formDataToSend = new FormData();
    
    // Store only essential product data to avoid field length issues
    const selectedProducts = formData.products.map(productId => {
      const product = allProducts.find(p => p.id === productId);
      return {
        id: product?.id,
        name: product?.name?.substring(0, 100) || '', // Limit name length
        price: product?.price,
        imageUrl: product?.imageUrl?.substring(0, 200) || '', // Limit URL length
      };
    });

    // Append form fields directly instead of nested JSON
    formDataToSend.append("name", formData.name.substring(0, 200));
    formDataToSend.append("description", formData.description.substring(0, 500));
    formDataToSend.append("price", formData.price);
    formDataToSend.append("originalPrice", formData.originalPrice);
    formDataToSend.append("discount", formData.discount.substring(0, 50));
    formDataToSend.append("cashbackPercentage", formData.cashbackPercentage || "0");
    formDataToSend.append("cashbackPrice", formData.cashbackPrice || "0");
    formDataToSend.append("products", JSON.stringify(selectedProducts));
    formDataToSend.append("productShades", JSON.stringify(selectedProductShades));
    formDataToSend.append("rating", formData.rating);
    formDataToSend.append("reviewCount", formData.reviewCount);
    formDataToSend.append("isActive", formData.isActive.toString());
    formDataToSend.append("sortOrder", formData.sortOrder.toString());
    formDataToSend.append("detailedDescription", formData.detailedDescription || "");
    formDataToSend.append("productsIncluded", formData.productsIncluded || "");
    formDataToSend.append("benefits", formData.benefits || "");
    formDataToSend.append("howToUse", formData.howToUse || "");

    // Append all selected images
    if (selectedImages.length > 0) {
      selectedImages.forEach((image) => {
        formDataToSend.append("images", image);
      });
    } else if (editingCombo?.imageUrl) {
      formDataToSend.append("imageUrl", editingCombo.imageUrl);
    }

    // Append video if selected
    if (selectedVideo) {
      formDataToSend.append("video", selectedVideo);
    } else if (editingCombo?.videoUrl) {
      formDataToSend.append("videoUrl", editingCombo.videoUrl);
    }

    console.log("FormData being sent:", {
      name: formData.name,
      products: selectedProducts,
      imageCount: selectedImages.length,
      hasVideo: !!selectedVideo
    });

    if (editingCombo) {
      updateMutation.mutate({ id: editingCombo.id, data: formDataToSend });
    } else {
      createMutation.mutate(formDataToSend);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      discount: '',
      cashbackPercentage: '',
      cashbackPrice: '',
      imageUrl: '',
      products: [],
      rating: '5.0',
      reviewCount: '0',
      isActive: true,
      sortOrder: 0,
      detailedDescription: '',
      productsIncluded: '',
      benefits: '',
      howToUse: '',
    });
    setProductSearchTerm('');
    setImagePreviews([]);
    setSelectedImages([]);
    setSelectedVideo(null);
    setVideoPreview('');
    setSelectedProductShades({});
    setEditingCombo(null);
    setIsModalOpen(false);
  };

  const handleEdit = (combo: any) => {
    setEditingCombo(combo);

    // Extract product IDs from combo products
    const productIds = Array.isArray(combo.products)
      ? combo.products.map((p: any) => p.id || p).filter((id: any) => typeof id === 'number')
      : [];

    setFormData({
      name: combo.name,
      description: combo.description,
      price: combo.price.toString(),
      originalPrice: combo.originalPrice.toString(),
      discount: combo.discount,
      cashbackPercentage: combo.cashbackPercentage?.toString() || '',
      cashbackPrice: combo.cashbackPrice?.toString() || '',
      imageUrl: combo.imageUrl,
      products: productIds,
      rating: combo.rating?.toString() || '5.0',
      reviewCount: combo.reviewCount?.toString() || '0',
      isActive: combo.isActive ?? true,
      sortOrder: combo.sortOrder ?? 0,
      detailedDescription: combo.detailedDescription || '',
      productsIncluded: combo.productsIncluded || '',
      benefits: combo.benefits || '',
      howToUse: combo.howToUse || '',
    });
    
    // Load existing images if available
    const existingImages = combo.imageUrls && combo.imageUrls.length > 0 
      ? combo.imageUrls 
      : combo.imageUrl ? [combo.imageUrl] : [];
    
    setImagePreviews(existingImages);
    setSelectedImages([]);
    
    // Load existing video if available
    if (combo.videoUrl) {
      setVideoPreview(combo.videoUrl);
      setSelectedVideo(null);
    }

    // Load product shades if available
    if (combo.productShades) {
      setSelectedProductShades(combo.productShades);
    } else {
      setSelectedProductShades({});
    }
    
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Combo Management</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Combo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Combos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combos.map((combo: any) => (
                <TableRow key={combo.id}>
                  <TableCell>
                    <img src={combo.imageUrl} alt={combo.name} className="w-16 h-16 object-cover rounded" />
                  </TableCell>
                  <TableCell>{combo.name}</TableCell>
                  <TableCell>₹{combo.price}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{combo.discount}</Badge>
                  </TableCell>
                  <TableCell>
                    {combo.products.length} items
                  </TableCell>
                  <TableCell>
                    <Badge variant={combo.isActive ? "default" : "secondary"}>
                      {combo.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(combo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(combo.id)}
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

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCombo ? "Edit Combo" : "Add New Combo"}</DialogTitle>
            <DialogDescription>
              {editingCombo ? "Update combo details" : "Create a new combo offer"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Combo Images</Label>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative w-full h-32">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {index === 0 && (
                        <Badge className="absolute bottom-1 left-1 text-xs">Primary</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="border-2 border-dashed rounded p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="combo-images"
                />
                <Label htmlFor="combo-images" className="cursor-pointer flex flex-col items-center">
                  <Plus className="h-8 w-8 mb-2" />
                  <span>Click to upload multiple images</span>
                  <span className="text-xs text-gray-500 mt-1">First image will be primary</span>
                </Label>
              </div>
            </div>

            <div>
              <Label>Combo Video (Optional)</Label>
              {videoPreview && (
                <div className="relative mb-2">
                  <video src={videoPreview} className="w-full h-48 object-cover rounded" controls />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => { setSelectedVideo(null); setVideoPreview(''); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="border-2 border-dashed rounded p-4">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                  id="combo-video"
                />
                <Label htmlFor="combo-video" className="cursor-pointer flex flex-col items-center">
                  <Plus className="h-8 w-8 mb-2" />
                  <span>Click to upload video</span>
                  <span className="text-xs text-gray-500 mt-1">MP4, WebM up to 50MB</span>
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Combo Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Original Price (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => {
                    setFormData({ ...formData, originalPrice: e.target.value });
                    // Auto-calculate discount if sale price is set
                    if (formData.price && e.target.value) {
                      const discount = ((parseFloat(e.target.value) - parseFloat(formData.price)) / parseFloat(e.target.value) * 100).toFixed(2);
                      setFormData(prev => ({ ...prev, discount: `${discount}% OFF` }));
                    }
                  }}
                  placeholder="e.g., 1999"
                  required
                />
              </div>

              <div>
                <Label>Sale Price (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => {
                    setFormData({ ...formData, price: e.target.value });
                    // Auto-calculate discount if original price is set
                    if (formData.originalPrice && e.target.value) {
                      const discount = ((parseFloat(formData.originalPrice) - parseFloat(e.target.value)) / parseFloat(formData.originalPrice) * 100).toFixed(2);
                      setFormData(prev => ({ ...prev, discount: `${discount}% OFF` }));
                    }
                  }}
                  placeholder="e.g., 1199"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount.replace('%', '').replace('OFF', '').trim()}
                  onChange={(e) => setFormData({ ...formData, discount: `${e.target.value}% OFF` })}
                  placeholder="Auto-calculated from original and sale price"
                  className="bg-gray-50"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated based on original price and sale price</p>
              </div>

              <div>
                <Label>Cashback (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cashbackPercentage}
                  onChange={(e) => {
                    setFormData({ ...formData, cashbackPercentage: e.target.value });
                    // Auto-calculate cashback price
                    if (formData.price && e.target.value) {
                      const cashbackAmount = (parseFloat(formData.price) * parseFloat(e.target.value) / 100).toFixed(2);
                      setFormData(prev => ({ ...prev, cashbackPrice: cashbackAmount }));
                    }
                  }}
                  placeholder="e.g., 5"
                />
                <p className="text-xs text-gray-500 mt-1">Enter cashback percentage</p>
              </div>

              <div>
                <Label>Cashback Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cashbackPrice}
                  placeholder="Auto-calculated from cashback %"
                  className="bg-gray-50"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated from sale price and cashback percentage</p>
              </div>

              <div>
                <Label>Rating</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                />
              </div>

              <div>
                <Label>Review Count</Label>
                <Input
                  type="number"
                  value={formData.reviewCount}
                  onChange={(e) => setFormData({ ...formData, reviewCount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Short Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
                placeholder="Brief description for combo card"
              />
            </div>

            <div>
              <Label>Detailed Description</Label>
              <RichTextEditor
                content={formData.detailedDescription}
                onChange={(html) => setFormData({ ...formData, detailedDescription: html })}
              />
            </div>

            <div>
              <Label>Products Included Details</Label>
              <RichTextEditor
                content={formData.productsIncluded}
                onChange={(html) => setFormData({ ...formData, productsIncluded: html })}
              />
            </div>

            <div>
              <Label>Benefits</Label>
              <RichTextEditor
                content={formData.benefits}
                onChange={(html) => setFormData({ ...formData, benefits: html })}
              />
            </div>

            <div>
              <Label>How to Use</Label>
              <RichTextEditor
                content={formData.howToUse}
                onChange={(html) => setFormData({ ...formData, howToUse: html })}
              />
            </div>

            <div className="space-y-2">
              <Label>Products Included * ({formData.products.length} selected)</Label>

              {/* Search products */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected products preview */}
              {formData.products.length > 0 && (
                <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selected Products:</p>
                  <div className="space-y-2">
                    {formData.products.map(productId => {
                      const product = allProducts.find(p => p.id === productId);
                      if (!product) return null;
                      
                      // Get shades for this product
                      const productShades = allShades.filter((shade: any) => 
                        shade.productIds && Array.isArray(shade.productIds) && shade.productIds.includes(productId)
                      );

                      return (
                        <div key={productId} className="bg-white p-3 rounded border space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-gray-500">₹{product.price}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  products: formData.products.filter(id => id !== productId)
                                });
                                // Remove shades for this product
                                const newShades = { ...selectedProductShades };
                                delete newShades[productId];
                                setSelectedProductShades(newShades);
                              }}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>

                          {/* Show shades if available */}
                          {productShades.length > 0 && (
                            <div className="space-y-2 border-t pt-2">
                              <p className="text-xs font-medium text-gray-600">Select Shades (Optional):</p>
                              <div className="flex flex-wrap gap-2">
                                {productShades.map((shade: any) => {
                                  const isSelected = selectedProductShades[productId]?.includes(shade.id);
                                  return (
                                    <div
                                      key={shade.id}
                                      onClick={() => {
                                        const currentShades = selectedProductShades[productId] || [];
                                        const newShades = { ...selectedProductShades };
                                        
                                        if (isSelected) {
                                          newShades[productId] = currentShades.filter(id => id !== shade.id);
                                        } else {
                                          newShades[productId] = [...currentShades, shade.id];
                                        }
                                        
                                        setSelectedProductShades(newShades);
                                      }}
                                      className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all ${
                                        isSelected 
                                          ? 'bg-purple-100 border-2 border-purple-500' 
                                          : 'bg-gray-100 border border-gray-300 hover:border-purple-300'
                                      }`}
                                    >
                                      {shade.imageUrl ? (
                                        <img
                                          src={shade.imageUrl}
                                          alt={shade.name}
                                          className="w-4 h-4 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div
                                          className="w-4 h-4 rounded-full border"
                                          style={{ backgroundColor: shade.colorCode }}
                                        />
                                      )}
                                      <span className="text-xs">{shade.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {selectedProductShades[productId]?.length > 0 && (
                                <p className="text-xs text-purple-600">
                                  {selectedProductShades[productId].length} shade(s) selected
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product selection list */}
              <ScrollArea className="h-64 border rounded-lg p-3">
                <div className="space-y-2">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <label
                        key={product.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={formData.products.includes(product.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                products: [...formData.products, product.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                products: formData.products.filter(id => id !== product.id)
                              });
                            }
                          }}
                        />
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 rounded object-cover border"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.category} • ₹{product.price}</p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No products found</p>
                      {productSearchTerm && (
                        <p className="text-sm">Try a different search term</p>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>


            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>

              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-24"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCombo ? "Update" : "Create"} Combo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}