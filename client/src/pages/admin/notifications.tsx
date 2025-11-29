import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!title || !body) {
      toast({ title: 'Validation', description: 'Title and body are required', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      // Normalize URL: make absolute if user entered a relative path
      let finalUrl = url?.trim() || '';
      try {
        if (finalUrl && !finalUrl.startsWith('http')) {
          // If it starts with '/', join with origin, else append '/' then join
          const prefix = finalUrl.startsWith('/') ? '' : '/';
          finalUrl = window.location.origin + prefix + finalUrl;
        }
      } catch (e) {
        // In non-browser environments leave as-is
      }

      const resp = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, body, image, url: finalUrl })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(err.message || 'Failed to send');
      }

      const data = await resp.json();
      toast({ title: 'Notifications Sent', description: `Sent to ${data.sent}/${data.total}` });
      setTitle(''); setBody(''); setImage(''); setUrl('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/admin/notifications/subscribers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Failed to load subscribers');
      const data = await resp.json();
      // add selected flag
      setSubscribers(data.map((s: any) => ({ ...s, selected: false })));
    } catch (err) {
      console.error('Failed to fetch subscribers', err);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const toggleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSubscribers(prev => prev.map(s => ({ ...s, selected: checked })));
  };

  const toggleSelect = (id: number) => {
    setSubscribers(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
  };

  const handleSendSelected = async () => {
    const selectedIds = subscribers.filter(s => s.selected).map(s => s.id);
    if (selectedIds.length === 0) {
      toast({ title: 'Selection', description: 'No subscribers selected', variant: 'destructive' });
      return;
    }

    if (!title || !body) {
      toast({ title: 'Validation', description: 'Title and body are required', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, body, image, url, recipients: selectedIds })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(err.message || 'Failed to send');
      }

      const data = await resp.json();
      toast({ title: 'Notifications Sent', description: `Sent to ${data.sent}/${data.total}` });
      setTitle(''); setBody(''); setImage(''); setUrl('');
      // refresh list
      fetchSubscribers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Send Notification to Subscribers</h2>
      <div className="max-w-2xl">
        <label className="block text-sm font-medium mb-1">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
        <label className="block text-sm font-medium mt-4 mb-1">Message</label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Message body" />
        <label className="block text-sm font-medium mt-4 mb-1">Image URL (optional)</label>
        <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
        <label className="block text-sm font-medium mt-4 mb-1">Link (optional)</label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/offers" />

        <div className="mt-6">
          <div className="flex items-center space-x-3">
            <Button onClick={handleSend} disabled={sending}>{sending ? 'Sending...' : 'Send to All Subscribers'}</Button>
            <Button variant="secondary" onClick={handleSendSelected} disabled={sending}>{sending ? 'Sending...' : 'Send to Selected'}</Button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-3">Subscribers ({subscribers.length})</h3>
        <div className="overflow-x-auto bg-white rounded shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left"><input type="checkbox" checked={selectAll} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Active</th>
                <th className="px-3 py-2 text-left">Last Used</th>
                <th className="px-3 py-2 text-left">Endpoint (preview)</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2"><input type="checkbox" checked={!!s.selected} onChange={() => toggleSelect(s.id)} /></td>
                  <td className="px-3 py-2">{s.email || <span className="text-gray-500">(no email)</span>}</td>
                  <td className="px-3 py-2">{s.isActive ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{s.lastUsedAt ? new Date(s.lastUsedAt).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2"><code className="text-xs break-all">{s.endpointPreview || '-'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
