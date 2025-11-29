
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Shield, 
  Database,
  Bell,
  Lock,
  Globe,
  RefreshCw,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MasterAdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/master-admin/settings'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/master-admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/master-admin/settings', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-admin/settings'] });
      toast({ title: "Success", description: "Settings updated successfully" });
    }
  });

  const handleSaveSettings = (section: string, data: any) => {
    updateSettingsMutation.mutate({ section, ...data });
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8 text-purple-600" />
            System Settings
          </h2>
          <p className="text-slate-600 mt-1">Configure system-wide settings and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Manage basic system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Site Name</Label>
                <Input defaultValue={settings?.siteName || "Poppik Lifestyle"} />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input defaultValue={settings?.contactEmail || "info@poppik.in"} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-slate-500">Enable to take site offline</p>
                </div>
                <Switch defaultChecked={settings?.maintenanceMode || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>User Registration</Label>
                  <p className="text-sm text-slate-500">Allow new user signups</p>
                </div>
                <Switch defaultChecked={settings?.allowRegistration ?? true} />
              </div>
              <Button onClick={() => handleSaveSettings('general', {})}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage authentication and security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-slate-500">Require 2FA for admin accounts</p>
                </div>
                <Switch defaultChecked={settings?.require2FA || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email OTP Verification</Label>
                  <p className="text-sm text-slate-500">Require email OTP on signup</p>
                </div>
                <Switch defaultChecked={settings?.requireEmailOTP ?? true} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS OTP Verification</Label>
                  <p className="text-sm text-slate-500">Require SMS OTP on signup</p>
                </div>
                <Switch defaultChecked={settings?.requireSMSOTP || false} />
              </div>
              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input type="number" defaultValue={settings?.sessionTimeout || 60} />
              </div>
              <Button onClick={() => handleSaveSettings('security', {})}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Toggles */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Feature Toggles
              </CardTitle>
              <CardDescription>Enable or disable system features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Product Reviews</Label>
                  <p className="text-sm text-slate-500">Allow customers to leave reviews</p>
                </div>
                <Switch defaultChecked={settings?.enableReviews ?? true} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Affiliate Program</Label>
                  <p className="text-sm text-slate-500">Enable affiliate marketing features</p>
                </div>
                <Switch defaultChecked={settings?.enableAffiliate ?? true} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Influencer Program</Label>
                  <p className="text-sm text-slate-500">Enable influencer collaboration</p>
                </div>
                <Switch defaultChecked={settings?.enableInfluencer ?? true} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Wishlist</Label>
                  <p className="text-sm text-slate-500">Allow users to save products</p>
                </div>
                <Switch defaultChecked={settings?.enableWishlist ?? true} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Blog</Label>
                  <p className="text-sm text-slate-500">Enable blog functionality</p>
                </div>
                <Switch defaultChecked={settings?.enableBlog ?? true} />
              </div>
              <Button onClick={() => handleSaveSettings('features', {})}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure system notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Order Notifications</Label>
                  <p className="text-sm text-slate-500">Notify on new orders</p>
                </div>
                <Switch defaultChecked={settings?.notifyOrders ?? true} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-slate-500">Alert when inventory is low</p>
                </div>
                <Switch defaultChecked={settings?.notifyLowStock ?? true} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Security Alerts</Label>
                  <p className="text-sm text-slate-500">Notify on suspicious activity</p>
                </div>
                <Switch defaultChecked={settings?.notifySecurity ?? true} />
              </div>
              <Button onClick={() => handleSaveSettings('notifications', {})}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
