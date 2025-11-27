import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [form, setForm] = useState<MediaItem>({ partnerName: '', title: '', description: '', imageUrl: '', videoUrl: '', redirectUrl: '', category: 'channel-partner', type: 'video', clickCount: 0, isActive: true, sortOrder: 0, metadata: '{}' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const imageBlobRef = useRef<string | null>(null);
  const videoBlobRef = useRef<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/channel-partner-videos', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load channel partner videos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ partnerName: '', title: '', description: '', imageUrl: '', videoUrl: '', redirectUrl: '', category: 'channel-partner', type: 'video', clickCount: 0, isActive: true, sortOrder: 0, metadata: '{}' });
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
    try {
      const token = localStorage.getItem('token');
      const url = editing ? `/api/admin/channel-partner-videos/${editing.id}` : '/api/admin/channel-partner-videos';
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

      let metadataToSend: any = null;
      try {
        if (typeof form.metadata === 'string') metadataToSend = JSON.parse(form.metadata || '{}');
        else metadataToSend = form.metadata || {};
      } catch (err) {
        toast({ title: 'Error', description: 'Metadata must be valid JSON', variant: 'destructive' });
        return;
      }

      const payload = { ...form, metadata: metadataToSend } as any;

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Success', description: editing ? 'Updated' : 'Created' });
      setIsModalOpen(false); resetForm(); fetchList();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to save channel partner video', variant: 'destructive' });
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return; if (!confirm('Delete this item?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/channel-partner-videos/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Deleted' }); fetchList();
    } catch (err) { console.error(err); toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' }); }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Channel Partner Videos</h2>
          <p className="text-muted-foreground mt-1">Manage channel partner videos and thumbnails</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Channel Partner Video
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Channel Partner Videos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : (
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
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(it); setForm(it); setIsModalOpen(true); }}>
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