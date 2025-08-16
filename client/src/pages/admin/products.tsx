import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AddProductModal from "@/components/admin/add-product-modal";
import DynamicFilter from "@/components/dynamic-filter";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter, 
  Grid3X3, 
  List,
  Star,
  Eye,
  MoreVertical,
  Package,
  TrendingUp,
  AlertTriangle,
  Image as ImageIcon,
  Loader2
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  category: string;
  subcategory?: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  featured: boolean;
  bestseller: boolean;
  newLaunch: boolean;
  saleOffer?: string;
  variants?: string;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
  size?: string;
  tags?: string;
  skinType?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  status: string;
  productCount: number;
}

interface Subcategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  categoryId: number;
  status: string;
  productCount: number;
}

export default function AdminProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    price: '',
    description: '',
    shortDescription: '',
    category: '',
    subcategory: '',
    imageUrl: '',
    rating: '',
    reviewCount: '',
    inStock: true,
    featured: false,
    bestseller: false,
    newLaunch: false,
    saleOffer: '',
    size: '',
    ingredients: '',
    benefits: '',
    howToUse: '',
    tags: '',
    skinType: ''
  });

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, subcategoriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/subcategories')
      ]);

      if (!productsRes.ok || !categoriesRes.ok || !subcategoriesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [productsData, categoriesData, subcategoriesData] = await Promise.all([
        productsRes.json(),
        categoriesRes.json(),
        subcategoriesRes.json()
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setSubcategories(subcategoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (newProduct: any) => {
    try {
      // The product is already created in the modal, so we just need to add it to our state
      setProducts(prev => [...prev, newProduct]);

      // Clear any previous errors
      setError(null);

      // Optionally refetch data to ensure consistency
      setTimeout(() => {
        fetchData();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product to list');
    }
  };

  const handleEditProduct = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      // Find the category ID for the product's category name
      const category = categories.find(c => c.name === product.category);
      const categoryValue = category ? category.id.toString() : product.category;

      setSelectedProduct(product);
      setEditFormData({
        name: product.name,
        price: product.price.toString(),
        description: product.description,
        shortDescription: product.shortDescription,
        category: categoryValue,
        subcategory: product.subcategory || '',
        imageUrl: product.imageUrl,
        rating: product.rating.toString(),
        reviewCount: product.reviewCount.toString(),
        inStock: product.inStock,
        featured: product.featured,
        bestseller: product.bestseller,
        newLaunch: product.newLaunch,
        saleOffer: product.saleOffer || '',
        size: product.size || '',
        ingredients: product.ingredients || '',
        benefits: product.benefits || '',
        howToUse: product.howToUse || '',
        tags: product.tags || '',
        skinType: product.skinType || ''
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (selectedProduct) {
      try {
        // Find the category name from the category ID
        const selectedCategory = categories.find(cat => cat.id === parseInt(editFormData.category));
        const categoryName = selectedCategory ? selectedCategory.name : editFormData.category;

        const updateData = {
          ...editFormData,
          category: categoryName, // Use the category name, not the ID
          price: parseFloat(editFormData.price) || 0,
          rating: parseFloat(editFormData.rating) || 0,
          reviewCount: parseInt(editFormData.reviewCount) || 0,
          slug: editFormData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          subcategory: editFormData.subcategory || null,
          saleOffer: editFormData.saleOffer || null,
          size: editFormData.size || null,
          ingredients: editFormData.ingredients || null,
          benefits: editFormData.benefits || null,
          howToUse: editFormData.howToUse || null,
          tags: editFormData.tags || null,
          skinType: editFormData.skinType || null
        };

        console.log('Updating product with data:', updateData);

        const response = await fetch(`/api/products/${selectedProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Failed to update product';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const updatedProduct = await response.json();
        setProducts(prev => prev.map(p => 
          p.id === selectedProduct.id ? updatedProduct : p
        ));
        setIsEditModalOpen(false);
        setSelectedProduct(null);
        setError(null); // Clear any previous errors

        // Refresh data to ensure sync with database
        setTimeout(() => {
          fetchData();
        }, 500);
      } catch (err) {
        console.error('Edit product error:', err);
        setError(err instanceof Error ? err.message : 'Failed to update product');
      }
    }
  };

  const handleViewProduct = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setIsViewModalOpen(true);
    }
  };

  const handleDeleteProduct = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setIsDeleteModalOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (selectedProduct) {
      try {
        const response = await fetch(`/api/products/${selectedProduct.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete product');
        }

        setProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
        setIsDeleteModalOpen(false);
        setSelectedProduct(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete product');
      }
    }
  };

  // Get subcategories for selected category
  const getSubcategoriesForCategory = (categoryValue: string) => {
    if (!categoryValue) return [];

    // Check if categoryValue is an ID (number) or name (string)
    let categoryId: number;

    if (!isNaN(parseInt(categoryValue))) {
      // It's an ID
      categoryId = parseInt(categoryValue);
    } else {
      // It's a name, find the category by name
      const category = categories.find(c => c.name.toLowerCase() === categoryValue.toLowerCase());
      if (!category) return [];
      categoryId = category.id;
    }

    return subcategories.filter(sub => sub.categoryId === categoryId);
  };

    // Handle dynamic filter changes
  const handleFilterChange = (filteredProducts: Product[], activeFilters: any) => {
    // Apply search term filter on top of dynamic filters
    let finalFiltered = filteredProducts;
    
    if (searchTerm) {
      finalFiltered = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredProducts(finalFiltered);
  };

  // Update filtered products when search term changes
  useEffect(() => {
    if (searchTerm && filteredProducts.length > 0) {
      const searchFiltered = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(searchFiltered);
    }
  }, [searchTerm]);

  const lowStockCount = products.filter(p => !p.inStock).length;
  const bestSeller = products.find(p => p.bestseller);

  const stats = [
    { label: "Total Products", value: products.length.toString(), icon: Package, color: "from-blue-500 to-cyan-500" },
    { label: "Out of Stock", value: lowStockCount.toString(), icon: AlertTriangle, color: "from-orange-500 to-red-500" },
    { label: "Best Sellers", value: products.filter(p => p.bestseller).length.toString(), icon: TrendingUp, color: "from-green-500 to-emerald-500" },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
      {/* {history.location.push('/admin/products')} */}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Product Management
          </h2>
          <p className="text-slate-600 mt-1">Manage your beauty product inventory and catalog</p>
        </div>
        <AddProductModal onAddProduct={handleAddProduct} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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

      {/* Search and View Controls */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center rounded-lg border p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Filters and Products Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dynamic Filter Sidebar */}
        <div className="lg:col-span-1">
          <DynamicFilter
            products={products}
            categories={categories}
            onFilterChange={handleFilterChange}
            className="sticky top-4"
          />
        </div>

        {/* Products Display */}
        <div className="lg:col-span-3">

      {filteredProducts.length === 0 ? (
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-600">Try adjusting your search or filter criteria</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
              <div className="relative">
                <div className="aspect-square bg-slate-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-slate-400" />
                  )}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <Badge 
                  className={`absolute top-2 left-2 ${
                    product.inStock ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 mb-1">{product.name}</h3>
                <p className="text-sm text-slate-500 mb-2">
                  {product.category} {product.subcategory && `• ${product.subcategory}`}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-slate-900">₹{product.price}</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-slate-600">{product.rating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                  <span>Reviews: {product.reviewCount}</span>
                  {product.bestseller && <Badge variant="secondary">Bestseller</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 transition-all hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                    onClick={() => handleViewProduct(product.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 transition-all hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300"
                    onClick={() => handleEditProduct(product.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-slate-200/60 shadow-xl bg-white overflow-hidden">
          <CardHeader>
            <CardTitle>Product Inventory</CardTitle>
            <CardDescription>Detailed view of all products</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50/50">
                  <TableHead className="text-slate-800 font-semibold py-4 px-6">Image</TableHead>
                  <TableHead className="text-slate-800 font-semibold py-4">Product Details</TableHead>
                  <TableHead className="text-slate-800 font-semibold py-4">Category</TableHead>
                  <TableHead className="text-slate-800 font-semibold py-4">Price</TableHead>
                  <TableHead className="text-slate-800 font-semibold py-4">Stock</TableHead>
                  <TableHead className="text-slate-800 font-semibold py-4 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-all duration-200 group">
                    <TableCell className="p-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-slate-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="space-y-2 max-w-xs">
                        <h3 className="font-semibold text-slate-900 line-clamp-2 text-sm leading-tight group-hover:text-slate-700 transition-colors">{product.name}</h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{product.shortDescription}</p>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < Math.floor(parseFloat(product.rating)) 
                                  ? "fill-yellow-400 text-yellow-400" 
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                          <span className="text-xs text-slate-700 ml-1 font-medium">{product.rating}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="space-y-2">
                        <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                          {product.category}
                        </Badge>
                        {product.subcategory && (
                          <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                            {product.subcategory}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 text-sm">₹{product.price}</span>
                        {product.originalPrice && (
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs text-slate-500 line-through">₹{product.originalPrice}</span>
                            <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                              {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <Badge 
                        variant={product.inStock ? "default" : "destructive"}
                        className={`text-xs font-medium px-3 py-1 ${
                          product.inStock 
                            ? "bg-green-100 text-green-800 border border-green-200" 
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-6 pr-6">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-9 w-9 p-0 rounded-lg transition-all hover:bg-blue-50 hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-blue-200"
                          onClick={() => handleViewProduct(product.id)}
                          title="View Product"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-9 w-9 p-0 rounded-lg transition-all hover:bg-emerald-50 hover:text-emerald-600 hover:shadow-sm border border-transparent hover:border-emerald-200"
                          onClick={() => handleEditProduct(product.id)}
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-9 w-9 p-0 rounded-lg transition-all hover:bg-red-50 hover:text-red-600 hover:shadow-sm border border-transparent hover:border-red-200"
                          onClick={() => handleDeleteProduct(product.id)}
                          title="Delete Product"
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
          )}
        </div>
      </div>

      {/* View Product Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              Product Details
            </DialogTitle>
            <DialogDescription className="text-base">
              Complete information for the selected product
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6 pt-4">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="w-32 h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center shadow-inner overflow-hidden">
                  {selectedProduct.imageUrl ? (
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{selectedProduct.name}</h3>
                    <p className="text-slate-600 mb-4">{selectedProduct.description}</p>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {selectedProduct.category}
                      </Badge>
                      {selectedProduct.subcategory && (
                        <Badge variant="outline" className="text-sm px-3 py-1">
                          {selectedProduct.subcategory}
                        </Badge>
                      )}
                      <Badge 
                        className={`text-sm px-3 py-1 ${
                          selectedProduct.inStock ? 'bg-green-100 text-green-800 border-green-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {selectedProduct.inStock ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                                            {selectedProduct.skinType && (
                        <Badge variant="outline" className="text-sm px-3 py-1">
                          {selectedProduct.skinType}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-slate-600">Price</Label>
                      <p className="text-2xl font-bold text-green-600">₹{selectedProduct.price}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-slate-600">Rating</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star 
                              key={i} 
                              className={`h-5 w-5 ${
                                i < Math.floor(selectedProduct.rating) 
                                  ? "fill-yellow-400 text-yellow-400" 
                                  : "text-slate-300"
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-lg font-semibold">{selectedProduct.rating}</span>
                        <span className="text-slate-500">({selectedProduct.reviewCount} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-semibold text-slate-600">Short Description</Label>
                  <p className="text-slate-700 mt-1">{selectedProduct.shortDescription}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-600">Size</Label>
                  <p className="text-slate-700 mt-1">{selectedProduct.size || 'N/A'}</p>
                </div>
                {selectedProduct.ingredients && (
                  <div>
                    <Label className="text-sm font-semibold text-slate-600">Ingredients</Label>
                    <p className="text-slate-700 mt-1">{selectedProduct.ingredients}</p>
                  </div>
                )}
                {selectedProduct.benefits && (
                  <div>
                    <Label className="text-sm font-semibold text-slate-600">Benefits</Label>
                    <p className="text-slate-700 mt-1">{selectedProduct.benefits}</p>
                  </div>
                )}
                {selectedProduct.howToUse && (
                  <div className="lg:col-span-2">
                    <Label className="text-sm font-semibold text-slate-600">How to Use</Label>
                    <p className="text-slate-700 mt-1">{selectedProduct.howToUse}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-emerald-600" />
              Edit Product
            </DialogTitle>
            <DialogDescription>
              Update product information and save changes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Moisturizing Face Cream"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={editFormData.category} onValueChange={(value) => {
                  setEditFormData(prev => ({ ...prev, category: value, subcategory: '' }));
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
                <Label htmlFor="edit-subcategory">Subcategory</Label>
                <Select value={editFormData.subcategory} onValueChange={(value) => setEditFormData(prev => ({ ...prev, subcategory: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSubcategoriesForCategory(editFormData.category).map((sub) => (
                      <SelectItem key={sub.id} value={sub.name || `subcategory-${sub.id}`}>{sub.name || `Subcategory ${sub.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-skinType">Skin Type</Label>
                    <Select value={editFormData.skinType} onValueChange={(value) => setEditFormData(prev => ({ ...prev, skinType: value }))}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Skin Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="oily">Oily</SelectItem>
                            <SelectItem value="dry">Dry</SelectItem>
                            <SelectItem value="sensitive">Sensitive</SelectItem>
                            <SelectItem value="combination">Combination</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Price and Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price (₹) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={editFormData.price}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="299"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-rating">Rating</Label>
                <Input
                  id="edit-rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={editFormData.rating}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, rating: e.target.value }))}
                  placeholder="4.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-reviewCount">Review Count</Label>
                <Input
                  id="edit-reviewCount"
                  type="number"
                  value={editFormData.reviewCount}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, reviewCount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-size">Size</Label>
                <Input
                  id="edit-size"
                  value={editFormData.size}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="e.g., 50ml"
                />
              </div>
            </div>

            {/* Product Tags */}
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma separated)</Label>
              <Input
                id="edit-tags"
                value={editFormData.tags}
                onChange={(e) => setEditFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="organic, cruelty-free, vegan"
              />
            </div>

            {/* Product Flags */}
            <div className="space-y-4">
              <Label>Product Status & Features</Label>
              <p className="text-sm text-gray-600">You can select multiple options</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-inStock-checkbox"
                    checked={editFormData.inStock}
                    onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, inStock: checked as boolean }))}
                  />
                  <Label htmlFor="edit-inStock-checkbox" className="text-sm cursor-pointer select-none">In Stock</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-featured-checkbox"
                    checked={editFormData.featured}
                    onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, featured: checked as boolean }))}
                  />
                  <Label htmlFor="edit-featured-checkbox" className="text-sm cursor-pointer select-none">Featured</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-bestseller-checkbox"
                    checked={editFormData.bestseller}
                    onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, bestseller: checked as boolean }))}
                  />
                  <Label htmlFor="edit-bestseller-checkbox" className="text-sm cursor-pointer select-none">Bestseller</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-newLaunch-checkbox"
                    checked={editFormData.newLaunch}
                    onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, newLaunch: checked as boolean }))}
                  />
                  <Label htmlFor="edit-newLaunch-checkbox" className="text-sm cursor-pointer select-none">New Launch</Label>
                </div>
              </div>
            </div>

            {/* Descriptions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-shortDescription">Short Description</Label>
                <Input
                  id="edit-shortDescription"
                  value={editFormData.shortDescription}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                  placeholder="Brief product description for listings"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Full Description *</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed product description..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-ingredients">Ingredients</Label>
                <Textarea
                  id="edit-ingredients"
                  value={editFormData.ingredients}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, ingredients: e.target.value }))}
                  placeholder="List of ingredients..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-benefits">Benefits</Label>
                <Textarea
                  id="edit-benefits"
                  value={editFormData.benefits}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, benefits: e.target.value }))}
                  placeholder="Product benefits..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-howToUse">How to Use</Label>
                <Textarea
                  id="edit-howToUse"
                  value={editFormData.howToUse}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, howToUse: e.target.value }))}
                  placeholder="Usage instructions..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-saleOffer">Sale Offer</Label>
                <Input
                  id="edit-saleOffer"
                  value={editFormData.saleOffer}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, saleOffer: e.target.value }))}
                  placeholder="e.g., 20% off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-imageUrl">Image URL</Label>
                <Input
                  id="edit-imageUrl"
                  value={editFormData.imageUrl}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="Product image URL"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700">
              Save Changes
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
              Delete Product
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete this product?
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                {selectedProduct.imageUrl ? (
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedProduct.name}</p>
                <p className="text-sm text-slate-600">{selectedProduct.category} • ₹{selectedProduct.price}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}