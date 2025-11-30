
import { useState, useEffect } from 'react';
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
  Bell,
  Lock,
  Globe,
  RefreshCw,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsState {
  siteName: string;
  contactEmail: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  require2FA: boolean;
  requireEmailOTP: boolean;
  requireSMSOTP: boolean;
  sessionTimeout: number;
  enableReviews: boolean;
  enableAffiliate: boolean;
  enableInfluencer: boolean;
  enableWishlist: boolean;
  enableBlog: boolean;
  notifyOrders: boolean;
  notifyLowStock: boolean;
  notifySecurity: boolean;
}

const defaultSettings: SettingsState = {
  siteName: "Poppik Lifestyle",
  contactEmail: "info@poppik.in",
  maintenanceMode: false,
  allowRegistration: true,
  require2FA: false,
  requireEmailOTP: true,
  requireSMSOTP: false,
  sessionTimeout: 60,
  enableReviews: true,
  enableAffiliate: true,
  enableInfluencer: true,
  enableWishlist: true,
  enableBlog: true,
  notifyOrders: true,
  notifyLowStock: true,
  notifySecurity: true,
};

export default function MasterAdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<SettingsState>(defaultSettings);

  const { data: settingsData, isLoading } = useQuery({
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

  useEffect(() => {
    if (settingsData && Array.isArray(settingsData)) {
      const settingsMap: Record<string, string> = {};
      settingsData.forEach((s: any) => {
        settingsMap[s.settingKey] = s.settingValue;
      });
      
      setFormState({
        siteName: settingsMap.siteName || defaultSettings.siteName,
        contactEmail: settingsMap.contactEmail || defaultSettings.contactEmail,
        maintenanceMode: settingsMap.maintenanceMode === 'true',
        allowRegistration: settingsMap.allowRegistration !== 'false',
        require2FA: settingsMap.require2FA === 'true',
        requireEmailOTP: settingsMap.requireEmailOTP !== 'false',
        requireSMSOTP: settingsMap.requireSMSOTP === 'true',
        sessionTimeout: parseInt(settingsMap.sessionTimeout) || 60,
        enableReviews: settingsMap.enableReviews !== 'false',
        enableAffiliate: settingsMap.enableAffiliate !== 'false',
        enableInfluencer: settingsMap.enableInfluencer !== 'false',
        enableWishlist: settingsMap.enableWishlist !== 'false',
        enableBlog: settingsMap.enableBlog !== 'false',
        notifyOrders: settingsMap.notifyOrders !== 'false',
        notifyLowStock: settingsMap.notifyLowStock !== 'false',
        notifySecurity: settingsMap.notifySecurity !== 'false',
      });
    }
  }, [settingsData]);

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
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  });

  const handleSaveGeneral = () => {
    updateSettingsMutation.mutate({
      section: 'general',
      siteName: formState.siteName,
      contactEmail: formState.contactEmail,
      maintenanceMode: formState.maintenanceMode,
      allowRegistration: formState.allowRegistration,
    });
  };

  const handleSaveSecurity = () => {
    updateSettingsMutation.mutate({
      section: 'security',
      require2FA: formState.require2FA,
      requireEmailOTP: formState.requireEmailOTP,
      requireSMSOTP: formState.requireSMSOTP,
      sessionTimeout: formState.sessionTimeout,
    });
  };

  const handleSaveFeatures = () => {
    updateSettingsMutation.mutate({
      section: 'features',
      enableReviews: formState.enableReviews,
      enableAffiliate: formState.enableAffiliate,
      enableInfluencer: formState.enableInfluencer,
      enableWishlist: formState.enableWishlist,
      enableBlog: formState.enableBlog,
    });
  };

  const handleSaveNotifications = () => {
    updateSettingsMutation.mutate({
      section: 'notifications',
      notifyOrders: formState.notifyOrders,
      notifyLowStock: formState.notifyLowStock,
      notifySecurity: formState.notifySecurity,
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8 text-purple-600" />
            System Settings
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Configure system-wide settings and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">Features</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
        </TabsList>

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
                <Label htmlFor="siteName">Site Name</Label>
                <Input 
                  id="siteName"
                  data-testid="input-site-name"
                  value={formState.siteName}
                  onChange={(e) => setFormState(prev => ({ ...prev, siteName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input 
                  id="contactEmail"
                  data-testid="input-contact-email"
                  value={formState.contactEmail}
                  onChange={(e) => setFormState(prev => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-slate-500">Enable to take site offline</p>
                </div>
                <Switch 
                  data-testid="switch-maintenance-mode"
                  checked={formState.maintenanceMode}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, maintenanceMode: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>User Registration</Label>
                  <p className="text-sm text-slate-500">Allow new user signups</p>
                </div>
                <Switch 
                  data-testid="switch-allow-registration"
                  checked={formState.allowRegistration}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, allowRegistration: checked }))}
                />
              </div>
              <Button 
                onClick={handleSaveGeneral}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-general"
              >
                {updateSettingsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-slate-500">Require 2FA for admin accounts</p>
                </div>
                <Switch 
                  data-testid="switch-require-2fa"
                  checked={formState.require2FA}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, require2FA: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Email OTP Verification</Label>
                  <p className="text-sm text-slate-500">Require email OTP on signup</p>
                </div>
                <Switch 
                  data-testid="switch-email-otp"
                  checked={formState.requireEmailOTP}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, requireEmailOTP: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>SMS OTP Verification</Label>
                  <p className="text-sm text-slate-500">Require SMS OTP on signup</p>
                </div>
                <Switch 
                  data-testid="switch-sms-otp"
                  checked={formState.requireSMSOTP}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, requireSMSOTP: checked }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input 
                  id="sessionTimeout"
                  type="number" 
                  data-testid="input-session-timeout"
                  value={formState.sessionTimeout}
                  onChange={(e) => setFormState(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 60 }))}
                />
              </div>
              <Button 
                onClick={handleSaveSecurity}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-security"
              >
                {updateSettingsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Product Reviews</Label>
                  <p className="text-sm text-slate-500">Allow customers to leave reviews</p>
                </div>
                <Switch 
                  data-testid="switch-enable-reviews"
                  checked={formState.enableReviews}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, enableReviews: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Affiliate Program</Label>
                  <p className="text-sm text-slate-500">Enable affiliate marketing features</p>
                </div>
                <Switch 
                  data-testid="switch-enable-affiliate"
                  checked={formState.enableAffiliate}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, enableAffiliate: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Influencer Program</Label>
                  <p className="text-sm text-slate-500">Enable influencer collaboration</p>
                </div>
                <Switch 
                  data-testid="switch-enable-influencer"
                  checked={formState.enableInfluencer}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, enableInfluencer: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Wishlist</Label>
                  <p className="text-sm text-slate-500">Allow users to save products</p>
                </div>
                <Switch 
                  data-testid="switch-enable-wishlist"
                  checked={formState.enableWishlist}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, enableWishlist: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Blog</Label>
                  <p className="text-sm text-slate-500">Enable blog functionality</p>
                </div>
                <Switch 
                  data-testid="switch-enable-blog"
                  checked={formState.enableBlog}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, enableBlog: checked }))}
                />
              </div>
              <Button 
                onClick={handleSaveFeatures}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-features"
              >
                {updateSettingsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Order Notifications</Label>
                  <p className="text-sm text-slate-500">Notify on new orders</p>
                </div>
                <Switch 
                  data-testid="switch-notify-orders"
                  checked={formState.notifyOrders}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, notifyOrders: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-slate-500">Alert when inventory is low</p>
                </div>
                <Switch 
                  data-testid="switch-notify-low-stock"
                  checked={formState.notifyLowStock}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, notifyLowStock: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Security Alerts</Label>
                  <p className="text-sm text-slate-500">Notify on suspicious activity</p>
                </div>
                <Switch 
                  data-testid="switch-notify-security"
                  checked={formState.notifySecurity}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, notifySecurity: checked }))}
                />
              </div>
              <Button 
                onClick={handleSaveNotifications}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-notifications"
              >
                {updateSettingsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
