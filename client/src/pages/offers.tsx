import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Gift, Percent, Tag } from "lucide-react";
import { Link } from "wouter";

interface Offer {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  discountPercentage?: number;
  discountText?: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  linkUrl?: string;
  buttonText?: string;
}

export default function OffersPage() {
  const { data: offers = [], isLoading, error } = useQuery<Offer[]>({
    queryKey: ['/api/offers'],
    queryFn: async () => {
      const response = await fetch('/api/offers');
      if (!response.ok) {
        console.error('Failed to fetch offers:', response.status);
        return []; // Return empty array on error
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    retry: 1,
  });

  const displayOffers = offers || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-8 sm:py-12 md:py-16 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Loading offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      {/* Header Section - Fully Responsive */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-full mb-3 sm:mb-4 md:mb-6">
            <Tag className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-3 md:mb-4 px-2">
            OFFERS
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 max-w-2xl mx-auto px-4">
            Explore our exclusive deals and save big on your favorite beauty products
          </p>
        </div>
      </div>

      {/* Offers Grid - Responsive Layout */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
          {displayOffers.map((offer) => {
            const discount = offer.discountPercentage 
              ? `${offer.discountPercentage}% OFF` 
              : offer.discountText || 'SPECIAL OFFER';
            
            const isExpired = new Date(offer.validUntil) < new Date();
            
            return (
              <Link href={`/offer/${offer.id}`} key={offer.id}>
                <Card 
                  className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white cursor-pointer"
                >
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden">
                      {/* Discount Badge - Responsive */}
                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 z-10">
                        <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 text-xs sm:text-sm md:text-base font-bold shadow-lg">
                          {discount}
                        </Badge>
                      </div>

                      {/* Expired Badge - Responsive */}
                      {isExpired && (
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 z-10">
                          <Badge className="bg-gray-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 text-xs sm:text-sm md:text-base font-bold shadow-lg">
                            EXPIRED
                          </Badge>
                        </div>
                      )}

                      {/* Image - Responsive Heights */}
                      <div className="relative h-48 xs:h-56 sm:h-72 md:h-80 lg:h-96 xl:h-[400px] overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                        <img
                          src={offer.imageUrl}
                          alt={offer.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      {/* Content Overlay - Responsive Padding & Text */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 sm:p-4 md:p-6 lg:p-8">
                        <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-1 sm:mb-2 line-clamp-2">
                          {offer.title}
                        </h3>
                        <p className="text-xs sm:text-sm md:text-base text-white/90 line-clamp-2 sm:line-clamp-3">
                          {offer.description}
                        </p>
                        {!isExpired && (
                          <p className="text-xs sm:text-sm text-white/75 mt-1 sm:mt-2">
                            Valid until {new Date(offer.validUntil).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* CTA Section - Fully Responsive */}
        <div className="mt-8 sm:mt-12 md:mt-16 text-center bg-white/70 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-xl">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mb-4 sm:mb-5 md:mb-6">
            <Gift className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
            Don't Miss Out!
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-4 sm:mb-5 md:mb-6 max-w-2xl mx-auto px-4">
            These offers are for a limited time only. Shop now and save big on your favorite beauty products.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link href="/products" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold shadow-lg">
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Shop All Products
              </Button>
            </Link>
            <Link href="/combos" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-pink-500 text-pink-600 hover:bg-pink-50 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold">
                <Percent className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                View Combo Deals
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}