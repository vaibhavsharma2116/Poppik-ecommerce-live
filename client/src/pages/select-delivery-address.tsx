
import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Pencil, Trash2, Package } from "lucide-react";
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

    
       
      </div>
  );
}
