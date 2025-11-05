
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
        <div className="max-w-12xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
            <a href="/" className="hover:text-pink-600">Home</a>
            <span>/</span>
            <span className="text-gray-900">Store Locator</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
            Store Locator
          </h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-xl">
            <Input
              type="text"
              placeholder="Type a postcode or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm sm:text-base"
            />
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700 w-full sm:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-12xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Store List */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
              {filteredStores.length} {filteredStores.length === 1 ? 'Store' : 'Stores'} Found
            </h2>
            
            <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
              {filteredStores.map((store) => (
                <Card 
                  key={store.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedStore?.id === store.id ? 'border-pink-600 shadow-md' : ''
                  }`}
                  onClick={() => setSelectedStore(store)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 sm:mb-2">
                          {store.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">
                          {store.address}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-1">
                          {store.city}, {store.state} {store.pincode}
                        </p>
                        {store.phone && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2">
                            <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{store.phone}</span>
                          </div>
                        )}
                        {store.hours && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mt-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
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
                          className="mt-2 sm:mt-3 w-full text-xs sm:text-sm py-1.5 sm:py-2"
                        >
                          <Navigation className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
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
            <Card className="h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden">
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
                    <div className="text-center px-4">
                      <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                      <p className="text-sm sm:text-base text-gray-600">Select a store to view on map</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white border-t mt-8 sm:mt-12">
        <div className="max-w-12xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2">Visit Our Stores</h3>
              <p className="text-xs sm:text-sm text-gray-600 px-2">
                Find your nearest Poppik store and explore our exclusive collection
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2">Expert Assistance</h3>
              <p className="text-xs sm:text-sm text-gray-600 px-2">
                Our Beauty, Lifestyle & Wellness experts are available to help you find the perfect products
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1.5 sm:mb-2">Flexible Hours</h3>
              <p className="text-xs sm:text-sm text-gray-600 px-2">
                Open Monday to Friday with convenient shopping hours
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
