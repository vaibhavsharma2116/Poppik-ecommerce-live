
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Package, User, ShoppingCart } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface SearchResults {
  products: Array<{
    id: number;
    name: string;
    category: string;
    price: number;
    imageUrl: string;
  }>;
  customers: Array<{
    id: number;
    name: string;
    email: string;
    phone: string;
  }>;
  orders: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    date: string;
    status: string;
    total: string;
  }>;
}

interface AdminSearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
}

export default function AdminSearchCommand({ open, onOpenChange, initialQuery = "" }: AdminSearchCommandProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  // Debug logging
  console.log('AdminSearchCommand props:', { open, initialQuery, query });

  const { data: searchResults, isLoading, error } = useQuery<SearchResults>({
    queryKey: ["/api/admin/search", query],
    queryFn: async () => {
      if (!query.trim()) return { products: [], customers: [], orders: [] };
      console.log('Making admin search request for:', query);
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        console.error('Search API error:', response.status, response.statusText);
        throw new Error("Search failed");
      }
      const data = await response.json();
      console.log('Search results received:', data);
      return data;
    },
    enabled: query.trim().length > 0,
    retry: 1,
  });

  // Log any search errors
  if (error) {
    console.error('Search query error:', error);
  }

  useEffect(() => {
    if (open && initialQuery) {
      setQuery(initialQuery);
    } else if (!open) {
      // Clear query immediately when dialog closes
      setQuery("");
    }
  }, [open, initialQuery]);

  // Handle dialog close properly
  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setQuery(""); // Clear query when closing
    }
    onOpenChange(isOpen);
  };

  const handleSelect = (type: string, id: string | number) => {
    setQuery(""); // Clear query when selecting an item
    onOpenChange(false);
    
    switch (type) {
      case 'product':
        setLocation(`/products`);
        break;
      case 'customer':
        setLocation(`/customers`);
        break;
      case 'order':
        setLocation(`/orders`);
        break;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={handleClose}>
      <CommandInput
        placeholder="Search products, customers, orders..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length === 0 ? (
          <CommandEmpty>Type to search across all admin data...</CommandEmpty>
        ) : isLoading ? (
          <CommandEmpty>Searching...</CommandEmpty>
        ) : !searchResults || (searchResults.products.length === 0 && searchResults.customers.length === 0 && searchResults.orders.length === 0) ? (
          <CommandEmpty>No results found.</CommandEmpty>
        ) : (
          <>
            {searchResults.products.length > 0 && (
              <CommandGroup heading="Products">
                {searchResults.products.map((product) => (
                  <CommandItem
                    key={`product-${product.id}`}
                    onSelect={() => handleSelect('product', product.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-1 bg-blue-100 rounded">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          {product.category} • ₹{product.price}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {searchResults.customers.length > 0 && (
              <CommandGroup heading="Customers">
                {searchResults.customers.map((customer) => (
                  <CommandItem
                    key={`customer-${customer.id}`}
                    onSelect={() => handleSelect('customer', customer.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-1 bg-green-100 rounded">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          {customer.email} • {customer.phone}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {searchResults.orders.length > 0 && (
              <CommandGroup heading="Orders">
                {searchResults.orders.map((order) => (
                  <CommandItem
                    key={`order-${order.id}`}
                    onSelect={() => handleSelect('order', order.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-1 bg-purple-100 rounded">
                        <ShoppingCart className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{order.id}</div>
                        <div className="text-sm text-gray-500">
                          {order.customerName} • {order.total} • {order.status}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
