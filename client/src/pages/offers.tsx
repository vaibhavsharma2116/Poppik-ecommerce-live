
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
  discount: string;
  validUntil: string;
  isActive: boolean;
}

export default function OffersPage() {
  const { data: offers = [], isLoading } = useQuery<Offer[]>({
    queryKey: ['/api/offers'],
  });

  // Mock offers data if API is not ready
  const mockOffers = [
    {
      id: 1,
      title: "Shop For ₹1499 & Get 25% Sitewide",
      description: "Save big on your favorite beauty products",
      imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=500&fit=crop",
      discount: "25% OFF",
      validUntil: "2024-12-31",
      isActive: true,
    },
    {
      id: 2,
      title: "Free 4-in-1 Manicure Kit",
      description: "On every order of ₹1500 + extra tablets on every order",
      imageUrl: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&h=500&fit=crop",
      discount: "FREE GIFT",
      validUntil: "2024-12-31",
      isActive: true,
    },
    {
      id: 3,
      title: "Eyeshadow Palette Sale",
      description: "Get stunning eyeshadow palettes at amazing prices",
      imageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=500&fit=crop",
      discount: "30% OFF",
      validUntil: "2024-12-31",
      isActive: true,
    },
    {
      id: 4,
      title: "Beauty Shopping Spree",
      description: "Get ₹500 off on orders above ₹2000",
      imageUrl: "https://images.unsplash.com/photo-1583241800698-c463e2daa44f?w=800&h=500&fit=crop",
      discount: "₹500 OFF",
      validUntil: "2024-12-31",
      isActive: true,
    },
    {
      id: 5,
      title: "7-in-1 Manicure Kit Free",
      description: "Luxury pedicure kit on every order of ₹2000",
      imageUrl: "https://images.unsplash.com/photo-1599948128020-9a44c8f9547f?w=800&h=500&fit=crop",
      discount: "FREE GIFT",
      validUntil: "2024-12-31",
      isActive: true,
    },
    {
      id: 6,
      title: "Lips Care Bonanza",
      description: "Buy 3 lip products and get 40% off",
      imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&h=500&fit=crop",
      discount: "40% OFF",
      validUntil: "2024-12-31",
      isActive: true,
    },
    {
      id: 7,
      title: "Free Tote Bag",
      description: "On all orders above ₹1200",
      imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=500&fit=crop",
      discount: "FREE GIFT",
      validUntil: "2024-12-31",
      isActive: true,
    },
    {
      id: 8,
      title: "Glitter Trousseau Box",
      description: "Complete bridal makeup collection at special prices",
      imageUrl: "https://images.unsplash.com/photo-1515688594390-b649af70d282?w=800&h=500&fit=crop",
      discount: "35% OFF",
      validUntil: "2024-12-31",
      isActive: true,
    },
    {
      id: 9,
      title: "Enjoy 20% Off Sitewide",
      description: "Limited time offer on all products",
      imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=500&fit=crop",
      discount: "20% OFF",
      validUntil: "2024-12-31",
      isActive: true,
    },
  ];

  const displayOffers = offers.length > 0 ? offers : mockOffers;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-12 sm:py-16">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4 sm:mb-6">
            <Tag className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            OFFERS
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Explore our exclusive deals and save big on your favorite beauty products
          </p>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:gap-10">
          {displayOffers.map((offer) => (
            <Card 
              key={offer.id} 
              className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white"
            >
              <CardContent className="p-0">
                <div className="relative overflow-hidden">
                  {/* Discount Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 text-sm sm:text-base font-bold shadow-lg">
                      {offer.discount}
                    </Badge>
                  </div>

                  {/* Image */}
                  <div className="relative aspect-[16/9] sm:aspect-[21/9] overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                    <img
                      src={offer.imageUrl}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-6 sm:p-8">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
                      {offer.title}
                    </h3>
                    <p className="text-sm sm:text-base text-white/90 mb-4">
                      {offer.description}
                    </p>
                    <Button className="bg-white text-pink-600 hover:bg-pink-50 font-semibold shadow-lg">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Shop Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-12 sm:mt-16 text-center bg-white/70 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mb-6">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Don't Miss Out!
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            These offers are for a limited time only. Shop now and save big on your favorite beauty products.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products">
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 text-lg font-semibold shadow-lg">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Shop All Products
              </Button>
            </Link>
            <Link href="/combos">
              <Button size="lg" variant="outline" className="border-2 border-pink-500 text-pink-600 hover:bg-pink-50 px-8 py-3 text-lg font-semibold">
                <Percent className="h-5 w-5 mr-2" />
                View Combo Deals
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
