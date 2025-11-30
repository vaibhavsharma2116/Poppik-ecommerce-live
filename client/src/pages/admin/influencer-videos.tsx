import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MediaItem {
  id?: number;
  influencerName?: string;
  title: string;
  description?: string;
  imageUrl: string;
  videoUrl?: string;
  redirectUrl?: string;
  category?: string;
  type?: string;
  clickCount?: number;
  isActive?: boolean;
  sortOrder?: number;
  metadata?: Record<string, any> | string;
}

export default function AdminInfluencerVideos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false); // keep for fallback while mutating
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [form, setForm] = useState<MediaItem>({ influencerName: '', title: '', description: '', imageUrl: '', videoUrl: '', redirectUrl: '', category: 'influencer', type: 'video', clickCount: 0, isActive: true, sortOrder: 0, metadata: '{}' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const imageBlobRef = useRef<string | null>(null);
  const videoBlobRef = useRef<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // React Query - auto polling and cache-busting
  const { data: items = [], isLoading } = useQuery<MediaItem[]>({
    queryKey: ['/api/admin/influencer-videos'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/influencer-videos?t=${Date.now()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const filtered = (data || []).filter((m: any) => (m.type === 'video' || m.videoUrl) && (m.category === 'influencer' || m.category === 'media'));
      return filtered;
    },
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ influencerName: '', title: '', description: '', imageUrl: '', videoUrl: '', redirectUrl: '', category: 'influencer', type: 'video', clickCount: 0, isActive: true, sortOrder: 0, metadata: '{}' } as MediaItem);
    // revoke any created object URLs
    if (imageBlobRef.current && imageBlobRef.current.startsWith('blob:')) {
      try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) { /* ignore */ }
      imageBlobRef.current = null;
    }
    if (videoBlobRef.current && videoBlobRef.current.startsWith('blob:')) {
      try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) { /* ignore */ }
      videoBlobRef.current = null;
    }
    setImageFile(null);
    setVideoFile(null);
  };

  // Helper: upload file to /api/upload and return url
  const uploadFile = async (file: File, type: 'image' | 'video') => {
    const fd = new FormData(); fd.append('file', file); fd.append('type', type);
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    if (r.ok) { const j = await r.json(); return j.url; }
    throw new Error('Upload failed');
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async ({ form, imageFile, videoFile }: any) => {
      // Create copy of form
      const payload: any = { ...form };
      if (imageFile) payload.imageUrl = await uploadFile(imageFile, 'image');
      if (videoFile) payload.videoUrl = await uploadFile(videoFile, 'video');
      // parse metadata
      try { payload.metadata = typeof payload.metadata === 'string' ? JSON.parse(payload.metadata || '{}') : payload.metadata || {}; } catch (err) { payload.metadata = {}; }
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/influencer-videos', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Create failed');
      return res.json();
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/influencer-videos'] });
      const previous = queryClient.getQueryData<MediaItem[]>(['/api/admin/influencer-videos']) || [];
      const temp: MediaItem = { ...vars.form, id: `temp-${Date.now()}` } as any;
      queryClient.setQueryData(['/api/admin/influencer-videos'], (old: any[] = []) => [temp, ...old]);
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['/api/admin/influencer-videos'], context.previous);
      toast({ title: 'Error', description: 'Failed to create', variant: 'destructive' });
    },
    onSuccess: (newItem) => {
      // Replace temp items and ensure fresh data
      queryClient.setQueryData(['/api/admin/influencer-videos'], (old: any[] = []) => [newItem, ...old.filter(i => String(i.id).indexOf('temp-') === -1)]);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/influencer-videos'] });
      toast({ title: 'Success', description: 'Created' });
      setIsModalOpen(false); resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: any) => {
      const { form, imageFile, videoFile } = payload;
      const payloadCopy: any = { ...form };
      if (imageFile) payloadCopy.imageUrl = await uploadFile(imageFile, 'image');
      if (videoFile) payloadCopy.videoUrl = await uploadFile(videoFile, 'video');
      try { payloadCopy.metadata = typeof payloadCopy.metadata === 'string' ? JSON.parse(payloadCopy.metadata || '{}') : payloadCopy.metadata || {}; } catch (err) { payloadCopy.metadata = {}; }
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/influencer-videos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: JSON.stringify(payloadCopy) });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onMutate: async ({ id, payload }: any) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/influencer-videos'] });
      const previous = queryClient.getQueryData<MediaItem[]>(['/api/admin/influencer-videos']) || [];
      queryClient.setQueryData(['/api/admin/influencer-videos'], (old: any[] = []) => old.map(i => i.id === id ? { ...i, ...payload.form } : i));
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['/api/admin/influencer-videos'], context.previous);
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['/api/admin/influencer-videos'], (old: any[] = []) => old.map(i => i.id === updated.id ? updated : i));
      queryClient.invalidateQueries({ queryKey: ['/api/admin/influencer-videos'] });
      toast({ title: 'Success', description: 'Updated' });
      setIsModalOpen(false); resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/influencer-videos/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Delete failed');
      return id;
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/influencer-videos'] });
      const previous = queryClient.getQueryData<MediaItem[]>(['/api/admin/influencer-videos']) || [];
      queryClient.setQueryData(['/api/admin/influencer-videos'], (old: any[] = []) => old.filter(i => i.id !== id));
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['/api/admin/influencer-videos'], context.previous);
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/influencer-videos'] });
      toast({ title: 'Deleted' });
      resetForm();
    }
  });

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (imageBlobRef.current && imageBlobRef.current.startsWith('blob:')) {
        try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) {}
      }
      if (videoBlobRef.current && videoBlobRef.current.startsWith('blob:')) {
        try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) {}
      }
    };
  }, []);

  const handleImageSelect = (file: File | null) => {
    if (!file) {
      // clear preview
      if (imageBlobRef.current && imageBlobRef.current.startsWith('blob:')) {
        try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) {}
        imageBlobRef.current = null;
      }
      setImageFile(null);
      setForm(prev => ({ ...prev, imageUrl: '' }));
      return;
    }
    // create local preview and defer upload until Save
    const url = URL.createObjectURL(file);
    if (imageBlobRef.current && imageBlobRef.current.startsWith('blob:')) {
      try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) {}
    }
    imageBlobRef.current = url;
    setImageFile(file);
    setForm(prev => ({ ...prev, imageUrl: url }));
  };

  const handleVideoSelect = (file: File | null) => {
    if (!file) {
      if (videoBlobRef.current && videoBlobRef.current.startsWith('blob:')) {
        try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) {}
        videoBlobRef.current = null;
      }
      setVideoFile(null);
      setForm(prev => ({ ...prev, videoUrl: '' }));
      return;
    }
    const url = URL.createObjectURL(file);
    if (videoBlobRef.current && videoBlobRef.current.startsWith('blob:')) {
      try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) {}
    }
    videoBlobRef.current = url;
    setVideoFile(file);
    setForm(prev => ({ ...prev, videoUrl: url }));
  };

  const handleSave = async () => {
    if (!form.title || !form.title.trim()) { toast({ title: 'Error', description: 'Title required', variant: 'destructive' }); return; }
    // Call mutation with form and files
    const payload = { form, imageFile, videoFile };
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id?: number) => {
    if (!id) return; if (!confirm('Delete this item?')) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Influencer Videos</h2>
          <p className="text-muted-foreground mt-1">Manage influencer-submitted videos and thumbnails</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Influencer Video
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Influencer Videos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <img src={it.imageUrl} alt={it.title} className="w-12 h-12 rounded object-cover" />
                    </TableCell>
                    <TableCell>{it.title}</TableCell>
                    <TableCell>{it.category}</TableCell>
                    <TableCell>{it.isActive ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { 
                          const formData = { ...it };
                          setEditing(it); 
                          setForm(formData); 
                          setIsModalOpen(true); 
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(it.id)}>
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

      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) { setIsModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Influencer Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold">Influencer Name</label>
              <Input 
                value={form.influencerName || ''} 
                onChange={(e) => setForm({ ...form, influencerName: e.target.value })}
                placeholder="Enter influencer name (e.g., bb, aaa)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-semibold">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" rows={3} />
            </div>

            <div>
              <label className="block text-sm font-semibold">Thumbnail URL</label>
              <div className="flex gap-2 items-end">
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
                <input ref={thumbInputRef} id="thumb-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e.target.files?.[0] || null)} />
                <Button variant="outline" size="sm" onClick={() => thumbInputRef.current?.click()}><Upload className="w-4 h-4" /> Upload</Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold">Video URL</label>
              <div className="flex gap-2 items-end">
                <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
                <input ref={videoInputRef} id="video-upload" type="file" accept="video/*" className="hidden" onChange={(e) => handleVideoSelect(e.target.files?.[0] || null)} />
                <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()}><Upload className="w-4 h-4" /> Upload</Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold">Redirect URL</label>
              <Input value={form.redirectUrl} onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded">
                  <option value="influencer">Influencer</option>
                  <option value="media">Media</option>
                  <option value="featured">Featured</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded">
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="image">Image</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold">Sort Order</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-semibold">Active</label>
                <div className="mt-2">
                  <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold">Metadata (JSON)</label>
              <textarea value={typeof form.metadata === 'string' ? form.metadata : JSON.stringify(form.metadata || {}, null, 2)} onChange={(e) => setForm({ ...form, metadata: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" rows={4} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}