import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  phone?: string;
  email?: string;
  hours?: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminStores() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    phone: "",
    email: "",
    website: "",
    hours: "",
    latitude: "",
    longitude: "",
    isActive: true,
    sortOrder: 0,
  });

  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey: ['/api/admin/stores'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/stores?t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: false
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create store');
      return response.json();
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['/api/admin/stores'] });
      queryClient.removeQueries({ queryKey: ['/api/stores'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'], refetchType: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/stores'], type: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['/api/stores'], refetchType: 'all' });
      toast({ title: "Store created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/admin/stores/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update store');
      return response.json();
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['/api/admin/stores'] });
      queryClient.removeQueries({ queryKey: ['/api/stores'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'], refetchType: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/stores'], type: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['/api/stores'], refetchType: 'all' });
      toast({ title: "Store updated successfully" });
      setIsEditDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/stores/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
      });
      if (!response.ok) throw new Error('Failed to delete store');
      return response.json();
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['/api/admin/stores'] });
      queryClient.removeQueries({ queryKey: ['/api/stores'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/stores'], refetchType: 'all' });
      await queryClient.refetchQueries({ queryKey: ['/api/admin/stores'], type: 'all' });
      await queryClient.invalidateQueries({ queryKey: ['/api/stores'], refetchType: 'all' });
      toast({ title: "Store deleted successfully" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
      phone: "",
      email: "",
      website: "",
      hours: "",
      latitude: "",
      longitude: "",
      isActive: true,
      sortOrder: 0,
    });
    setSelectedStore(null);
  };

  const handleEdit = (store: Store) => {
    setSelectedStore(store);
    setFormData({
      name: store.name,
      address: store.address,
      city: store.city,
      state: store.state,
      country: store.country || 'India',
      pincode: store.pincode,
      phone: store.phone || "",
      email: store.email || "",
      website: store.website || "",
      hours: store.hours || "",
      latitude: store.latitude,
      longitude: store.longitude,
      isActive: store.isActive,
      sortOrder: store.sortOrder,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStore) {
      updateMutation.mutate({ id: selectedStore.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Store Locations</h2>
          <p className="text-gray-600 mt-2">Manage your store locations and details</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-pink-600 hover:bg-pink-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Store
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Stores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.city}, {store.state}</TableCell>
                  <TableCell>{store.country || 'India'}</TableCell>
                  <TableCell>{store.phone}</TableCell>
                  <TableCell>
                    {store.isActive ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(store)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(store.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStore ? 'Edit Store' : 'Add New Store'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Store Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label>Address *</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>City *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>State *</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Country *</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Pincode *</Label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Website</Label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="e.g., https://www.example.com"
                />
              </div>
              <div className="col-span-2">
                <Label>Working Hours</Label>
                <Input
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="e.g., Mon-Fri: 9:00 AM - 7:00 PM"
                />
              </div>
              <div>
                <Label>Latitude *</Label>
                <Input
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g., 19.0176"
                  required
                />
              </div>
              <div>
                <Label>Longitude *</Label>
                <Input
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g., 73.0185"
                  required
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
                {selectedStore ? 'Update' : 'Create'} Store
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}