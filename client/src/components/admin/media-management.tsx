import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Eye, EyeOff, Search, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MediaLink {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  videoUrl?: string;
  redirectUrl: string;
  category: string;
  type: string;
  clickCount: number;
  isActive: boolean;
  sortOrder: number;
  validFrom?: string;
  validUntil?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export default function MediaManagement() {
  const [mediaList, setMediaList] = useState<MediaLink[]>([]);
  const [filteredList, setFilteredList] = useState<MediaLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'clicks' | 'alphabetic'>('recent');
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    redirectUrl: '',
    category: 'media',
    type: 'image',
    isActive: true,
    sortOrder: 0,
    validFrom: '',
    validUntil: '',
  });
  const { toast } = useToast();

  // Fetch media list
  const fetchMediaList = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/media', {
        cache: 'no-store',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setMediaList(data);
        applyFiltersAndSort(data);
      } else {
        toast({ title: 'Error', description: 'Failed to fetch media', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({ title: 'Error', description: 'Failed to fetch media', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const applyFiltersAndSort = (list: MediaLink[]) => {
    let filtered = list;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(m => m.category === filterCategory);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => m.isActive === (filterStatus === 'active'));
    }

    // Sorting
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'clicks':
        filtered.sort((a, b) => b.clickCount - a.clickCount);
        break;
      case 'alphabetic':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    setFilteredList(filtered);
  };

  useEffect(() => {
    // initial load
    fetchMediaList();

    // subscribe to server-sent events for instant updates
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/media/stream');
      es.addEventListener('media', (e: MessageEvent) => {
        try {
          const payload = JSON.parse((e as any).data);
          if (!payload || !payload.action) return;
          switch (payload.action) {
            case 'create': {
              setMediaList(prev => {
                const next = [payload.item, ...prev];
                applyFiltersAndSort(next);
                return next;
              });
              break;
            }
            case 'update': {
              setMediaList(prev => {
                const idx = prev.findIndex(p => p.id === payload.item.id);
                if (idx === -1) return prev;
                const copy = [...prev];
                copy[idx] = payload.item;
                applyFiltersAndSort(copy);
                return copy;
              });
              break;
            }
            case 'delete': {
              setMediaList(prev => {
                const next = prev.filter(p => p.id !== payload.item.id);
                applyFiltersAndSort(next);
                return next;
              });
              break;
            }
            case 'reorder': {
              if (Array.isArray(payload.items)) {
                setMediaList(payload.items);
                applyFiltersAndSort(payload.items);
              }
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.warn('Error processing media SSE event:', err);
        }
      });
      es.onerror = () => {
        // EventSource will auto-reconnect; you can add logging here
      };
    } catch (e) {
      console.warn('SSE not available:', e);
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  useEffect(() => {
    applyFiltersAndSort(mediaList);
  }, [searchQuery, filterCategory, filterType, filterStatus, sortBy]);

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      videoUrl: '',
      redirectUrl: '',
      category: 'media',
      type: 'image',
      isActive: true,
      sortOrder: 0,
      validFrom: '',
      validUntil: '',
    });
    setEditingId(null);
    setImagePreview(null);
    setVideoPreview(null);
  };

  // Save media
  const handleSaveMedia = async () => {
    // Only validate required fields (marked with *)
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    
    // Image URL required for image type, video URL required for video type
    if (formData.type === 'image' && !formData.imageUrl.trim()) {
      toast({ title: 'Error', description: 'Image URL is required for image type', variant: 'destructive' });
      return;
    }
    if (formData.type === 'video' && !formData.videoUrl.trim()) {
      toast({ title: 'Error', description: 'Video URL is required for video type', variant: 'destructive' });
      return;
    }
    
    if (!formData.redirectUrl.trim()) {
      toast({ title: 'Error', description: 'Redirect URL is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const url = editingId ? `/api/admin/media/${editingId}` : '/api/admin/media';
      const method = editingId ? 'PUT' : 'POST';
      const token = localStorage.getItem('token');

      console.log('Saving media:', { url, method, editingId, formData });

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(formData)
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        toast({ title: 'Success', description: editingId ? 'Media updated successfully' : 'Media created successfully' });
        resetForm();
        fetchMediaList();
      } else {
        const errorMessage = responseData.details || responseData.error || 'Failed to save media';
        console.error('Error response:', responseData);
        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error saving media:', error);
      toast({ title: 'Error', description: (error as Error).message || 'Failed to save media', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Edit media
  const handleEditMedia = (media: MediaLink) => {
    console.log('Editing media:', media);
    setFormData({
      title: media.title,
      description: media.description || '',
      imageUrl: media.imageUrl,
      videoUrl: media.videoUrl || '',
      redirectUrl: media.redirectUrl,
      category: media.category,
      type: media.type,
      isActive: media.isActive,
      sortOrder: media.sortOrder,
      validFrom: media.validFrom ? new Date(media.validFrom).toISOString().split('T')[0] : '',
      validUntil: media.validUntil ? new Date(media.validUntil).toISOString().split('T')[0] : '',
    });
    setImagePreview(media.imageUrl);
    setVideoPreview(media.videoUrl || null);
    setEditingId(media.id);
    setIsFormOpen(true);
  };

  // Delete media
  const handleDeleteMedia = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/media/${id}`, { 
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Media deleted successfully' });
        fetchMediaList();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.details || errorData.error || 'Failed to delete media';
        console.error('Delete error response:', errorData);
        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({ title: 'Error', description: (error as Error).message || 'Failed to delete media', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image size must be less than 5MB', variant: 'destructive' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload a valid image file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formDataToSend = new FormData();
      formDataToSend.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          imageUrl: data.imageUrl
        }));
        toast({ title: 'Success', description: 'Image uploaded successfully' });
      } else {
        toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // Handle video upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Video size must be less than 100MB', variant: 'destructive' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({ title: 'Error', description: 'Please upload a valid video file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formDataToSend = new FormData();
      formDataToSend.append('video', file);

      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          videoUrl: data.videoUrl
        }));
        toast({ title: 'Success', description: 'Video uploaded successfully' });
      } else {
        toast({ title: 'Error', description: 'Failed to upload video', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({ title: 'Error', description: 'Failed to upload video', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (media: MediaLink) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const updatedData = { ...media, isActive: !media.isActive };
      console.log('Toggling active status:', updatedData);
      
      const response = await fetch(`/api/admin/media/${media.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(updatedData)
      });

      console.log('Toggle response status:', response.status);

      if (response.ok) {
        fetchMediaList();
        toast({ title: 'Success', description: `Media ${!media.isActive ? 'activated' : 'deactivated'}` });
      } else {
        const errorData = await response.json();
        console.error('Toggle error:', errorData);
        toast({ title: 'Error', description: 'Failed to update media status', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating media:', error);
      toast({ title: 'Error', description: 'Failed to update media status', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Media Management</h1>
          <p className="text-gray-600 mt-2">Manage your media library, images, and redirects</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Media', value: mediaList.length, color: 'from-blue-500 to-blue-600' },
            { label: 'Active', value: mediaList.filter(m => m.isActive).length, color: 'from-green-500 to-green-600' },
            { label: 'Inactive', value: mediaList.filter(m => !m.isActive).length, color: 'from-red-500 to-red-600' },
            { label: 'Total Clicks', value: mediaList.reduce((sum, m) => sum + m.clickCount, 0), color: 'from-purple-500 to-purple-600' }
          ].map((stat, index) => (
            <Card key={index} className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <div className="h-6 w-6 text-white">📊</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Controls */}
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search media by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setIsFormOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-10"
              >
                <Upload className="w-4 h-4" />
                Add New Media
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Modal Overlay */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white shadow-2xl border-0">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Upload className="h-5 w-5 text-purple-600" />
                  </div>
                  {editingId ? '✏️ Edit Media' : '➕ Add Media'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Title *</label>
                    <Input
                      name="title"
                      placeholder="Enter title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="border-gray-300"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Category</label>
                    <select
                      name="category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="media">Media</option>
                      <option value="press">Press</option>
                      <option value="featured">Featured</option>
                      <option value="news">News</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Type</label>
                    <select
                      name="type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="carousel">Carousel</option>
                    </select>
                  </div>

                  {formData.type === 'image' && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Image URL *</label>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            name="imageUrl"
                            placeholder="https://example.com/image.jpg"
                            value={formData.imageUrl}
                            onChange={handleInputChange}
                            className="border-gray-300"
                          />
                        </div>
                        <div>
                          <input
                            id="image-upload-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading}
                            className="gap-2"
                            onClick={() => document.getElementById('image-upload-input')?.click()}
                          >
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Upload'}
                          </Button>
                        </div>
                      </div>
                      {imagePreview && (
                        <div className="mt-3">
                          <img src={imagePreview} alt="Preview" className="w-full h-24 object-cover rounded-lg border-2 border-purple-300" />
                        </div>
                      )}
                    </div>
                  )}

                  {formData.type === 'video' && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Video URL *</label>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            name="videoUrl"
                            placeholder="https://example.com/video.mp4"
                            value={formData.videoUrl}
                            onChange={handleInputChange}
                            className="border-gray-300"
                          />
                        </div>
                        <div>
                          <input
                            id="video-upload-input"
                            type="file"
                            accept="video/*"
                            onChange={handleVideoUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading}
                            className="gap-2"
                            onClick={() => document.getElementById('video-upload-input')?.click()}
                          >
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Upload'}
                          </Button>
                        </div>
                      </div>
                      {videoPreview && (
                        <div className="mt-3">
                          <video src={videoPreview} controls className="w-full h-24 rounded-lg border-2 border-purple-300" />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Redirect URL *</label>
                    <Input
                      name="redirectUrl"
                      placeholder="https://example.com/page"
                      value={formData.redirectUrl}
                      onChange={handleInputChange}
                      className="border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Description</label>
                    <textarea
                      name="description"
                      placeholder="Enter description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      rows={2}
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <label className="text-sm font-semibold text-gray-700 cursor-pointer">Active</label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={handleSaveMedia}
                      disabled={loading}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    >
                      {editingId ? '💾 Update' : '➕ Create'}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsFormOpen(false);
                        resetForm();
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      ❌ Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 gap-6">
          {/* Main Content - Media List */}
          <div>
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Category</label>
                  <select
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="media">Media</option>
                    <option value="press">Press</option>
                    <option value="featured">Featured</option>
                    <option value="news">News</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Type</label>
                  <select
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="carousel">Carousel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Status</label>
                  <select
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">Sort By</label>
                  <select
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="recent">Recent</option>
                    <option value="oldest">Oldest</option>
                    <option value="clicks">Most Clicks</option>
                    <option value="alphabetic">A-Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Media List */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>📋 Media List ({filteredList.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 font-semibold">Loading...</p>
                  </div>
                ) : filteredList.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 font-semibold">No media found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Image</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Title</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Category</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-700">Clicks</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-700">Status</th>
                          <th className="px-4 py-3 text-center font-bold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredList.map((media, idx) => (
                          <tr key={media.id} className={`border-b border-gray-100 hover:bg-purple-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="px-4 py-3">
                              <img 
                                src={media.imageUrl} 
                                alt={media.title}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-semibold text-gray-800">{media.title}</p>
                                <p className="text-xs text-gray-500">{media.type}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                {media.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-purple-600">{media.clickCount}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleToggleActive(media)}
                                className="inline-flex items-center justify-center"
                              >
                                {media.isActive ? (
                                  <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">🟢 Active</span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">🔴 Inactive</span>
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 justify-center">
                                <Button
                                  onClick={() => handleEditMedia(media)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                >
                                  ✏️
                                </Button>
                                <Button
                                  onClick={() => handleDeleteMedia(media.id)}
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 w-8 p-0"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
