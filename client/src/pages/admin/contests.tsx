import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Using shared RichTextEditor component instead of creating a local editor
import RichTextEditor from '@/components/admin/rich-text-editor';
import { useToast } from '@/hooks/use-toast';

interface Contest {
  id: number;
  title: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  detailedDescription?: string;
  isActive?: boolean;
  createdAt?: string;
}

export default function AdminContests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contest | null>(null);
  const [form, setForm] = useState({ title: '', imageUrl: '', isActive: true });
  const [files, setFiles] = useState<{ image?: File }>({});

  const { data: contests = [], isLoading } = useQuery({
    queryKey: ['/api/admin/contests'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/contests', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    }
  });

  // RichTextEditor will manage its own TipTap editor instance.

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => formData.append(k, v as any));
      if (files.image) formData.append('image', files.image);

      const url = editing ? `/api/admin/contests/${editing.id}` : '/api/admin/contests';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: formData, headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to save');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contests'] });
      setShowModal(false);
      setEditing(null);
      setForm({ title: '', imageUrl: '', isActive: true, // @ts-ignore
        detailedDescription: '' });
      setFiles({});
      toast({ title: 'Saved', description: 'Contest saved successfully' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/contests/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/contests'] })
  });

  const openEdit = (c: Contest) => {
    setEditing(c);
    setForm({ title: c.title || '', imageUrl: c.imageUrl || '', isActive: !!c.isActive, // @ts-ignore
      detailedDescription: c.detailedDescription || '' });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // backend expects `isActive` boolean; ensure it's present
    const payload: any = { ...form, detailedDescription: (form as any).detailedDescription || '', isActive: !!(form as any).isActive };
    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contest Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage contests and banners</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ title: '', imageUrl: '', isActive: true, // @ts-ignore
          detailedDescription: '' }); setShowModal(true); }}>Add Contest</Button>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(contests) && contests.map((c: Contest) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.isActive ? 'Published' : 'Draft'}</TableCell>
                  <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(c.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Contest' : 'Add Contest'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              {/* Short Description removed per request */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Featured Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setFiles({ ...files, image: e.target.files?.[0] })} />
                {form.imageUrl && <div className="text-sm mt-2">Current: {form.imageUrl}</div>}
              </div>
            </div>

            <div>
              <Label>Detailed Content</Label>
              <RichTextEditor
                content={(form as any).detailedDescription || ''}
                onChange={(c) => setForm((s) => ({ ...s, // @ts-ignore
                  detailedDescription: c }))}
              />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                <Input type="checkbox" checked={(form as any).isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <Label>Published</Label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
