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
import RichTextEditor from "@/components/admin/rich-text-editor";
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
  Play,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  ListOrdered,
  ListIcon,
  Pencil
} from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Image as TipTapImage } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';

// Custom FontSize extension
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => {
          if (!attributes.fontSize) {
            return {};
          }
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});
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
  subcategory?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  heroImageUrl?: string;
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
  imageUrl?: string;
  thumbnailUrl?: string;
  heroImageUrl?: string;
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

  // Using query data directly instead of local state to prevent re-render issues
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Rich text editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      TipTapImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'blog-image',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
      TextStyle,
      FontSize,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setFormData(prev => ({ ...prev, content: editor.getHTML() }));
    },
  });

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: '',
    category: '',
    thumbnailUrl: '',
    heroImageUrl: '',
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
    video?: File;
    thumbnail?: File;
    hero?: File;
  }>({});

  // Get blog posts - AGGRESSIVE NO-CACHE CONFIG
  const { data: blogPostsData = [], isLoading: postsLoading, refetch: refetchPosts } = useQuery<BlogPost[]>({
    queryKey: ['/api/admin/blog/posts'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');
      const response = await fetch(`/api/admin/blog/posts?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to fetch blog posts');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: true
  });

  // Get blog categories - AGGRESSIVE NO-CACHE CONFIG
  const { data: blogCategories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery<BlogCategory[]>({
    queryKey: ['/api/admin/blog/categories'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');
      const response = await fetch(`/api/admin/blog/categories?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to fetch blog categories');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: true
  });

  

  // Removed useEffect - using query data directly instead of local state
  // This prevents infinite re-render loops


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
        if (key === 'tags' && Array.isArray(value)) {
          submitFormData.append(key, typeof value === 'string' ? value : value.join(','));
        } else {
          submitFormData.append(key, String(value));
        }
      });

      // Add files if they exist
      if (files.thumbnail) {
        submitFormData.append('image', files.thumbnail);
      }
      if (files.hero) {
        submitFormData.append('hero', files.hero);
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
        body: submitFormData,
        headers: {
          'Cache-Control': 'no-store'
        }
      });

      if (response.ok) {
        const newPost = await response.json();
        
        // Optimistic update: immediately add/update in cache
        const previousPosts = queryClient.getQueryData<BlogPost[]>(['/api/admin/blog/posts']) || [];
        if (editingPost) {
          // Update existing
          queryClient.setQueryData(['/api/admin/blog/posts'], previousPosts.map(post => post.id === editingPost.id ? newPost : post));
        } else {
          // Add new
          queryClient.setQueryData(['/api/admin/blog/posts'], [...previousPosts, newPost]);
        }
        
        // Then invalidate and refetch for consistency
        await queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
        await refetchPosts();
        
        resetForm();
        setShowAddModal(false);
        setEditingPost(null);
        toast({ 
          title: 'Success',
          description: editingPost ? 'Blog post updated instantly!' : 'Blog post created instantly!' 
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
      thumbnailUrl: '',
      heroImageUrl: '',
      videoUrl: '',
      featured: false,
      published: true,
      readTime: '5 min read'
    });
    setFiles({});
    editor?.commands.setContent('');
    setShowPreview(false);
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
      thumbnailUrl: post.thumbnailUrl || post.imageUrl || '',
      heroImageUrl: post.heroImageUrl || post.imageUrl || '',
      videoUrl: post.videoUrl || '',
      featured: post.featured,
      published: post.published,
      readTime: post.readTime
    });
    editor?.commands.setContent(post.content);
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

  const filteredPosts = (Array.isArray(blogPostsData) ? blogPostsData : []).filter((post: BlogPost) => {
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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-store'
        }
      });
      if (!response.ok) throw new Error('Failed to delete blog post');
      return response.json();
    },
    onSuccess: async (data, deletedId) => {
      setShowDeleteDialog(false);
      setDeletingPost(null);
      
      // Optimistic update: immediately remove from cache
      const previousPosts = queryClient.getQueryData<BlogPost[]>(['/api/admin/blog/posts']) || [];
      queryClient.setQueryData(['/api/admin/blog/posts'], previousPosts.filter(post => post.id !== deletedId));
      
      // Then invalidate and refetch for consistency
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      await refetchPosts();
      
      toast({ title: "Blog post deleted instantly!" });
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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify(categoryData)
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: async (data) => {
      // Optimistic update: immediately add new category to cache
      const previousCategories = queryClient.getQueryData<BlogCategory[]>(['/api/admin/blog/categories']) || [];
      queryClient.setQueryData(['/api/admin/blog/categories'], [...previousCategories, data]);
      
      // Then invalidate and refetch for consistency
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/categories'] });
      await refetchCategories();
      
      setShowCategoryModal(false);
      resetCategoryForm();
      setEditingCategory(null);
      toast({ title: "Category created instantly!" });
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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/blog/categories/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify(categoryData)
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: async (data, { id }) => {
      // Optimistic update: immediately update category in cache
      const previousCategories = queryClient.getQueryData<BlogCategory[]>(['/api/admin/blog/categories']) || [];
      queryClient.setQueryData(['/api/admin/blog/categories'], previousCategories.map(cat => cat.id === id ? data : cat));
      
      // Then invalidate and refetch for consistency
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/categories'] });
      await refetchCategories();
      
      setShowCategoryModal(false);
      setEditingCategory(null);
      resetCategoryForm();
      toast({ title: "Category updated instantly!" });
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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/blog/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-store'
        }
      });
      if (!response.ok) throw new Error('Failed to delete category');
      return response.json();
    },
    onSuccess: async (data, deletedId) => {
      // Optimistic update: immediately remove from cache
      const previousCategories = queryClient.getQueryData<BlogCategory[]>(['/api/admin/blog/categories']) || [];
      queryClient.setQueryData(['/api/admin/blog/categories'], previousCategories.filter(cat => cat.id !== deletedId));
      
      // Then invalidate and refetch for consistency
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/categories'] });
      await refetchCategories();
      
      toast({ title: "Category deleted instantly!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting category", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  

  const handlePreview = () => {
    setShowPreview(true);
  };

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
                  {Array.isArray(blogCategories) && blogCategories.map((category) => (
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
          {postsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post: BlogPost) => (
                <Card key={post.id} className="overflow-hidden">
                  <div className="relative">
                    <img
                      src={post.thumbnailUrl || post.imageUrl || '/placeholder.png'}
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
                  {filteredPosts.map((post: BlogPost) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={post.thumbnailUrl || post.imageUrl || '/placeholder.png'}
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
                {Array.isArray(blogCategories) && blogCategories.map((category) => (
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
              <Label htmlFor="excerpt">Excerpt * (Max 50 words)</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => {
                  const text = e.target.value;
                  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
                  if (wordCount <= 50) {
                    setFormData({ ...formData, excerpt: text });
                  }
                }}
                rows={2}
                required
              />
              <p className="text-xs text-gray-500">
                {formData.excerpt.trim().split(/\s+/).filter(word => word.length > 0).length} / 50 words
              </p>
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <Tabs defaultValue="editor" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview" onClick={() => setShowPreview(true)}>Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="editor" className="space-y-2">
                  {/* Advanced Editor Toolbar - Word Style */}
                  <div className="border rounded-md bg-muted/50">
                    {/* First Row - Font, Size, and Basic Formatting */}
                    <div className="p-2 flex flex-wrap items-center gap-2 border-b">
                      {/* Font Family */}
                      <select
                        className="h-8 text-sm border rounded px-2 bg-white w-[160px]"
                        value={editor?.getAttributes('textStyle').fontFamily || ''}
                        onChange={(e) => {
                          const fontFamily = e.target.value;
                          if (fontFamily && fontFamily !== '') {
                            editor?.chain().focus().setFontFamily(fontFamily).run();
                          } else {
                            editor?.chain().focus().unsetFontFamily().run();
                          }
                        }}
                      >
                        <option value="">Default Font</option>
                        <option value="Arial">Arial</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Comic Sans MS">Comic Sans MS</option>
                        <option value="Inter">Inter</option>
                      </select>

                      {/* Font Size */}
                      <select
                        className="h-8 text-sm border rounded px-2 bg-white"
                        defaultValue="16px"
                        onChange={(e) => {
                          const size = e.target.value;
                          if (size) {
                            editor?.commands.setMark('textStyle', { fontSize: size });
                          }
                        }}
                      >
                        <option value="">Font Size</option>
                        <option value="8px">8</option>
                        <option value="10px">10</option>
                        <option value="12px">12</option>
                        <option value="14px">14</option>
                        <option value="16px">16</option>
                        <option value="18px">18</option>
                        <option value="20px">20</option>
                        <option value="24px">24</option>
                        <option value="28px">28</option>
                        <option value="32px">32</option>
                        <option value="36px">36</option>
                        <option value="48px">48</option>
                        <option value="72px">72</option>
                      </select>

                      <div className="w-px h-8 bg-border" />

                      {/* Text Formatting */}
                      <Button
                        type="button"
                        size="sm"
                        variant={editor?.isActive('bold') ? 'secondary' : 'ghost'}
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        title="Bold (Ctrl+B)"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={editor?.isActive('italic') ? 'secondary' : 'ghost'}
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        title="Italic (Ctrl+I)"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={editor?.isActive('underline') ? 'secondary' : 'ghost'}
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        title="Underline (Ctrl+U)"
                      >
                        <UnderlineIcon className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-8 bg-border" />

                      {/* Text Color & Highlight */}
                      <div className="flex items-center gap-1">
                        <Label htmlFor="text-color" className="cursor-pointer">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            asChild
                            title="Text Color"
                          >
                            <span className="flex items-center gap-1">
                              <div className="h-4 w-4 border rounded" style={{ backgroundColor: editor?.getAttributes('textStyle').color || '#000000' }} />
                              <span className="text-xs">A</span>
                            </span>
                          </Button>
                        </Label>
                        <input
                          id="text-color"
                          type="color"
                          className="hidden"
                          onInput={(e) => editor?.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                        />
                      </div>

                      <div className="w-px h-8 bg-border" />

                      {/* Headings */}
                      <Select 
                        value={
                          editor?.isActive('heading', { level: 1 }) ? 'heading1' :
                          editor?.isActive('heading', { level: 2 }) ? 'heading2' :
                          editor?.isActive('heading', { level: 3 }) ? 'heading3' :
                          'paragraph'
                        }
                        onValueChange={(value) => {
                          if (value === 'paragraph') {
                            editor?.chain().focus().setParagraph().run();
                          } else if (value === 'heading1') {
                            editor?.chain().focus().setHeading({ level: 1 }).run();
                          } else if (value === 'heading2') {
                            editor?.chain().focus().setHeading({ level: 2 }).run();
                          } else if (value === 'heading3') {
                            editor?.chain().focus().setHeading({ level: 3 }).run();
                          }
                        }}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue placeholder="Style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paragraph">Normal</SelectItem>
                          <SelectItem value="heading1">Heading 1</SelectItem>
                          <SelectItem value="heading2">Heading 2</SelectItem>
                          <SelectItem value="heading3">Heading 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Second Row - Alignment, Lists, and Insert Options */}
                    <div className="p-2 flex flex-wrap items-center gap-2">
                      {/* Text Alignment */}
                      <Button
                        type="button"
                        size="sm"
                        variant={editor?.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
                        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                        title="Align Left"
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={editor?.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
                        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                        title="Align Center"
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={editor?.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
                        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                        title="Align Right"
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={editor?.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'}
                        onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                        title="Justify"
                      >
                        <AlignJustify className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-8 bg-border" />

                      {/* Lists */}
                      <Button
                        type="button"
                        size="sm"
                        variant={editor?.isActive('bulletList') ? 'secondary' : 'ghost'}
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        title="Bullet List"
                      >
                        <ListIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={editor?.isActive('orderedList') ? 'secondary' : 'ghost'}
                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                        title="Numbered List"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>

                      <div className="w-px h-8 bg-border" />

                      {/* Insert Image */}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          id="content-image-upload"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;

                            for (let i = 0; i < files.length; i++) {
                              const file = files[i];
                              const formData = new FormData();
                              formData.append('image', file);

                              try {
                                const response = await fetch('/api/upload/image', {
                                  method: 'POST',
                                  body: formData,
                                });

                                if (response.ok) {
                                  const data = await response.json();
                                  editor?.chain().focus().setImage({ src: data.imageUrl }).run();
                                }
                              } catch (error) {
                                console.error('Error uploading image:', error);
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                        <Label htmlFor="content-image-upload">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            asChild
                            title="Insert Image"
                          >
                            <span className="cursor-pointer flex items-center gap-1">
                              <Upload className="h-4 w-4" />
                              <span className="text-xs">Image</span>
                            </span>
                          </Button>
                        </Label>
                      </div>

                      {/* Insert Video */}
                      <div>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          id="content-video-upload"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;

                            const file = files[0];
                            const formData = new FormData();
                            formData.append('video', file);

                            try {
                              toast({
                                title: "Uploading video...",
                                description: "Please wait while the video is being uploaded."
                              });

                              const response = await fetch('/api/upload/video', {
                                method: 'POST',
                                body: formData,
                              });

                              if (response.ok) {
                                const data = await response.json();
                                console.log('Video upload response:', data);
                                
                                // Use the videoUrl from the response
                                const videoUrl = data.videoUrl || data.url;
                                
                                if (videoUrl) {
                                  const videoHtml = `<div class="video-container" style="margin: 20px 0; text-align: center;"><video controls preload="metadata" style="width: 100%; max-width: 800px; border-radius: 8px;"><source src="${videoUrl}" type="video/mp4" /><source src="${videoUrl}" type="video/webm" />Your browser does not support the video tag.</video></div>`;
                                  editor?.chain().focus().insertContent(videoHtml).run();
                                  
                                  toast({
                                    title: "Video uploaded successfully!",
                                    description: "Video has been added to your content."
                                  });
                                } else {
                                  throw new Error('No video URL in response');
                                }
                              } else {
                                throw new Error('Upload failed');
                              }
                            } catch (error) {
                              console.error('Error uploading video:', error);
                              toast({
                                title: "Video upload failed",
                                description: "Please try again with a different video file.",
                                variant: "destructive"
                              });
                            }
                            e.target.value = '';
                          }}
                        />
                        <Label htmlFor="content-video-upload">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            asChild
                            title="Insert Video"
                          >
                            <span className="cursor-pointer flex items-center gap-1">
                              <Video className="h-4 w-4" />
                              <span className="text-xs">Video</span>
                            </span>
                          </Button>
                        </Label>
                      </div>

                      <div className="w-px h-8 bg-border" />

                      {/* Image Alignment Controls */}
                      <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-background/50">
                        <span className="text-xs text-muted-foreground mr-1">Image:</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            if (!editor) return;

                            // Find all images in the document
                            const { state } = editor;
                            let lastImagePos = -1;

                            state.doc.descendants((node, pos) => {
                              if (node.type.name === 'image') {
                                lastImagePos = pos;
                              }
                            });

                            if (lastImagePos >= 0) {
                              const tr = state.tr;
                              const imageNode = tr.doc.nodeAt(lastImagePos);

                              if (imageNode) {
                                tr.setNodeMarkup(lastImagePos, null, {
                                  ...imageNode.attrs,
                                  style: 'float: left; margin: 0.5rem 1rem 0.5rem 0; max-width: 480px; width: 480px; height: 480px; object-fit: cover; clear: both;'
                                });
                                editor.view.dispatch(tr);
                              }
                            }
                          }}
                          title="Align Image Left"
                        >
                          <AlignLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            if (!editor) return;

                            // Find all images in the document
                            const { state } = editor;
                            let lastImagePos = -1;

                            state.doc.descendants((node, pos) => {
                              if (node.type.name === 'image') {
                                lastImagePos = pos;
                              }
                            });

                            if (lastImagePos >= 0) {
                              const tr = state.tr;
                              const imageNode = tr.doc.nodeAt(lastImagePos);

                              if (imageNode) {
                                tr.setNodeMarkup(lastImagePos, null, {
                                  ...imageNode.attrs,
                                  style: 'display: block; margin: 1.5rem auto; max-width: 480px; width: 480px; height: 480px; object-fit: cover; clear: both;'
                                });
                                editor.view.dispatch(tr);
                              }
                            }
                          }}
                          title="Align Image Center"
                        >
                          <AlignCenter className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            if (!editor) return;

                            // Find all images in the document
                            const { state } = editor;
                            let lastImagePos = -1;

                            state.doc.descendants((node, pos) => {
                              if (node.type.name === 'image') {
                                lastImagePos = pos;
                              }
                            });

                            if (lastImagePos >= 0) {
                              const tr = state.tr;
                              const imageNode = tr.doc.nodeAt(lastImagePos);

                              if (imageNode) {
                                tr.setNodeMarkup(lastImagePos, null, {
                                  ...imageNode.attrs,
                                  style: 'float: right; margin: 0.5rem 0 0.5rem 1rem; max-width: 480px; width: 480px; height: 480px; object-fit: cover; clear: both;'
                                });
                                editor.view.dispatch(tr);
                              }
                            }
                          }}
                          title="Align Image Right"
                        >
                          <AlignRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Editor Content */}
                  <div className="border rounded-md min-h-[300px] p-4 prose prose-sm max-w-none">
                    <EditorContent editor={editor} />
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{formData.title || 'Blog Title Preview'}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{formData.category || 'Category'}</Badge>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {formData.author || 'Author'}
                          </span>
                          <span>{formData.readTime}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(formData.heroImageUrl ?? formData.thumbnailUrl) && (
                        <img 
                          src={formData.heroImageUrl ?? formData.thumbnailUrl} 
                          alt="Preview" 
                          className="w-full h-64 object-cover rounded-md"
                        />
                      )}
                      {formData.videoUrl && (
                        <video 
                          src={formData.videoUrl} 
                          controls 
                          className="w-full rounded-md"
                        />
                      )}
                      <p className="text-muted-foreground italic">
                        {formData.excerpt || 'Excerpt preview...'}
                      </p>
                      <div 
                        className="blog-content prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: formData.content || '<p>Content preview...</p>' }}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(blogCategories) && blogCategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="readTime">Read Time</Label>
                <Input
                  id="readTime"
                  value={formData.readTime}
                  onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                  placeholder="5 min read"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail Image (Listing) *</Label>
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFiles({ ...files, thumbnail: e.target.files?.[0] })}
                />
                {formData.thumbnailUrl && (
                  <div className="text-sm text-muted-foreground">
                    Current: {formData.thumbnailUrl}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero">Hero Image (Detail) *</Label>
                <Input
                  id="hero"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFiles({ ...files, hero: e.target.files?.[0] })}
                />
                {formData.heroImageUrl && (
                  <div className="text-sm text-muted-foreground">
                    Current: {formData.heroImageUrl}
                  </div>
                )}
              </div>
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

            <DialogFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {/* <Button 
                  type="button" 
                  variant="secondary"
                  onClick={handlePreview}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button> */}
                <Button type="submit">
                  {editingPost ? 'Update' : 'Create'} Post
                </Button>
              </div>
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

      {/* Subcategory modal is removed */}

    </div>
  );
}