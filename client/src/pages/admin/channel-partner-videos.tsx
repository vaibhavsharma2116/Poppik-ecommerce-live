import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MediaItem {
  id?: number;
  partnerName?: string;
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

export default function AdminChannelPartnerVideos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [form, setForm] = useState<MediaItem>({ partnerName: '', title: '', description: '', imageUrl: '', videoUrl: '', redirectUrl: '', category: 'channel-partner', type: 'video', clickCount: 0, isActive: true, sortOrder: 0, metadata: '{}' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const imageBlobRef = useRef<string | null>(null);
  const videoBlobRef = useRef<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // AGGRESSIVE NO-CACHE CONFIG - React Query
  const { data: items = [], isLoading, refetch: refetchList } = useQuery<MediaItem[]>({
    queryKey: ['/api/admin/channel-partner-videos'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');
      const res = await fetch(`/api/admin/channel-partner-videos?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch channel partner videos');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: true
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ partnerName: '', title: '', description: '', imageUrl: '', videoUrl: '', redirectUrl: '', category: 'channel-partner', type: 'video', clickCount: 0, isActive: true, sortOrder: 0, metadata: '{}' });
    if (imageBlobRef.current?.startsWith('blob:')) {
      try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) { }
      imageBlobRef.current = null;
    }
    if (videoBlobRef.current?.startsWith('blob:')) {
      try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) { }
      videoBlobRef.current = null;
    }
    setImageFile(null);
    setVideoFile(null);
  };

  const handleImageSelect = (file: File | null) => {
    if (!file) {
      if (imageBlobRef.current?.startsWith('blob:')) {
        try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) { }
        imageBlobRef.current = null;
      }
      setImageFile(null);
      setForm(prev => ({ ...prev, imageUrl: '' }));
      return;
    }
    const url = URL.createObjectURL(file);
    if (imageBlobRef.current?.startsWith('blob:')) {
      try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) { }
    }
    imageBlobRef.current = url;
    setImageFile(file);
    setForm(prev => ({ ...prev, imageUrl: url }));
  };

  const handleVideoSelect = (file: File | null) => {
    if (!file) {
      if (videoBlobRef.current?.startsWith('blob:')) {
        try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) { }
        videoBlobRef.current = null;
      }
      setVideoFile(null);
      setForm(prev => ({ ...prev, videoUrl: '' }));
      return;
    }
    const url = URL.createObjectURL(file);
    if (videoBlobRef.current?.startsWith('blob:')) {
      try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) { }
    }
    videoBlobRef.current = url;
    setVideoFile(file);
    setForm(prev => ({ ...prev, videoUrl: url }));
  };

  // Save mutation - handles both create and update with optimistic updates
  const saveMutation = useMutation<any, Error, MediaItem>({
    mutationFn: async (payloadForm) => {
      const token = localStorage.getItem('token');
      // work on local copy to avoid mutating React state directly
      const local = { ...payloadForm } as any;

      // upload files if present
      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        fd.append('type', 'image');
        const r = await fetch('/api/upload', {
          method: 'POST',
          body: fd,
          headers: { 'Cache-Control': 'no-store' }
        });
        if (r.ok) {
          const j = await r.json();
          local.imageUrl = j.url;
        }
      }

      if (videoFile) {
        const fd = new FormData();
        fd.append('file', videoFile);
        fd.append('type', 'video');
        const r = await fetch('/api/upload', {
          method: 'POST',
          body: fd,
          headers: { 'Cache-Control': 'no-store' }
        });
        if (r.ok) {
          const j = await r.json();
          local.videoUrl = j.url;
        }
      }

      let metadataToSend: any = null;
      try {
        if (typeof local.metadata === 'string') metadataToSend = JSON.parse(local.metadata || '{}');
        else metadataToSend = local.metadata || {};
      } catch (err) {
        throw new Error('Metadata must be valid JSON');
      }

      const payload = { ...local, metadata: metadataToSend } as any;

      const url = payload.id
        ? `/api/admin/channel-partner-videos/${payload.id}?t=${Date.now()}`
        : `/api/admin/channel-partner-videos?t=${Date.now()}`;
      const method = payload.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/channel-partner-videos'] });
      const previousItems = queryClient.getQueryData<MediaItem[]>(['/api/admin/channel-partner-videos']) || [];
      let next;
      if (newItem.id) {
        next = previousItems.map(it => it.id === newItem.id ? { ...it, ...newItem } : it);
      } else {
        // assign a temporary negative id so key is unique locally
        const tempId = Date.now() * -1;
        next = [...previousItems, { ...newItem, id: tempId } as any];
      }
      queryClient.setQueryData(['/api/admin/channel-partner-videos'], next);
      // close modal immediately for snappy UX
      setIsModalOpen(false);
      return { previousItems };
    },
    onError: (err, newItem, context: any) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['/api/admin/channel-partner-videos'], context.previousItems);
      }
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    },
    onSuccess: async (data, variables, context) => {
      // ensure server state replaces optimistic state
      const previousItems = queryClient.getQueryData<MediaItem[]>(['/api/admin/channel-partner-videos']) || [];
      if (variables.id) {
        const updated = previousItems.map(item => item.id === variables.id || (item.id && item.id < 0 && item.title === variables.title) ? data : item);
        queryClient.setQueryData(['/api/admin/channel-partner-videos'], updated);
      } else {
        // remove any temp item and add the returned item
        const filtered = previousItems.filter(item => !(item.id && item.id < 0 && item.title === variables.title));
        queryClient.setQueryData(['/api/admin/channel-partner-videos'], [...filtered, data]);
      }
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/channel-partner-videos'] });
      await refetchList();
      toast({ title: 'Success', description: variables.id ? 'Updated instantly!' : 'Created instantly!' });
    }
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation<any, Error, number>({
    mutationFn: async (id: number) => {
      if (!confirm('Delete this item?')) throw new Error('Cancelled');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/channel-partner-videos/${id}?t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/channel-partner-videos'] });
      const previousItems = queryClient.getQueryData<MediaItem[]>(['/api/admin/channel-partner-videos']) || [];
      queryClient.setQueryData(['/api/admin/channel-partner-videos'], previousItems.filter(i => i.id !== id));
      return { previousItems };
    },
    onError: (err, id, context: any) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['/api/admin/channel-partner-videos'], context.previousItems);
      }
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to delete', variant: 'destructive' });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/channel-partner-videos'] });
      await refetchList();
      toast({ title: 'Deleted instantly!' });
    }
  });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Channel Partner Videos</h2>
          <p className="text-muted-foreground mt-1">Manage channel partner videos and thumbnails - Instant Updates</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchList()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Channel Partner Video
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Channel Partner Videos ({(Array.isArray(items) ? items : []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (Array.isArray(items) ? items : []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No channel partner videos yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(items) ? items : []).map((it) => (
                  <TableRow key={it.id}>
                      <TableCell>
                        {it.imageUrl && (
                          <img src={it.imageUrl} alt={it.title || it.partnerName} className="w-12 h-12 rounded object-cover" />
                        )}
                      </TableCell>
                      <TableCell>{it.partnerName || '-'}</TableCell>
                      <TableCell>{it.title || '-'}</TableCell>
                      <TableCell>{it.category}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${it.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {it.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(it);
                            setForm(it);
                            setImageFile(null);
                            setVideoFile(null);
                            setIsModalOpen(true);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => it.id && deleteMutation.mutate(it.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          {deleteMutation.isPending ? (
                            <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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
            <DialogTitle>{editing ? 'Edit' : 'Add'} Channel Partner Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold">Partner Name</label>
              <Input value={form.partnerName} onChange={(e) => setForm({ ...form, partnerName: e.target.value })} />
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
                <input ref={thumbInputRef} id="thumb-upload-cp" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e.target.files?.[0] || null)} />
                <Button variant="outline" size="sm" onClick={() => thumbInputRef.current?.click()}><Upload className="w-4 h-4" /> Upload</Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold">Video URL</label>
              <div className="flex gap-2 items-end">
                <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
                <input ref={videoInputRef} id="video-upload-cp" type="file" accept="video/*" className="hidden" onChange={(e) => handleVideoSelect(e.target.files?.[0] || null)} />
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
                  <option value="channel-partner">Channel Partner</option>
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

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate({ ...form, id: editing?.id })} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {editing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editing ? 'Update' : 'Create'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}