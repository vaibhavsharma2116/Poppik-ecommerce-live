import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Percent, Gift, IndianRupee } from "lucide-react";

export default function AffiliateSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    commissionRate: '',
    userDiscountPercentage: '',
    maxDiscountAmount: '',
    minOrderAmount: '',
  });

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/admin/affiliate-settings'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/affiliate-settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    }
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        commissionRate: settings.commissionRate || '',
        userDiscountPercentage: settings.userDiscountPercentage || '',
        maxDiscountAmount: settings.maxDiscountAmount || '',
        minOrderAmount: settings.minOrderAmount || '',
      });
    }
  }, [settings]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/affiliate-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/affiliate-settings'] });
      toast({ 
        title: "Success", 
        description: "Affiliate settings updated successfully" 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Affiliate Settings
        </h1>
        <p className="text-gray-600 mt-1">Manage commission rates and discount offers for affiliates</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-purple-600" />
              Commission Settings
            </CardTitle>
            <CardDescription>Configure how much commission affiliates earn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                  placeholder="10"
                  required
                />
                <p className="text-xs text-gray-500">Percentage of sale amount affiliates will earn</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              User Discount Settings
            </CardTitle>
            <CardDescription>Configure discount for users coming through affiliate links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>User Discount (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.userDiscountPercentage}
                  onChange={(e) => setFormData({ ...formData, userDiscountPercentage: e.target.value })}
                  placeholder="5"
                  required
                />
                <p className="text-xs text-gray-500">Discount percentage for users using affiliate links</p>
              </div>

              <div className="space-y-2">
                <Label>Max Discount Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                  placeholder="500"
                />
                <p className="text-xs text-gray-500">Maximum discount amount (leave empty for unlimited)</p>
              </div>

              <div className="space-y-2">
                <Label>Minimum Order Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">Minimum cart value to apply affiliate discount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={updateMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>

      {/* Preview Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-lg">Current Configuration Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <span className="font-medium">Affiliate Commission Rate:</span>
            <span className="text-purple-600 font-bold">{formData.commissionRate || '0'}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <span className="font-medium">User Discount:</span>
            <span className="text-green-600 font-bold">{formData.userDiscountPercentage || '0'}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <span className="font-medium">Max Discount Cap:</span>
            <span className="text-blue-600 font-bold">
              {formData.maxDiscountAmount ? `₹${formData.maxDiscountAmount}` : 'Unlimited'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <span className="font-medium">Min Order Amount:</span>
            <span className="text-orange-600 font-bold">₹{formData.minOrderAmount || '0'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}