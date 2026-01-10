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
    landmark: addr.landmark ?? addr.landmark_name ?? null,
    city: normalizeCityValue(addr.city ?? addr.town ?? addr.city_name),
    state: normalizeStateValue(addr.state ?? addr.state_name),
    pincode: addr.pincode ?? addr.pin ?? addr.postcode ?? addr.postal_code,
    country: addr.country ?? 'India',
    phoneNumber: addr.phoneNumber ?? addr.phone_number ?? addr.phone,
    deliveryInstructions: addr.deliveryInstructions ?? addr.delivery_instructions ?? addr.instructions ?? null,
    isDefault: addr.isDefault ?? addr.is_default ?? false,
  };
};

const INDIAN_STATES = [
  { value: 'andhra_pradesh', label: 'Andhra Pradesh' },
  { value: 'arunachal_pradesh', label: 'Arunachal Pradesh' },
  { value: 'assam', label: 'Assam' },
  { value: 'bihar', label: 'Bihar' },
  { value: 'chhattisgarh', label: 'Chhattisgarh' },
  { value: 'goa', label: 'Goa' },
  { value: 'gujarat', label: 'Gujarat' },
  { value: 'haryana', label: 'Haryana' },
  { value: 'himachal_pradesh', label: 'Himachal Pradesh' },
  { value: 'jharkhand', label: 'Jharkhand' },
  { value: 'karnataka', label: 'Karnataka' },
  { value: 'kerala', label: 'Kerala' },
  { value: 'madhya_pradesh', label: 'Madhya Pradesh' },
  { value: 'maharashtra', label: 'Maharashtra' },
  { value: 'manipur', label: 'Manipur' },
  { value: 'meghalaya', label: 'Meghalaya' },
  { value: 'mizoram', label: 'Mizoram' },
  { value: 'nagaland', label: 'Nagaland' },
  { value: 'odisha', label: 'Odisha' },
  { value: 'punjab', label: 'Punjab' },
  { value: 'rajasthan', label: 'Rajasthan' },
  { value: 'sikkim', label: 'Sikkim' },
  { value: 'tamil_nadu', label: 'Tamil Nadu' },
  { value: 'telangana', label: 'Telangana' },
  { value: 'tripura', label: 'Tripura' },
  { value: 'uttar_pradesh', label: 'Uttar Pradesh' },
  { value: 'uttarakhand', label: 'Uttarakhand' },
  { value: 'west_bengal', label: 'West Bengal' },
  { value: 'delhi', label: 'Delhi' },
];

const CITY_LOCATION_MAP: Record<string, { state: string; pincodes: string[] }> = {
  mumbai: { state: "maharashtra", pincodes: ["400001", "400002", "400003", "400004", "400005", "400006", "400007", "400008", "400009", "400010"] },
  delhi: { state: "delhi", pincodes: ["110001", "110002", "110003", "110004", "110005", "110006", "110007", "110008", "110009", "110010"] },
  bangalore: { state: "karnataka", pincodes: ["560001", "560002", "560003", "560004", "560005", "560006", "560007", "560008", "560009", "560010"] },
  hyderabad: { state: "telangana", pincodes: ["500001", "500002", "500003", "500004", "500005", "500006", "500007", "500008", "500009", "500010"] },
  ahmedabad: { state: "gujarat", pincodes: ["380001", "380002", "380003", "380004", "380005", "380006", "380007", "380008", "380009", "380010"] },
  chennai: { state: "tamil_nadu", pincodes: ["600001", "600002", "600003", "600004", "600005", "600006", "600007", "600008", "600009", "600010"] },
  kolkata: { state: "west_bengal", pincodes: ["700001", "700002", "700003", "700004", "700005", "700006", "700007", "700008", "700009", "700010"] },
  pune: { state: "maharashtra", pincodes: ["411001", "411002", "411003", "411004", "411005", "411006", "411007", "411008", "411009", "411010"] },
  jaipur: { state: "rajasthan", pincodes: ["302001", "302002", "302003", "302004", "302005", "302006", "302007", "302008", "302009", "302010"] },
  surat: { state: "gujarat", pincodes: ["395001", "395002", "395003", "395004", "395005", "395006", "395007", "395008", "395009", "395010"] },
  lucknow: { state: "uttar_pradesh", pincodes: ["226001", "226002", "226003", "226004", "226005"] },
  kanpur: { state: "uttar_pradesh", pincodes: ["208001", "208002", "208003", "208004", "208005"] },
  nagpur: { state: "maharashtra", pincodes: ["440001", "440002", "440003", "440004", "440005"] },
  indore: { state: "madhya_pradesh", pincodes: ["452001", "452002", "452003", "452004", "452005"] },
  thane: { state: "maharashtra", pincodes: ["400601", "400602", "400603", "400604", "400605"] },
  bhopal: { state: "madhya_pradesh", pincodes: ["462001", "462002", "462003", "462004", "462005"] },
  visakhapatnam: { state: "andhra_pradesh", pincodes: ["530001", "530002", "530003", "530004", "530005"] },
  pimpri: { state: "maharashtra", pincodes: ["411017", "411018", "411019", "411020", "411021"] },
  patna: { state: "bihar", pincodes: ["800001", "800002", "800003", "800004", "800005"] },
  vadodara: { state: "gujarat", pincodes: ["390001", "390002", "390003", "390004", "390005"] },
};

function normalizeStateValue(raw: any) {
  const value = String(raw ?? '').trim();
  if (!value) return '';

  const direct = INDIAN_STATES.find((s) => s.value === value);
  if (direct) return direct.value;

  const cleaned = value
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_');

  const byValue = INDIAN_STATES.find((s) => s.value === cleaned);
  if (byValue) return byValue.value;

  const byLabel = INDIAN_STATES.find((s) => s.label.toLowerCase() === value.toLowerCase());
  if (byLabel) return byLabel.value;

  return value;
}

function normalizeCityValue(raw: any) {
  const value = String(raw ?? '').trim();
  if (!value) return '';

  const cleaned = value
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_');

  if (CITY_LOCATION_MAP[cleaned]) return cleaned;
  if (CITY_LOCATION_MAP[value.toLowerCase()]) return value.toLowerCase();
  return cleaned;
}

function toTitleLabel(raw: string) {
  return String(raw)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface DeliveryAddress {
  id: number;
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string | null;
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
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phoneNumber: '',
    deliveryInstructions: '',
    isDefault: false
  });
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeValid, setPincodeValid] = useState<boolean | null>(null);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [pincodeServiceError, setPincodeServiceError] = useState<string | null>(null);

  const [nameData, setNameData] = useState({
    firstName: '',
    lastName: ''
  });
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const availableCities = React.useMemo(() => {
    const selectedState = normalizeStateValue(formData.state);
    if (!selectedState) return [] as string[];
    return Object.keys(CITY_LOCATION_MAP)
      .filter((cityKey) => normalizeStateValue(CITY_LOCATION_MAP[cityKey]?.state) === selectedState)
      .sort((a, b) => toTitleLabel(a).localeCompare(toTitleLabel(b)));
  }, [formData.state]);

  const availablePincodes = React.useMemo(() => {
    const cityKey = normalizeCityValue(formData.city);
    const entry = CITY_LOCATION_MAP[cityKey];
    return entry?.pincodes || [];
  }, [formData.city]);

  useEffect(() => {
    // City & pincode are now manual inputs. Do not auto-clear them based on CITY_LOCATION_MAP.
    // Only sanitize pincode to digits and max length 6.
    const cleaned = String(formData.pincode || '').replace(/\D/g, '').slice(0, 6);
    if (String(formData.pincode || '') !== cleaned) {
      setFormData((prev) => ({ ...prev, pincode: cleaned }));
    }
  }, [formData.state, formData.city, formData.pincode, availablePincodes]);

  useEffect(() => {
    const cleaned = String(formData.pincode || '').replace(/\D/g, '').slice(0, 6);
    if (cleaned.length !== 6) {
      setPincodeChecking(false);
      setPincodeValid(null);
      setPincodeError(null);
      setPincodeServiceError(null);
      return;
    }

    let cancelled = false;
    setPincodeChecking(true);
    setPincodeError(null);
    setPincodeServiceError(null);

    const t = setTimeout(async () => {
      try {
        const resp = await fetch(apiUrl(`/api/pincode/validate?pincode=${cleaned}`));
        const data = await resp.json().catch(() => ({}));
        if (cancelled) return;

        if (!resp.ok) {
          // If backend is down/unavailable, don't mark as invalid.
          // We'll show a separate message and allow user to try saving.
          setPincodeValid(null);
          setPincodeError(null);
          setPincodeServiceError('Pincode validation service unavailable. Please try again.');
          return;
        }

        if (data?.status === 'invalid' || data?.pincode_valid === false) {
          setPincodeValid(false);
          setPincodeError('Enter valid pincode');
          setPincodeServiceError(null);
          return;
        }

        if (data?.status === 'success') {
          setPincodeValid(true);
          setPincodeError(null);
          setPincodeServiceError(null);
          return;
        }

        setPincodeValid(null);
        setPincodeError(null);
        setPincodeServiceError('Pincode validation service unavailable. Please try again.');
      } catch (e) {
        if (cancelled) return;
        setPincodeValid(null);
        setPincodeError(null);
        setPincodeServiceError('Pincode validation service unavailable. Please try again.');
      } finally {
        if (!cancelled) setPincodeChecking(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [formData.pincode]);

  const splitRecipientName = (full: string) => {
    const cleaned = (full || '').trim();
    if (!cleaned) return { firstName: '', lastName: '' };
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  };

  const [user, setUser] = useState(() => {
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

    // If coming from checkout to edit an address, open edit dialog directly
    try {
      const raw = localStorage.getItem('editDeliveryAddress');
      if (raw) {
        const parsed = normalizeAddress(JSON.parse(raw));
        if (parsed && parsed.id) {
          setEditingAddress(parsed as any);
          const np = splitRecipientName(parsed.recipientName || '');
          setNameData({ firstName: np.firstName, lastName: np.lastName });
          setFormData({
            recipientName: parsed.recipientName || '',
            addressLine1: parsed.addressLine1 || '',
            addressLine2: parsed.addressLine2 || '',
            landmark: (parsed as any).landmark || '',
            city: normalizeCityValue(parsed.city || ''),
            state: normalizeStateValue(parsed.state || ''),
            pincode: parsed.pincode || '',
            country: parsed.country || 'India',
            phoneNumber: parsed.phoneNumber || '',
            deliveryInstructions: parsed.deliveryInstructions || '',
            isDefault: Boolean(parsed.isDefault),
          });
          setIsAddDialogOpen(true);
        }
        localStorage.removeItem('editDeliveryAddress');
      }
    } catch (e) {
      console.warn('Could not load editDeliveryAddress', e);
      try {
        localStorage.removeItem('editDeliveryAddress');
      } catch (e2) {
        // ignore
      }
    }

    // Refresh when other pages/components update addresses or user profile
    const onAddressesUpdated = () => fetchAddresses();
    const onUserUpdated = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        setUser(parsed);
        // Important: refetch with the freshly parsed user to avoid waiting for state to update.
        fetchAddresses(parsed);
        return;
      } catch (e) {
        // ignore
      }
      fetchAddresses();
    };
    window.addEventListener('deliveryAddressesUpdated', onAddressesUpdated as EventListener);
    window.addEventListener('userUpdated', onUserUpdated as EventListener);

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
      window.removeEventListener('userUpdated', onUserUpdated as EventListener);
    };
  }, []);

  const fetchAddresses = async (overrideUser?: any) => {
    const effectiveUser = overrideUser ?? user;
    if (!effectiveUser || !effectiveUser.id) {
      console.error('Cannot fetch addresses: user not found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/delivery-addresses?userId=${effectiveUser.id}`), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      try {
        let normalized = Array.isArray(data) ? data.map(normalizeAddress) : [normalizeAddress(data)];

        // Always include user's profile address as an option alongside saved addresses
        // This gives users the option to use either their profile address or newly saved addresses
        if (user) {
          try {
            const profileAddr = (user as any).address || '';
            const profileCity = (user as any).city || (user as any).town || '';
            const profileState = (user as any).state || '';
            const profileZip = (user as any).pincode || (user as any).zipCode || (user as any).zip || '';
            const profilePhone = (user as any).phone || (user as any).mobile || '';

            // Create profile address if we have at least phone number AND (address OR city)
            if ((profileAddr || profileCity) && profilePhone) {
              const profileAddressObj = normalizeAddress({
                id: 999999, // Use a unique ID for profile-based address
                recipient_name: `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || (user as any).email || 'You',
                address_line1: profileAddr || profileCity || 'Your Address',
                city: profileCity || 'Not Set',
                state: profileState || 'Not Set',
                pincode: profileZip || '',
                country: 'India',
                phone_number: profilePhone,
                is_default: normalized.length === 0, // Only mark as default if no other addresses exist
              });

              // Check if profile address is already in the normalized list (to avoid duplicates)
              const profileAddrExists = normalized.some((addr: any) => Number(addr.id) === 999999);
              
              if (!profileAddrExists) {
                // Add profile address to the beginning of the list so it's visible
                normalized.unshift(profileAddressObj);
                console.log('✅ Added profile address to address list:', profileAddressObj);
              }
            }
          } catch (e) {
            console.warn('Error creating profile address:', e);
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
        variant: "destructive"
      });
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const recipientName = `${nameData.firstName} ${nameData.lastName}`.trim();

    try {
      const url = editingAddress
        ? `/api/delivery-addresses/${editingAddress.id}`
        : '/api/delivery-addresses';

      const response = await fetch(apiUrl(url), {
        method: editingAddress ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ ...formData, recipientName, userId: user.id })
      });

      if (response.ok) {
        const data = await response.json();

        // Update UI immediately (avoid waiting for refetch)
        {
          if (editingAddress) {
            const merged = normalizeAddress({
              ...editingAddress,
              ...formData,
              recipientName,
              ...data,
              id: editingAddress.id,
            }) as DeliveryAddress;
            setAddresses((prev) => {
              const next = prev.map((a) => (Number(a.id) === Number(editingAddress.id) ? merged : a));
              if (merged.isDefault) {
                return next.map((a) => (Number(a.id) === Number(merged.id) ? a : ({ ...a, isDefault: false } as any)));
              }
              return next;
            });

            if (selectedAddressId && Number(selectedAddressId) === Number(editingAddress.id)) {
              localStorage.setItem('selectedDeliveryAddress', JSON.stringify(merged));
            }
          } else {
            const created = normalizeAddress({ ...formData, recipientName, ...data }) as DeliveryAddress;
            setAddresses((prev) => [created, ...prev]);
          }

          try {
            window.dispatchEvent(new Event('deliveryAddressesUpdated'));
          } catch (e) {
            // ignore
          }

          toast({
            title: "Success",
            description: editingAddress ? "Address updated successfully" : "Address added successfully"
          });
          setIsAddDialogOpen(false);
          setEditingAddress(null);
          resetForm();
          // Refresh in background to ensure canonical data
          fetchAddresses();

          // If this was a new address in single mode, select it and go back to checkout
          if (!editingAddress && data.id && !isMultipleAddressMode) {
            const newAddress = await fetch(apiUrl(`/api/delivery-addresses/${data.id}`), {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
              },
            }).then(res => res.json());
            localStorage.setItem('selectedDeliveryAddress', JSON.stringify(newAddress));
            setTimeout(() => setLocation('/checkout'), 500);
          }
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

    // Optimistic UI update
    const prevAddresses = addresses;
    setAddresses((prev) => prev.filter((a) => Number(a.id) !== Number(id)));
    try {
      if (selectedAddressId && Number(selectedAddressId) === Number(id)) {
        setSelectedAddressId(null);
        try {
          localStorage.removeItem('selectedDeliveryAddress');
        } catch (e) {
          // ignore
        }
      }
      try {
        window.dispatchEvent(new Event('deliveryAddressesUpdated'));
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore
    }

    try {
      const response = await fetch(apiUrl(`/api/delivery-addresses/${id}`), {
        method: 'DELETE',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      if (response.ok) {
        toast({ title: "Success", description: "Address deleted successfully" });
        // Ensure canonical refresh in background
        fetchAddresses();
      } else {
        // revert optimistic update on failure
        setAddresses(prevAddresses);
      }
    } catch (error) {
      // revert optimistic update on failure
      setAddresses(prevAddresses);
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (address: DeliveryAddress) => {
    setEditingAddress(address);
    const np = splitRecipientName(address.recipientName || '');
    setNameData({ firstName: np.firstName, lastName: np.lastName });
    setFormData({
      recipientName: address.recipientName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      landmark: (address as any).landmark || '',
      city: normalizeCityValue(address.city),
      state: normalizeStateValue(address.state),
      pincode: address.pincode,
      country: address.country || 'India',
      phoneNumber: address.phoneNumber,
      deliveryInstructions: address.deliveryInstructions || '',
      isDefault: Boolean(address.isDefault),
    });
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setNameData({ firstName: '', lastName: '' });
    setFormData({
      recipientName: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
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
      setSelectedAddressId(Number(address.id));
      // Intentionally not calling `setLocation('/checkout')` here so the
      // selection stays on screen. Navigation can be triggered explicitly
      // by the user in the checkout flow.
    }
  };

  const updateQuantity = (itemKeyOrId: string | number, newQuantity: number) => {
    if (newQuantity < 1) return;

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
          for (let i = 0; i <item.quantity; i++) {
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
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded mx-auto sm:mx-0"
                          />
                          <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base break-words">{item.name}</h3>
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

                          <div className="mt-3 flex flex-col sm:flex-row items-center gap-3">
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
                                className="p-2 hover:bg-gray-100 transition-colors"
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
                                className="text-blue-600 hover:text-blue-700 p-0 h-auto w-full sm:w-auto text-left text-sm sm:text-base"
                              >
                                Deliver item to additional addresses
                              </Button>
                            )}
                          </div>

                          {item.quantity === 1 ? (
                            <div className="mt-4">
                              <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                <span className="text-sm font-medium text-gray-700 min-w-[80px] w-full sm:w-auto">
                                  Item 1:
                                </span>
                                <select
                                  className="flex-1 rounded-md border border-input bg-white px-3 py-2 text-sm w-full"
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
                              Use same address
                            </Button>
                          </div>
                          {Array.from({ length: item.quantity }).map((_, index) => {
                            const keyBase = (item as any).itemKey || item.id;
                            const instanceKey = `${keyBase}-${index}`;
                            return (
                              <div key={instanceKey} className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                <span className="text-sm font-medium text-gray-700 min-w-[80px] w-full sm:w-auto">
                                  Item {index + 1}:
                                </span>
                                <select
                                  className="flex-1 rounded-md border border-input bg-white px-3 py-2 text-sm w-full"
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
                      Number(address.id) === selectedAddressId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedAddressId(Number(address.id));
                      handleSelectAddress(address);
                    }}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                            Number(address.id) === selectedAddressId
                              ? 'bg-blue-600'
                              : 'border-2 border-gray-300'
                          }`}
                        >
                          {Number(address.id) === selectedAddressId && (
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
                          {(address as any).landmark && (
                            <p className="text-sm text-gray-600 mb-1">
                              {(address as any).landmark}
                            </p>
                          )}
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
                      {Number(address.id) === 999999 ? (
                        <div className="mt-3 sm:mt-0 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation('/profile?edit=1');
                            }}
                          >
                            <Pencil className="h-4 w-4 text-gray-700" />
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-3 sm:mt-0 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(address);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-gray-700" />
                          </Button>
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
                      )}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={nameData.firstName}
                          onChange={(e) => {
                            const firstName = e.target.value;
                            const recipientName = `${firstName} ${nameData.lastName}`.trim();
                            setNameData({ ...nameData, firstName });
                            setFormData({ ...formData, recipientName });
                          }}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={nameData.lastName}
                          onChange={(e) => {
                            const lastName = e.target.value;
                            const recipientName = `${nameData.firstName} ${lastName}`.trim();
                            setNameData({ ...nameData, lastName });
                            setFormData({ ...formData, recipientName });
                          }}
                        />
                      </div>
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

                    <div>
                      <Label htmlFor="landmark">Landmark (optional)</Label>
                      <Input
                        id="landmark"
                        value={(formData as any).landmark}
                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <select
                          id="state"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={formData.state}
                          onChange={(e) => {
                            const nextState = e.target.value;
                            setFormData({ ...formData, state: nextState, city: '', pincode: '' });
                          }}
                          required
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        value={formData.pincode}
                        onChange={(e) => {
                          const next = String(e.target.value || '').replace(/\D/g, '').slice(0, 6);
                          setFormData({ ...formData, pincode: next });
                        }}
                        maxLength={6}
                        required
                      />
                      {pincodeError && (
                        <p className="mt-1 text-xs text-red-600">{pincodeError}</p>
                      )}
                      {!pincodeError && pincodeServiceError && (
                        <p className="mt-1 text-xs text-gray-600">{pincodeServiceError}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                        className="rounded"
                      />
                    
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1" disabled={pincodeChecking || pincodeValid !== true}>
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