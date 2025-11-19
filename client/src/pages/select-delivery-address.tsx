import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Pencil, Trash2, Package, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Layout from "@/components/layout";

interface DeliveryAddress {
  id: number;
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phoneNumber: string;
  deliveryInstructions?: string;
  isDefault: boolean;
}

interface CartItem {
  id: number;
  name: string;
  price: string;
  image: string;
  quantity: number;
}

interface ItemAddressMapping {
  [itemId: number]: number; // itemId -> addressId
}

export default function SelectDeliveryAddress() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [itemAddressMapping, setItemAddressMapping] = useState<ItemAddressMapping>({});
  const [isMultipleAddressMode, setIsMultipleAddressMode] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phoneNumber: '',
    deliveryInstructions: '',
    isDefault: false
  });
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);


  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAddresses();

    // Check if in multiple address mode
    const multipleMode = localStorage.getItem('multipleAddressMode');
    if (multipleMode === 'true') {
      setIsMultipleAddressMode(true);
      const savedCart = localStorage.getItem('checkoutCartItems');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
      toast({
        title: "Multiple Addresses Mode",
        description: "Select different delivery addresses for your items",
      });
    }

    // Auto-open add dialog if coming from checkout
    const addNewMode = localStorage.getItem('addNewAddressMode');
    if (addNewMode === 'true') {
      setIsAddDialogOpen(true);
      localStorage.removeItem('addNewAddressMode');
    }
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch(`/api/delivery-addresses?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setAddresses(data);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingAddress
        ? `/api/delivery-addresses/${editingAddress.id}`
        : '/api/delivery-addresses';

      const response = await fetch(url, {
        method: editingAddress ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId: user.id })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: editingAddress ? "Address updated successfully" : "Address added successfully"
        });
        setIsAddDialogOpen(false);
        setEditingAddress(null);
        resetForm();
        await fetchAddresses();

        // If this was a new address in single mode, select it and go back to checkout
        if (!editingAddress && data.id && !isMultipleAddressMode) {
          const newAddress = await fetch(`/api/delivery-addresses/${data.id}`).then(res => res.json());
          localStorage.setItem('selectedDeliveryAddress', JSON.stringify(newAddress));
          setTimeout(() => setLocation('/checkout'), 500);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save address",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const response = await fetch(`/api/delivery-addresses/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({ title: "Success", description: "Address deleted successfully" });
        fetchAddresses();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (address: DeliveryAddress) => {
    setEditingAddress(address);
    setFormData({
      recipientName: address.recipientName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      phoneNumber: address.phoneNumber,
      deliveryInstructions: address.deliveryInstructions || '',
      isDefault: address.isDefault
    });
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      recipientName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      phoneNumber: '',
      deliveryInstructions: '',
      isDefault: false
    });
  };

  const handleSelectAddress = (address: DeliveryAddress) => {
    if (!isMultipleAddressMode) {
      localStorage.setItem('selectedDeliveryAddress', JSON.stringify(address));
      setLocation('/checkout');
    }
  };

  const handleItemAddressChange = (itemId: number, addressId: number) => {
    setItemAddressMapping(prev => ({
      ...prev,
      [itemId]: addressId
    }));
  };

  const handleSaveMultipleAddresses = async () => {
    // Check if all items have addresses assigned
    const unassignedItems = cartItems.filter(item => !itemAddressMapping[item.id]);

    if (unassignedItems.length > 0) {
      toast({
        title: "Missing Addresses",
        description: `Please assign delivery addresses to all ${unassignedItems.length} remaining item(s)`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Get full address details for each item
      const itemsWithFullAddresses = cartItems.map(item => {
        const addressId = itemAddressMapping[item.id];
        const address = addresses.find(addr => addr.id === addressId);

        return {
          ...item,
          deliveryAddress: address ? {
            id: address.id,
            recipientName: address.recipientName,
            fullAddress: `${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.city}, ${address.state} - ${address.pincode}, ${address.country}`,
            phone: address.phoneNumber,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country
          } : null
        };
      });

      // Save to localStorage for checkout page
      localStorage.setItem('multiAddressMapping', JSON.stringify(itemAddressMapping));
      localStorage.setItem('multiAddressItems', JSON.stringify(itemsWithFullAddresses));
      localStorage.setItem('isMultiAddressOrder', 'true');

      // Clear multi-address mode flags
      localStorage.removeItem('multipleAddressMode');
      localStorage.removeItem('checkoutCartItems');

      toast({
        title: "Success",
        description: "Delivery addresses saved for all items"
      });

      // Redirect to checkout
      setTimeout(() => setLocation('/checkout'), 300);
    } catch (error) {
      console.error('Error saving multi-address data:', error);
      toast({
        title: "Error",
        description: "Failed to save delivery addresses",
        variant: "destructive"
      });
    }
  };

  return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.removeItem('multipleAddressMode');
              localStorage.removeItem('checkoutCartItems');
              setLocation('/checkout');
            }}
            className="mb-4 -ml-2"
          >
            ← Back to Checkout
          </Button>
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">
              {isMultipleAddressMode ? 'Assign Delivery Addresses' : 'Select a delivery address'}
            </h1>
          </div>
        </div>

        {isMultipleAddressMode && cartItems.length > 0 && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Assign addresses to your items ({cartItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-4 bg-white rounded-lg border">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                      <p className="text-sm font-medium">{item.price}</p>

                      <div className="mt-3">
                        <Label className="text-xs">Select delivery address:</Label>
                        <select
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={itemAddressMapping[item.id] || ''}
                          onChange={(e) => handleItemAddressChange(item.id, parseInt(e.target.value))}
                        >
                          <option value="">Choose an address...</option>
                          {addresses.map((addr) => (
                            <option key={addr.id} value={addr.id}>
                              {addr.recipientName} - {addr.city}, {addr.pincode}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleSaveMultipleAddresses}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  disabled={Object.keys(itemAddressMapping).length !== cartItems.length}
                >
                  Continue to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Address Selection List for Single Mode */}
        {!isMultipleAddressMode && addresses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Saved Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`border-2 rounded-lg p-4 transition-colors cursor-pointer ${
                      selectedAddressId === address.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedAddressId(address.id);
                      handleSelectAddress(address);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                            selectedAddressId === address.id
                              ? 'bg-blue-600'
                              : 'border-2 border-gray-300'
                          }`}
                        >
                          {selectedAddressId === address.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{address.recipientName}</h3>
                            {address.isDefault && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            {address.city}, {address.state} - {address.pincode}
                          </p>
                          <p className="text-sm text-gray-600 mb-3">
                            Phone: {address.phoneNumber}
                          </p>
                          {address.deliveryInstructions && (
                            <p className="text-xs text-gray-500 mb-3 italic">
                              Instructions: {address.deliveryInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(address.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mt-4" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Address
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAddress ? 'Edit Address' : 'Add New Address'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="recipientName">Full Name *</Label>
                      <Input
                        id="recipientName"
                        value={formData.recipientName}
                        onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        maxLength={10}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="addressLine1">Address Line 1 *</Label>
                      <Input
                        id="addressLine1"
                        value={formData.addressLine1}
                        onChange={(e) => setFormData({...formData, addressLine1: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="addressLine2">Address Line 2</Label>
                      <Input
                        id="addressLine2"
                        value={formData.addressLine2}
                        onChange={(e) => setFormData({...formData, addressLine2: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => setFormData({...formData, state: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        value={formData.pincode}
                        onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                        maxLength={6}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
                      <Textarea
                        id="deliveryInstructions"
                        value={formData.deliveryInstructions}
                        onChange={(e) => setFormData({...formData, deliveryInstructions: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="isDefault" className="text-sm font-normal">
                        Set as default address
                      </Label>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1">
                        {editingAddress ? 'Update Address' : 'Save Address'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          setEditingAddress(null);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

      </div>
  );
}