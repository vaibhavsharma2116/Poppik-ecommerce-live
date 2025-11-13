import React, { useState, startTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Tag, Calendar, Users, TrendingUp, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


export default function PromoCodesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<any>(null);
  // Added state for searchTerm and statusFilter as they are mentioned in the changes
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');


  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    usageLimit: '',
    userUsageLimit: '1',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    isActive: true,
  });

  const { data: promoCodes = [], isLoading } = useQuery({
    queryKey: ['/api/admin/promo-codes'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/promo-codes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch promo codes');
      return response.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create promo code');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      startTransition(() => {
        setIsCreateOpen(false);
        resetForm();
      });
      toast({ title: 'Success', description: 'Promo code created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update promo code');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      startTransition(() => {
        setIsCreateOpen(false);
        setEditingCode(null);
        resetForm();
      });
      toast({ title: 'Success', description: 'Promo code updated successfully' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete promo code');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      toast({ title: 'Success', description: 'Promo code deleted successfully' });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderAmount: '',
      maxDiscount: '',
      usageLimit: '',
      userUsageLimit: '1',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      discountValue: parseFloat(formData.discountValue),
      minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : 0,
      maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      userUsageLimit: parseInt(formData.userUsageLimit) || 1,
    };

    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (code: any) => {
    startTransition(() => {
      setEditingCode(code);
      setFormData({
        code: code.code,
        description: code.description,
        discountType: code.discountType,
        discountValue: code.discountValue,
        minOrderAmount: code.minOrderAmount || '',
        maxDiscount: code.maxDiscount || '',
        usageLimit: code.usageLimit || '',
        userUsageLimit: code.userUsageLimit?.toString() || '1',
        validFrom: code.validFrom ? new Date(code.validFrom).toISOString().split('T')[0] : '',
        validUntil: code.validUntil ? new Date(code.validUntil).toISOString().split('T')[0] : '',
        isActive: code.isActive,
      });
      setIsCreateOpen(true);
    });
  };

  const sharePromoCode = (code: any) => {
    const message = `🎉 Special Offer Alert! 🎉\n\nUse promo code: ${code.code}\n${code.description}\n\nShop now at: ${window.location.origin}\n\nValid until: ${code.validUntil ? new Date(code.validUntil).toLocaleDateString('en-IN') : 'Limited time only'}`;

    navigator.clipboard.writeText(message);
    toast({
      title: "Copied!",
      description: "Promo code details copied to clipboard",
    });
  };

  const shareToWhatsApp = (code: any) => {
    const message = `🎉 *Special Offer Alert!* 🎉\n\nUse promo code: *${code.code}*\n${code.description}\n\nShop now: ${window.location.origin}\n\n${code.validUntil ? `Valid until: ${new Date(code.validUntil).toLocaleDateString('en-IN')}` : 'Limited time only!'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareToEmail = (code: any) => {
    const subject = `Exclusive Offer: ${code.code}`;
    const body = `Hi there!\n\nWe have an exclusive offer for you!\n\nPromo Code: ${code.code}\n${code.description}\n\nShop now: ${window.location.origin}\n\n${code.validUntil ? `Valid until: ${new Date(code.validUntil).toLocaleDateString('en-IN')}` : 'Limited time only!'}\n\nHappy Shopping!\nPoppik Team`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareToSocial = (code: any, platform: string) => {
    const baseUrl = window.location.origin;
    const message = `🎉 Special Offer! Use code ${code.code} - ${code.description}. Shop now: ${baseUrl}`;

    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(baseUrl)}&quote=${encodeURIComponent(message)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promo Codes</h1>
          <p className="text-gray-600 mt-1">Manage discount codes and promotions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => startTransition(() => setIsCreateOpen(open))}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              startTransition(() => {
                resetForm();
                setEditingCode(null);
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCode ? 'Edit' : 'Create'} Promo Code</DialogTitle>
              <DialogDescription>
                {editingCode ? 'Update' : 'Create a new'} promotional discount code
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SAVE10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Type *</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value) => setFormData({ ...formData, discountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Get 10% off on your order"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Value *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder={formData.discountType === 'percentage' ? '10' : '100'}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    {formData.discountType === 'percentage' ? 'Percentage value' : 'Flat amount in ₹'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Min Order Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder="500"
                  />
                </div>
              </div>

              {formData.discountType === 'percentage' && (
                <div className="space-y-2">
                  <Label>Max Discount (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Usage Limit</Label>
                  <Input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Per User Limit</Label>
                  <Input
                    type="number"
                    value={formData.userUsageLimit}
                    onChange={(e) => setFormData({ ...formData, userUsageLimit: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCode ? 'Update' : 'Create'} Promo Code
                </Button>
                <Button type="button" variant="outline" onClick={() => startTransition(() => setIsCreateOpen(false))}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <Input
            placeholder="Search by code or description..."
            value={searchTerm}
            onChange={(e) => startTransition(() => setSearchTerm(e.target.value))}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={(value) => startTransition(() => setStatusFilter(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">Loading promo codes...</CardContent>
          </Card>
        ) : promoCodes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No promo codes yet. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          promoCodes.map((code: any) => {
            const isActive = code.isActive;
            const matchesSearch = code.code.includes(searchTerm.toUpperCase()) || code.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && isActive) || (statusFilter === 'inactive' && !isActive);

            if (matchesSearch && matchesStatus) {
              return (
                <Card key={code.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-2xl font-mono">{code.code}</CardTitle>
                          <Badge variant={code.isActive ? 'default' : 'secondary'}>
                            {code.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">{code.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(code)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(code.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => sharePromoCode(code)}>Copy Link</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => shareToWhatsApp(code)}>WhatsApp</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => shareToEmail(code)}>Email</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => shareToSocial(code, 'facebook')}>Facebook</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => shareToSocial(code, 'twitter')}>Twitter</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          Discount
                        </div>
                        <div className="font-semibold">
                          {code.discountType === 'percentage'
                            ? `${code.discountValue}%`
                            : `₹${parseFloat(code.discountValue).toLocaleString('en-IN')}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Usage
                        </div>
                        <div className="font-semibold">
                          {code.usageCount} / {code.usageLimit || '∞'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Valid From
                        </div>
                        <div className="font-semibold text-sm">
                          {new Date(code.validFrom).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Valid Until
                        </div>
                        <div className="font-semibold text-sm">
                          {code.validUntil ? new Date(code.validUntil).toLocaleDateString('en-IN') : 'No expiry'}
                        </div>
                      </div>
                    </div>
                    {code.minOrderAmount && parseFloat(code.minOrderAmount) > 0 && (
                      <div className="mt-4 text-sm text-gray-600">
                        Min order: ₹{parseFloat(code.minOrderAmount).toLocaleString('en-IN')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }
            return null; // Do not render if it doesn't match filters
          })
        )}
      </div>
    </div>
  );
}