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
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  createdAt?: string;
}

export default function AdminContests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contest | null>(null);
  const [form, setForm] = useState({ title: '', imageUrl: '', isActive: true, validFrom: '', validUntil: '' });
  const [files, setFiles] = useState<{ image?: File }>({});

  const { data: contests = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/contests'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const timestamp = Date.now();
      const res = await fetch(`/api/admin/contests?_t=${timestamp}`, { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } 
      });
      if (!res.ok) return [];
      return res.json();
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0
  });
  

  // RichTextEditor will manage its own TipTap editor instance.

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem('token');
      
      // Map detailedDescription to content for backend
      const apiPayload = {
        ...payload,
        content: payload.detailedDescription || '',
      };
      delete apiPayload.detailedDescription;
      
      const formData = new FormData();
      Object.entries(apiPayload).forEach(([k, v]) => formData.append(k, v as any));
      if (files.image) formData.append('image', files.image);

      const url = editing ? `/api/admin/contests/${editing.id}` : '/api/admin/contests';
      const method = editing ? 'PUT' : 'POST';
      console.log('📤 Sending contest payload, content length:', (apiPayload.content || '').toString().length);
      const res = await fetch(url, { method, body: formData, headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to save');
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/contests'] });
      await refetch();
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/contests'] });
      await refetch();
      toast({ title: 'Deleted', description: 'Contest deleted successfully' });
    }
  });

  const openEdit = (c: Contest) => {
    setEditing(c);
    setForm({ 
      title: c.title || '', 
      imageUrl: c.imageUrl || '', 
      isActive: !!c.isActive, 
      // @ts-ignore - Map 'content' from DB to 'detailedDescription' in form
      detailedDescription: (c as any).content || c.detailedDescription || '',
      validFrom: c.validFrom ? formatForInput(c.validFrom) : '',
      validUntil: c.validUntil ? formatForInput(c.validUntil) : ''
    });
    setShowModal(true);
  };

  function formatForInput(dateStr: string) {
    try {
      const d = new Date(dateStr);
      const tzOffset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - tzOffset * 60000);
      return local.toISOString().slice(0,16);
    } catch (e) {
      return '';
    }
  }

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="ghost" onClick={async () => {
            const token = localStorage.getItem('token');
            if (!token) { toast({ title: 'Auth required', description: 'Please login', variant: 'destructive' }); return; }
            try {
              const res = await fetch('/api/admin/expire-pass', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
              if (!res.ok) throw new Error('Failed');
              toast({ title: 'Done', description: 'Expire pass executed' });
              await refetch();
            } catch (e: any) {
              toast({ title: 'Error', description: e.message || 'Failed to run expire pass', variant: 'destructive' });
            }
          }}>Run Expire Pass</Button>
          <Button onClick={() => { 
            setEditing(null); 
              setForm({ 
                title: '', 
                imageUrl: '', 
                isActive: true, 
                // @ts-ignore
                detailedDescription: '',
                validFrom: '',
                validUntil: '' 
              }); 
            setShowModal(true); 
          }}>Add Contest</Button>
        </div>
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
                  <TableCell>
                    {c.validFrom || c.validUntil ? (
                      <div className="text-sm">
                        <div>{c.validFrom ? new Date(c.validFrom).toLocaleString() : '-'}</div>
                        <div className="text-xs text-muted-foreground">to {c.validUntil ? new Date(c.validUntil).toLocaleString() : '-'}</div>
                      </div>
                    ) : (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-')}
                  </TableCell>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Valid From</Label>
                <Input type="datetime-local" value={(form as any).validFrom || ''} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Start date/time when contest becomes visible</p>
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="datetime-local" value={(form as any).validUntil || ''} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">End date/time when contest ends</p>
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
