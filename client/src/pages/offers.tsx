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

      </div>
    </div>
  );
}