import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Pencil, Trash2, Package, Check, Minus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Layout from "@/components/layout";

// API URL helper - allows overriding backend during frontend-only dev (set VITE_API_BASE)
const apiUrl = (path: string) => {
  const base = (import.meta.env && (import.meta.env as any).VITE_API_BASE) || '';
  return `${base}${path}`;
};

// Normalize address objects returned by API (snake_case -> camelCase)
const normalizeAddress = (addr: any) => {
  if (!addr) return addr;
  return {
    id: addr.id ?? addr.address_id ?? addr.addressId,
    recipientName: addr.recipientName ?? addr.recipient_name ?? addr.name ?? addr.recipient,
    addressLine1: addr.addressLine1 ?? addr.address_line1 ?? addr.line1 ?? addr.address1,
    addressLine2: addr.addressLine2 ?? addr.address_line2 ?? addr.line2 ?? addr.address2,
    city: addr.city ?? addr.town ?? addr.city_name,
    state: addr.state ?? addr.state_name,
    pincode: addr.pincode ?? addr.pin ?? addr.postcode ?? addr.postal_code,
    country: addr.country ?? 'India',
    phoneNumber: addr.phoneNumber ?? addr.phone_number ?? addr.phone,
    deliveryInstructions: addr.deliveryInstructions ?? addr.delivery_instructions ?? addr.instructions ?? null,
    isDefault: addr.isDefault ?? addr.is_default ?? false,
  };
};

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
  originalPrice?: string;
  image: string;
  quantity: number;
  selectedShade?: {
    id: number;
    name: string;
    colorCode: string;
    imageUrl?: string;
  };
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
  const [itemAddressMapping, setItemAddressMapping] = useState<Record<string, number>>({});
  const [isMultipleAddressMode, setIsMultipleAddressMode] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [itemInstanceMapping, setItemInstanceMapping] = useState<{[key: string]: number}>({});
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


  const [user] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  });

  useEffect(() => {
    // Validate user before fetching
    if (!user || !user.id) {
      console.error('No valid user found');
      toast({
        title: "Authentication Required",
        description: "Please log in to view delivery addresses",
        variant: "destructive",
      });
      setLoading(false);
      setLocation('/auth/login');
      return;
    }

    fetchAddresses();

    // Refresh when other pages/components update addresses
    const onAddressesUpdated = () => fetchAddresses();
    window.addEventListener('deliveryAddressesUpdated', onAddressesUpdated as EventListener);

    // Check if in multiple address mode
    const multipleMode = localStorage.getItem('multipleAddressMode');
    if (multipleMode === 'true') {
      setIsMultipleAddressMode(true);
      const savedCart = localStorage.getItem('checkoutCartItems');
      const fullCart = localStorage.getItem('cart');
      
      if (savedCart && fullCart) {
        try {
          const minimalCart = JSON.parse(savedCart);
          const fullCartItems = JSON.parse(fullCart);
          
          // Reconstruct cart items with full data. Prefer matching by `itemKey` (preserves shade/instance),
          // fallback to matching by `id` if itemKey is not present.
          const reconstructedItems = minimalCart.map((minimal: any) => {
            let fullItem = null;
            if (minimal.itemKey) {
              fullItem = fullCartItems.find((item: any) => item.itemKey === minimal.itemKey);
            }
            if (!fullItem) {
              fullItem = fullCartItems.find((item: any) => item.id === minimal.id);
            }
            return fullItem ? { ...fullItem, quantity: minimal.quantity } : null;
          }).filter(Boolean);
          
          setCartItems(reconstructedItems);
          // If we already have saved mapping (editing an existing multi-address order), load it
          try {
            const existingMapRaw = localStorage.getItem('multiAddressMapping');
            if (existingMapRaw) {
              const existingMap = JSON.parse(existingMapRaw || '{}');
              const addrMap: Record<string, number> = {};
              const instMap: Record<string, number> = {};
              const expanded = new Set<number>();

              Object.keys(existingMap).forEach((k) => {
                if (k.includes('-')) {
                  instMap[k] = existingMap[k];
                  const baseId = parseInt(String(k).split('-')[0]);
                  if (!isNaN(baseId)) expanded.add(baseId as number);
                } else {
                  addrMap[k] = existingMap[k];
                }
              });

              setItemAddressMapping(addrMap);
              setItemInstanceMapping(instMap);
              setExpandedItems(expanded);
            }
          } catch (e) {
            console.error('Error loading existing multi-address mapping:', e);
          }
        } catch (error) {
          console.error('Error reconstructing cart items:', error);
          toast({
            title: "Error",
            description: "Failed to load cart items. Please try again.",
            variant: "destructive",
          });
        }
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

    return () => {
      window.removeEventListener('deliveryAddressesUpdated', onAddressesUpdated as EventListener);
    };
  }, []);

  const fetchAddresses = async () => {
    if (!user || !user.id) {
      console.error('Cannot fetch addresses: user not found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/delivery-addresses?userId=${user.id}`));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      try {
        let normalized = Array.isArray(data) ? data.map(normalizeAddress) : [normalizeAddress(data)];

        // If API returned no addresses, try to use profile address as a fallback so selects show something
        if ((!normalized || normalized.length === 0) && user) {
          try {
            const profileAddr = (user as any).address || '';
            const profileCity = (user as any).city || (user as any).town || '';
            const profileState = (user as any).state || '';
            const profileZip = (user as any).zipCode || (user as any).zip || '';

            if (profileAddr || profileCity || profileState || profileZip) {
              const fallback = normalizeAddress({
                id: -1,
                recipient_name: `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || (user as any).email || 'You',
                address_line1: profileAddr || '',
                city: profileCity,
                state: profileState,
                pincode: profileZip,
                country: 'India',
                phone_number: (user as any).phone || (user as any).mobile || '',
                is_default: true,
              });

              normalized = [fallback];
            }
          } catch (e) {
            console.warn('Error creating fallback address from profile:', e);
          }
        }

        setAddresses(normalized || []);
      } catch (e) {
        setAddresses(data || []);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({
        title: "Error Loading Addresses",
        description: error instanceof Error ? error.message : "Failed to fetch delivery addresses. Please try again.",
        variant: "destructive",
      });
      setAddresses([]);
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

      const response = await fetch(apiUrl(url), {
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
          const newAddress = await fetch(apiUrl(`/api/delivery-addresses/${data.id}`)).then(res => res.json());
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
      const response = await fetch(apiUrl(`/api/delivery-addresses/${id}`), {
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
      // Save selected address but do NOT navigate away immediately so the
      // chosen address remains visible on the page (user requested it
      // should not be hidden after selection).
      localStorage.setItem('selectedDeliveryAddress', JSON.stringify(address));
      setSelectedAddressId(address.id);
      // Intentionally not calling `setLocation('/checkout')` here so the
      // selection stays on screen. Navigation can be triggered explicitly
      // by the user in the checkout flow.
    }
  };

  const updateQuantity = (itemKeyOrId: string | number, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 10) return;

    setCartItems(items =>
      items.map(item => {
        const match = (item as any).itemKey
          ? (String((item as any).itemKey) === String(itemKeyOrId))
          : (Number(item.id) === Number(itemKeyOrId));
        return match ? { ...item, quantity: newQuantity } : item;
      })
    );

    // Update localStorage (use current cartItems snapshot and map accordingly)
    const updatedCart = cartItems.map(item => {
      const match = (item as any).itemKey
        ? (String((item as any).itemKey) === String(itemKeyOrId))
        : (Number(item.id) === Number(itemKeyOrId));
      return match ? { ...item, quantity: newQuantity } : item;
    });
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    localStorage.setItem('checkoutCartItems', JSON.stringify(
      updatedCart.map(item => ({ id: item.id, itemKey: (item as any).itemKey || null, quantity: item.quantity }))
    ));
    window.dispatchEvent(new Event('cartUpdated'));

    toast({
      title: "Quantity Updated",
      description: `Item quantity changed to ${newQuantity}`,
    });
  };

  // Ensure address selection for each item/instance does not affect others
  const handleItemAddressChange = (itemKeyOrId: string | number, addressId: number) => {
    const key = String(itemKeyOrId);
    setItemAddressMapping(prev => ({
      ...prev,
      [key]: addressId
    }));
  };

  const handleItemInstanceAddressChange = (instanceKey: string, addressId: number) => {
    const key = String(instanceKey);
    setItemInstanceMapping(prev => ({
      ...prev,
      [key]: addressId
    }));
  };

  const toggleExpandItem = (itemId: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSaveMultipleAddresses = async () => {
    // Check if all items and their instances have addresses assigned
    let totalInstances = 0;
    let assignedInstances = 0;

    cartItems.forEach(item => {
      const isExpanded = expandedItems.has(item.id);
      const keyBase = (item as any).itemKey || item.id;
      
      if (isExpanded && item.quantity > 1) {
        // Count individual instances
        totalInstances += item.quantity;
        for (let i = 0; i < item.quantity; i++) {
          const instanceKey = `${keyBase}-${i}`;
          if (itemInstanceMapping[String(instanceKey)]) {
            assignedInstances++;
          }
        }
      } else if (item.quantity === 1) {
        // For single quantity items, check itemInstanceMapping with "-0" suffix
        totalInstances++;
        const instanceKey = `${keyBase}-0`;
        if (itemInstanceMapping[String(instanceKey)]) {
          assignedInstances++;
        }
      } else {
        // For multiple quantity items (not expanded), check itemAddressMapping
        totalInstances++;
        if (itemAddressMapping[String(keyBase)]) {
          assignedInstances++;
        }
      }
    });

    if (assignedInstances < totalInstances) {
      toast({
        title: "Missing Addresses",
        description: `Please assign delivery addresses to all ${totalInstances - assignedInstances} remaining item(s)`,
        variant: "destructive"
      });
      return;
    }

    try {
      const minimalMapping: { [key: string]: number } = {};
      
      cartItems.forEach(item => {
        const isExpanded = expandedItems.has(item.id);
        const keyBase = (item as any).itemKey || item.id;
        
        if (isExpanded && item.quantity > 1) {
          // Save individual instance mappings for expanded items
          for (let i = 0; i < item.quantity; i++) {
            const instanceKey = `${keyBase}-${i}`;
            if (itemInstanceMapping[String(instanceKey)]) {
              minimalMapping[String(instanceKey)] = itemInstanceMapping[String(instanceKey)];
            }
          }
        } else if (item.quantity === 1) {
          // For single quantity items, save from itemInstanceMapping with "-0" suffix
          const instanceKey = `${keyBase}-0`;
          if (itemInstanceMapping[String(instanceKey)]) {
            minimalMapping[String(instanceKey)] = itemInstanceMapping[String(instanceKey)];
          }
        } else {
          // For multiple quantity items (not expanded), save from itemAddressMapping
          if (itemAddressMapping[String(keyBase)]) {
            minimalMapping[String(keyBase)] = itemAddressMapping[String(keyBase)];
          }
        }
      });

      // Canonicalize keys: ensure instance keys are always in the form `${base}-${index}`
      const canonicalMapping: { [key: string]: number } = {};
      Object.keys(minimalMapping).forEach(k => {
        const val = minimalMapping[k];
        const parts = String(k).split('-');
        if (parts.length === 2) {
          // Determine which part is numeric (index) and which is base
          let base = parts[0];
          let idxPart = parts[1];
          if (/^\d+$/.test(parts[0]) && !/^\d+$/.test(parts[1])) {
            base = parts[1];
            idxPart = parts[0];
          }
          const idx = /^\d+$/.test(idxPart) ? parseInt(idxPart, 10) : 0;
          canonicalMapping[`${base}-${idx}`] = val;
        } else {
          // Non-instance mapping, store as string key
          canonicalMapping[String(k)] = val;
        }
      });

      localStorage.setItem('multiAddressMapping', JSON.stringify(canonicalMapping));
      localStorage.setItem('isMultiAddressOrder', 'true');
      localStorage.removeItem('multipleAddressMode');
      localStorage.removeItem('checkoutCartItems');

      toast({
        title: "Success",
        description: "Delivery addresses saved for all items. Proceeding to payment..."
      });

      // Navigate to checkout after a brief delay
      setTimeout(() => {
        setLocation('/checkout');
      }, 500);
    } catch (error) {
      console.error('Error saving multi-address data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save delivery addresses",
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
                {cartItems.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const originalPrice = item.originalPrice ? parseInt(item.originalPrice.replace(/[₹,]/g, "")) : 0;
                  const currentPrice = parseInt(item.price.replace(/[₹,]/g, ""));
                  const discount = originalPrice > 0 ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
                  
                  return (
                    <div key={item.id} className="p-4 bg-white rounded-lg border">
                      <div className="flex items-start gap-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.selectedShade && (
                            <p className="text-xs text-gray-600 mt-1">Shade: {item.selectedShade.name}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-medium">{item.price}</span>
                            {item.originalPrice && (
                              <>
                                <span className="text-sm text-gray-500 line-through">{item.originalPrice}</span>
                                {discount > 0 && (
                                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                    {discount}% OFF
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex items-center border border-gray-300 rounded-lg">
                              <button
                                onClick={() => updateQuantity((item as any).itemKey || item.id, item.quantity - 1)}
                                className="p-2 hover:bg-gray-100 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="px-4 py-2 font-medium min-w-[3rem] text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity((item as any).itemKey || item.id, item.quantity + 1)}
                                className="p-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                disabled={item.quantity >= 10}
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            
                            {item.quantity > 1 && !isExpanded && (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => toggleExpandItem(item.id)}
                                className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                              >
                                Deliver this item to additional addresses
                              </Button>
                            )}
                          </div>

                          {item.quantity === 1 ? (
                            <div className="mt-4">
                              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                <span className="text-sm font-medium text-gray-700 min-w-[80px]">
                                  Item 1:
                                </span>
                                <select
                                  className="flex-1 rounded-md border border-input bg-white px-3 py-2 text-sm"
                                      value={itemInstanceMapping[String(`${(item as any).itemKey || item.id}-0`)] || ''}
                                      onChange={(e) => handleItemInstanceAddressChange(String(`${(item as any).itemKey || item.id}-0`), parseInt(e.target.value))}
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
                          ) : (
                            !isExpanded && (
                              <div className="mt-3">
                                <Label className="text-xs">Select delivery address:</Label>
                                <select
                                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  value={itemAddressMapping[String((item as any).itemKey || item.id)] || ''}
                                  onChange={(e) => handleItemAddressChange(String((item as any).itemKey || item.id), parseInt(e.target.value))}
                                >
                                  <option value="">Choose an address...</option>
                                  {addresses.map((addr) => (
                                    <option key={addr.id} value={addr.id}>
                                      {addr.recipientName} - {addr.city}, {addr.pincode}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {isExpanded && item.quantity > 1 && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">Assign address to each item:</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpandItem(item.id)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Use same address for all
                            </Button>
                          </div>
                          {Array.from({ length: item.quantity }).map((_, index) => {
                            const keyBase = (item as any).itemKey || item.id;
                            const instanceKey = `${keyBase}-${index}`;
                            return (
                              <div key={instanceKey} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                <span className="text-sm font-medium text-gray-700 min-w-[80px]">
                                  Item {index + 1}:
                                </span>
                                <select
                                  className="flex-1 rounded-md border border-input bg-white px-3 py-2 text-sm"
                                  value={itemInstanceMapping[String(instanceKey)] || ''}
                                  onChange={(e) => handleItemInstanceAddressChange(String(instanceKey), parseInt(e.target.value))}
                                >
                                  <option value="">Choose an address...</option>
                                  {addresses.map((addr) => (
                                    <option key={addr.id} value={addr.id}>
                                      {addr.recipientName} - {addr.city}, {addr.pincode}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Items:</span>
                    <span className="font-medium">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">
                      ₹{cartItems.reduce((sum, item) => {
                        const price = parseInt(item.price.replace(/[₹,]/g, ""));
                        return sum + (price * item.quantity);
                      }, 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 pt-2 border-t">
                    Shipping and final total will be calculated at checkout
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Button
                  onClick={handleSaveMultipleAddresses}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-6 text-base"
                >
                  Proceed to Buy
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