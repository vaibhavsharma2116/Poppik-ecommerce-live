
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Package } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  category: string;
  imageUrl: string;
}

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: searchResults = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: query.trim().length > 0,
  });

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleSelect = (productSlug: string) => {
    onOpenChange(false);
    setLocation(`/product/${productSlug}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search products..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length === 0 ? (
          <CommandEmpty>Type to search products...</CommandEmpty>
        ) : isLoading ? (
          <CommandEmpty>Searching...</CommandEmpty>
        ) : searchResults.length === 0 ? (
          <CommandEmpty>No products found.</CommandEmpty>
        ) : (
          <CommandGroup heading="Products">
            {searchResults.map((product) => (
              <CommandItem
                key={product.id}
                onSelect={() => handleSelect(product.slug)}
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
      </CommandList>
    </CommandDialog>
  );
}

// Named export for compatibility
export { SearchCommand };
