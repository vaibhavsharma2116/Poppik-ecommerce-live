import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    discount: "",
    imageUrl: "",
    products: [] as number[], // Store product IDs
    rating: "5.0",
    reviewCount: "0",
    isActive: true,
    sortOrder: 0,
  });

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ["/api/admin/combos"],
  });

  // Fetch all products for selection
  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
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
      setSelectedImages(prev => [...prev, ...files]);
      
      files.forEach(file => {
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
    formDataToSend.append("name", formData.name);
    formDataToSend.append("description", formData.description);
    formDataToSend.append("price", formData.price);
    formDataToSend.append("originalPrice", formData.originalPrice);
    formDataToSend.append("discount", formData.discount);

    // Convert product IDs to product objects with details
    const selectedProducts = formData.products.map(productId => {
      const product = allProducts.find(p => p.id === productId);
      return {
        id: product?.id,
        name: product?.name,
        price: product?.price,
        imageUrl: product?.imageUrl,
      };
    });

    const comboData = {
      name: formData.name,
      slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
      description: formData.description,
      price: parseFloat(formData.price),
      originalPrice: parseFloat(formData.originalPrice),
      discount: formData.discount,
      imageUrl: formData.imageUrl,
      products: selectedProducts,
      rating: parseFloat(formData.rating),
      reviewCount: parseInt(formData.reviewCount),
      isActive: formData.isActive,
      sortOrder: formData.sortOrder,
    };

    // Append combo data as JSON string
    formDataToSend.append("comboData", JSON.stringify(comboData));

    // Append multiple images
    if (selectedImages.length > 0) {
      selectedImages.forEach((image, index) => {
        formDataToSend.append(`images`, image);
      });
    } else if (editingCombo?.imageUrl) {
      // If editing and no new images, keep existing imageUrl
      formDataToSend.append("imageUrl", editingCombo.imageUrl);
    }


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
      imageUrl: '',
      products: [],
      rating: '5.0',
      reviewCount: '0',
      isActive: true,
      sortOrder: 0,
    });
    setProductSearchTerm('');
    setImagePreviews([]);
    setSelectedImages([]);
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
      imageUrl: combo.imageUrl,
      products: productIds,
      rating: combo.rating?.toString() || '5.0',
      reviewCount: combo.reviewCount?.toString() || '0',
      isActive: combo.isActive ?? true,
      sortOrder: combo.sortOrder ?? 0,
    });
    
    // Load existing images if available
    if (combo.imageUrl) {
      setImagePreviews([combo.imageUrl]);
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
                    // Auto-calculate sale price if discount is set
                    if (formData.discount && e.target.value) {
                      const discountPercent = parseFloat(formData.discount.replace('%', '').trim());
                      const salePrice = (parseFloat(e.target.value) * (1 - discountPercent / 100)).toFixed(2);
                      setFormData(prev => ({ ...prev, price: salePrice }));
                    }
                  }}
                  placeholder="e.g., 1999"
                  required
                />
              </div>

              <div>
                <Label>Discount (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount.replace('%', '').replace('OFF', '').trim()}
                  onChange={(e) => {
                    const discountValue = e.target.value;
                    setFormData({ ...formData, discount: `${discountValue}% OFF` });
                    // Auto-calculate sale price if original price is set
                    if (formData.originalPrice && discountValue) {
                      const salePrice = (parseFloat(formData.originalPrice) * (1 - parseFloat(discountValue) / 100)).toFixed(2);
                      setFormData(prev => ({ ...prev, price: salePrice }));
                    }
                  }}
                  placeholder="e.g., 40"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter discount percentage (e.g., 40 for 40% off)</p>
              </div>

              <div className="col-span-2">
                <Label>Sale Price (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Auto-calculated from original price and discount"
                  className="bg-gray-50"
                  readOnly
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated based on original price and discount</p>
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
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
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
                      return (
                        <div key={productId} className="flex items-center justify-between bg-white p-2 rounded border">
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
                            }}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
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