import React, { useState, useEffect } from 'react';
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
  Upload,
  Video,
  Image as ImageIcon,
  Loader2,
  Calendar,
  User,
  Tag,
  Play
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';


interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  imageUrl: string;
  videoUrl?: string;
  featured: boolean;
  published: boolean;
  likes: number;
  comments: number;
  readTime: string;
  createdAt: string;
  updatedAt: string;
}

// Assuming InsertBlogPost is a type used for creating new posts in the database
interface InsertBlogPost {
  title: string;
  excerpt?: string;
  content: string;
  author: string;
  category: string;
  tags?: string[] | string;
  imageUrl?: string;
  videoUrl?: string;
  featured?: boolean;
  published?: boolean;
  readTime?: string;
}

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminBlog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: '',
    category: '',
    tags: '',
    imageUrl: '',
    videoUrl: '',
    featured: false,
    published: true,
    readTime: '5 min read'
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    sortOrder: 0
  });

  const [files, setFiles] = useState<{
    image?: File;
    video?: File;
  }>({});

  // Get blog posts
  const { data: blogPostsData = [], isLoading: postsLoading } = useQuery({
    queryKey: ['/api/admin/blog/posts'],
    queryFn: async () => {
      const response = await fetch('/api/admin/blog/posts');
      if (!response.ok) throw new Error('Failed to fetch blog posts');
      return response.json();
    }
  });

  // Get blog categories
  const { data: blogCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/admin/blog/categories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/blog/categories');
      if (!response.ok) throw new Error('Failed to fetch blog categories');
      return response.json();
    }
  });

  useEffect(() => {
    setBlogPosts(blogPostsData);
    setCategories(blogCategories);
    setLoading(postsLoading || categoriesLoading);
  }, [blogPostsData, blogCategories, postsLoading, categoriesLoading]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate required fields
      if (!formData.title || !formData.content || !formData.author || !formData.category) {
        toast({ 
          title: 'Validation Error',
          description: 'Please fill in all required fields (Title, Content, Author, Category)',
          variant: "destructive" 
        });
        return;
      }

      const submitFormData = new FormData();

      // Add text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'tags') {
          submitFormData.append(key, typeof value === 'string' ? value : value.join(','));
        } else {
          submitFormData.append(key, String(value));
        }
      });

      // Add files if they exist
      if (files.image) {
        submitFormData.append('image', files.image);
      }
      if (files.video) {
        submitFormData.append('video', files.video);
      }

      const url = editingPost 
        ? `/api/admin/blog/posts/${editingPost.id}` 
        : '/api/admin/blog/posts';

      const method = editingPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: submitFormData
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
        resetForm();
        setShowAddModal(false);
        setEditingPost(null);
        toast({ 
          title: 'Success',
          description: editingPost ? 'Blog post updated successfully!' : 'Blog post created successfully!' 
        });
      } else {
        const error = await response.json();
        console.error('Server error:', error);
        toast({ 
          title: 'Failed to save blog post', 
          description: error.message || error.error || 'Please check your input and try again.',
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error saving blog post:', error);
      toast({ 
        title: 'Failed to save blog post', 
        description: 'Please check your connection and try again.',
        variant: "destructive" 
      });
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, ...categoryFormData });
    } else {
      createCategoryMutation.mutate(categoryFormData);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      author: '',
      category: '',
      tags: '',
      imageUrl: '',
      videoUrl: '',
      featured: false,
      published: true,
      readTime: '5 min read'
    });
    setFiles({});
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
      isActive: true,
      sortOrder: 0
    });
  };

  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      category: post.category,
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : post.tags,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl || '',
      featured: post.featured,
      published: post.published,
      readTime: post.readTime
    });
    setShowAddModal(true);
  };

  const openEditCategoryModal = (category: BlogCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive,
      sortOrder: category.sortOrder
    });
    setShowCategoryModal(true);
  };

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Delete blog post
  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete blog post');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      toast({ title: "Blog post deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting blog post", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Create blog category
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/categories'] });
      setShowCategoryModal(false);
      resetCategoryForm();
      toast({ title: "Category created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating category", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update blog category
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...categoryData }: any) => {
      const response = await fetch(`/api/admin/blog/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/categories'] });
      setShowCategoryModal(false);
      setEditingCategory(null);
      resetCategoryForm();
      toast({ title: "Category updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating category", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete blog category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/blog/categories/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/categories'] });
      toast({ title: "Category deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting category", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog Management</h1>
          <p className="text-muted-foreground">
            Create and manage blog posts and categories
          </p>
        </div>
      </div>

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">Blog Posts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {/* Posts Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {blogCategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2 border rounded-md p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Blog Post
            </Button>
          </div>

          {/* Posts Content */}
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden">
                  <div className="relative">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-48 object-cover"
                    />
                    {post.videoUrl && (
                      <div className="absolute inset-0">
                        <video 
                          className="w-full h-full object-cover"
                          controls
                          preload="metadata"
                          poster={post.imageUrl}
                        >
                          <source src={post.videoUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {post.featured && (
                        <Badge className="bg-yellow-500">Featured</Badge>
                      )}
                      <Badge variant={post.published ? "default" : "secondary"}>
                        {post.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Badge variant="outline">{post.category}</Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{post.author}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{post.readTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{post.likes} likes</span>
                        <span>{post.comments} comments</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(post)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingPost(post);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium">{post.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {post.excerpt}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{post.author}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{post.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant={post.published ? "default" : "secondary"}>
                            {post.published ? "Published" : "Draft"}
                          </Badge>
                          {post.featured && (
                            <Badge className="bg-yellow-500">Featured</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(post)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingPost(post);
                              setShowDeleteDialog(true);
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
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {/* Categories Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Blog Categories</h2>
            <Button onClick={() => { resetCategoryForm(); setEditingCategory(null); setShowCategoryModal(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>

          {/* Categories Content */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.description}</TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? "default" : "secondary"}>
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditCategoryModal(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCategoryMutation.mutate(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Post Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? 'Edit Blog Post' : 'Add New Blog Post'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details to {editingPost ? 'update' : 'create'} a blog post.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt *</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {blogCategories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="readTime">Read Time</Label>
                <Input
                  id="readTime"
                  value={formData.readTime}
                  onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                  placeholder="5 min read"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="image">Featured Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFiles({ ...files, image: e.target.files?.[0] })}
                />
                {formData.imageUrl && (
                  <div className="text-sm text-muted-foreground">
                    Current: {formData.imageUrl}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="video">Video (Optional)</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFiles({ ...files, video: e.target.files?.[0] })}
                />
                {formData.videoUrl && (
                  <div className="text-sm text-muted-foreground">
                    Current: {formData.videoUrl}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, featured: checked as boolean })}
                />
                <Label htmlFor="featured">Featured</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked as boolean })}
                />
                <Label htmlFor="published">Published</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPost ? 'Update' : 'Create'} Post
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the category details' : 'Create a new blog category'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Name *</Label>
              <Input
                id="categoryName"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={categoryFormData.sortOrder}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="categoryActive"
                  checked={categoryFormData.isActive}
                  onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, isActive: checked as boolean })}
                />
                <Label htmlFor="categoryActive">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* Delete Post Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this blog post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deletingPost) {
                  deletePostMutation.mutate(deletingPost.id);
                }
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