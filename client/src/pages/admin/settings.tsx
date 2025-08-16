
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, Shield } from "lucide-react";

export default function AdminSettings() {
  const [user, setUser] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'Beauty Haven',
    contactEmail: 'contact@beautyhaven.com',
    storeDescription: 'Your one-stop destination for premium beauty and cosmetic products',
    currency: 'USD',
    taxRate: '8.5'
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    customerReviews: false
  });
  const [paymentSettings, setPaymentSettings] = useState({
    acceptCreditCards: true,
    acceptPayPal: true
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings Updated",
        description: "Your settings have been successfully saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <div className="grid gap-6">
        {/* Admin Profile Card */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-red-100 text-red-600 text-lg font-semibold">
                    {user.firstName && user.lastName ? 
                      getInitials(user.firstName, user.lastName) : 
                      user.email?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">
                    {user.firstName && user.lastName ? 
                      `${user.firstName} ${user.lastName}` : 
                      user.name || 'Admin User'}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {user.email}
                  </div>
                  {user.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {user.phone}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-green-600">
                    <Shield className="w-4 h-4 mr-2" />
                    {user.role === 'admin' ? 'Super Admin' : 'Admin'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>Update your store's basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store-name">Store Name</Label>
                <Input 
                  id="store-name" 
                  value={storeSettings.storeName}
                  onChange={(e) => setStoreSettings(prev => ({ ...prev, storeName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-email">Contact Email</Label>
                <Input 
                  id="store-email" 
                  type="email" 
                  value={storeSettings.contactEmail}
                  onChange={(e) => setStoreSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-description">Store Description</Label>
              <Textarea 
                id="store-description" 
                value={storeSettings.storeDescription}
                onChange={(e) => setStoreSettings(prev => ({ ...prev, storeDescription: e.target.value }))}
                rows={3}
              />
            </div>
            <Button 
              className="bg-red-500 hover:bg-red-600" 
              onClick={handleSaveSettings}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email notifications for new orders</p>
              </div>
              <Switch 
                checked={notifications.emailNotifications}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when products are running low</p>
              </div>
              <Switch 
                checked={notifications.lowStockAlerts}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, lowStockAlerts: checked }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Customer Reviews</Label>
                <p className="text-sm text-muted-foreground">Notifications for new customer reviews</p>
              </div>
              <Switch 
                checked={notifications.customerReviews}
                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, customerReviews: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>Configure payment methods and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Input 
                  id="currency" 
                  value={storeSettings.currency}
                  onChange={(e) => setStoreSettings(prev => ({ ...prev, currency: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input 
                  id="tax-rate" 
                  type="number" 
                  value={storeSettings.taxRate}
                  onChange={(e) => setStoreSettings(prev => ({ ...prev, taxRate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Accept PayPal</Label>
                <p className="text-sm text-muted-foreground">Enable PayPal payments</p>
              </div>
              <Switch 
                checked={paymentSettings.acceptPayPal}
                onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, acceptPayPal: checked }))}
              />
            </div>
            <Button 
              className="bg-red-500 hover:bg-red-600" 
              onClick={handleSaveSettings}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Payment Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
