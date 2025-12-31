import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MediaItem {
  id?: number;
  affiliateName?: string;
  title: string;
  description?: string;
  imageUrl: string;
  videoUrl?: string;
  redirectUrl?: string;
  category?: string;
  type?: string;
}

export default function AdminAffiliateVideos() {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [form, setForm] = useState<MediaItem>({ title: '', imageUrl: '', videoUrl: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const imageBlobRef = useRef<string | null>(null);
  const videoBlobRef = useRef<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Cache-busting fetch with no-cache headers
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/affiliate-videos?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      console.log('Affiliate videos fetched:', data);
      const items = Array.isArray(data) ? data : [];
      // Ensure all items have proper types
      const typedItems = items.map((item: any) => ({
        ...item,
        title: item.title || '',
        imageUrl: item.imageUrl || '',
        videoUrl: item.videoUrl || '',
      }));
      setItems(typedItems);
    } catch (err) {
      console.error('Fetch error:', err);
      toast({ title: 'Error', description: 'Failed to load affiliate videos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const resetForm = () => {
    setEditing(null);
    setForm({ title: '', imageUrl: '', videoUrl: '' });
    if (imageBlobRef.current && imageBlobRef.current.startsWith('blob:')) {
      try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) { }
      imageBlobRef.current = null;
    }
    if (videoBlobRef.current && videoBlobRef.current.startsWith('blob:')) {
      try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) { }
      videoBlobRef.current = null;
    }
    setImageFile(null);
    setVideoFile(null);
  };

  useEffect(() => {
    return () => {
      if (imageBlobRef.current && imageBlobRef.current.startsWith('blob:')) {
        try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) { }
      }
      if (videoBlobRef.current && videoBlobRef.current.startsWith('blob:')) {
        try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) { }
      }
    };
  }, []);

  const handleImageSelect = (file: File | null) => {
    if (!file) {
      if (imageBlobRef.current && imageBlobRef.current.startsWith('blob:')) {
        try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) { }
        imageBlobRef.current = null;
      }
      setImageFile(null);
      setForm(prev => ({ ...prev, imageUrl: '' }));
      return;
    }
    const url = URL.createObjectURL(file);
    if (imageBlobRef.current && imageBlobRef.current.startsWith('blob:')) {
      try { URL.revokeObjectURL(imageBlobRef.current); } catch (e) { }
    }
    imageBlobRef.current = url;
    setImageFile(file);
    setForm(prev => ({ ...prev, imageUrl: url }));
  };

  const handleVideoSelect = (file: File | null) => {
    if (!file) {
      if (videoBlobRef.current && videoBlobRef.current.startsWith('blob:')) {
        try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) { }
        videoBlobRef.current = null;
      }
      setVideoFile(null);
      setForm(prev => ({ ...prev, videoUrl: '' }));
      return;
    }
    const url = URL.createObjectURL(file);
    if (videoBlobRef.current && videoBlobRef.current.startsWith('blob:')) {
      try { URL.revokeObjectURL(videoBlobRef.current); } catch (e) { }
    }
    videoBlobRef.current = url;
    setVideoFile(file);
    setForm(prev => ({ ...prev, videoUrl: url }));
  };

  const handleSave = async () => {
    if (!form.title || !form.title.trim()) { toast({ title: 'Error', description: 'Title required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editing ? `/api/admin/affiliate-videos/${editing.id}?t=${Date.now()}` : `/api/admin/affiliate-videos?t=${Date.now()}`;
      const method = editing ? 'PUT' : 'POST';

      if (imageFile) {
        const fd = new FormData(); fd.append('file', imageFile); fd.append('type', 'image');
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        if (r.ok) { const j = await r.json(); form.imageUrl = j.url; }
      }
      if (videoFile) {
        const fd = new FormData(); fd.append('file', videoFile); fd.append('type', 'video');
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        if (r.ok) { const j = await r.json(); form.videoUrl = j.url; }
      }

      const payload = {
        ...form,
        affiliateName: null,
        description: null,
        redirectUrl: null,
        category: 'affiliate',
        type: 'video',
        isActive: true,
        sortOrder: 0,
        metadata: {},
      } as any;

      const res = await fetch(url, {
        method,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Save failed');
      }
      toast({ title: 'Success', description: editing ? 'Updated' : 'Created' });
      setIsModalOpen(false);
      resetForm();
      // Fetch fresh data immediately
      await fetchList();
    } catch (err) {
      console.error('Save error:', err);
      toast({ title: 'Error', description: `Failed to save affiliate video: ${(err as Error).message}`, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm('Delete this item?')) return;
    setDeleting(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/affiliate-videos/${id}?t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Deleted' });
      // Fetch fresh data immediately
      await fetchList();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchList();
      toast({ title: 'Refreshed', description: 'Data updated successfully' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Affiliate Videos</h2>
          <p className="text-muted-foreground mt-1">Manage affiliate videos and thumbnails</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Affiliate Video
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Affiliate Videos ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No affiliate videos yet. Create one to get started.</p>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Total: {items.length} items | Shown: {items.filter(it => it.title && it.title.trim()).length} items with titles
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Thumbnail</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.filter(it => it.title && it.title.trim()).map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="text-xs text-muted-foreground">{it.id}</TableCell>
                      <TableCell>
                        {it.imageUrl && (
                          <img src={it.imageUrl} alt={it.title} className="w-12 h-12 rounded object-cover" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{it.title}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(it);
                              setForm({
                                id: it.id,
                                title: it.title || '',
                                imageUrl: it.imageUrl || '',
                                videoUrl: it.videoUrl || '',
                              });
                              setImageFile(null);
                              setVideoFile(null);
                              setIsModalOpen(true);
                            }}
                            disabled={deleting === it.id}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(it.id)}
                            disabled={deleting === it.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            {deleting === it.id ? (
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
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) { setIsModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Affiliate Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold">Title</label>
              <Input
                value={form.title || ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Enter title"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">Thumbnail URL</label>
              <div className="flex gap-2 items-end">
                <Input
                  value={form.imageUrl || ''}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="Image URL or upload below"
                />
                <input
                  ref={thumbInputRef}
                  id="thumb-upload-aff"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => thumbInputRef.current?.click()}
                  disabled={saving}
                >
                  <Upload className="w-4 h-4" /> Upload
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold">Video URL</label>
              <div className="flex gap-2 items-end">
                <Input
                  value={form.videoUrl || ''}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="Video URL or upload below"
                />
                <input
                  ref={videoInputRef}
                  id="video-upload-aff"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleVideoSelect(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={saving}
                >
                  <Upload className="w-4 h-4" /> Upload
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
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