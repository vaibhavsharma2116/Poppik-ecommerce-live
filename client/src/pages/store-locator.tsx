
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Phone, Clock, Navigation, Loader2 } from "lucide-react";

interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  hours?: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
}

export default function StoreLocator() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);

  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  useEffect(() => {
    if (stores.length > 0) {
      setFilteredStores(stores);
      setSelectedStore(stores[0]);
    }
  }, [stores]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setFilteredStores(stores);
      return;
    }

    const filtered = stores.filter(store => 
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.pincode.includes(searchQuery)
    );

    setFilteredStores(filtered);
    if (filtered.length > 0) {
      setSelectedStore(filtered[0]);
    }
  };

  const getDirections = (store: Store) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <a href="/" className="hover:text-pink-600">Home</a>
            <span>/</span>
            <span className="text-gray-900">Store Locator</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Store Locator
          </h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <Input
              type="text"
              placeholder="Type a postcode or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Store List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {filteredStores.length} {filteredStores.length === 1 ? 'Store' : 'Stores'} Found
            </h2>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredStores.map((store) => (
                <Card 
                  key={store.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedStore?.id === store.id ? 'border-pink-600 shadow-md' : ''
                  }`}
                  onClick={() => setSelectedStore(store)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-pink-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {store.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">
                          {store.address}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          {store.city}, {store.state} {store.pincode}
                        </p>
                        {store.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <Phone className="w-4 h-4" />
                            <span>{store.phone}</span>
                          </div>
                        )}
                        {store.hours && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Clock className="w-4 h-4" />
                            <span>{store.hours}</span>
                          </div>
                        )}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            getDirections(store);
                          }}
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Get Directions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] overflow-hidden">
              <CardContent className="p-0 h-full">
                {selectedStore ? (
                  <iframe
                    title="Store Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(selectedStore.address + ', ' + selectedStore.city)}&zoom=15`}
                    allowFullScreen
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100">
                    <div className="text-center">
                      <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Select a store to view on map</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Visit Our Stores</h3>
              <p className="text-sm text-gray-600">
                Find your nearest Poppik store and explore our exclusive collection
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Expert Assistance</h3>
              <p className="text-sm text-gray-600">
                Our beauty experts are available to help you find the perfect products
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Flexible Hours</h3>
              <p className="text-sm text-gray-600">
                Open Monday to Friday with convenient shopping hours
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
