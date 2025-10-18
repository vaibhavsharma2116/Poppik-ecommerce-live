
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComboProduct {
  id: number;
  name: string;
  description: string;
  price: string | number;
  originalPrice: string | number;
  discount: string;
  imageUrl: string;
  products: string[] | string;
  rating: string | number;
  reviewCount: number;
}

export default function ComboPage() {
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState<number[]>([]);

  const { data: comboProducts = [], isLoading } = useQuery<ComboProduct[]>({
    queryKey: ["/api/combos"],
  });

  const handleAddToCart = (combo: ComboProduct) => {
    toast({
      title: "Added to Cart",
      description: `${combo.name} has been added to your cart.`,
    });
  };

  const handleToggleWishlist = (comboId: number) => {
    setWishlist(prev => {
      const isInWishlist = prev.includes(comboId);
      if (isInWishlist) {
        toast({
          title: "Removed from Wishlist",
          description: "Combo removed from your wishlist.",
        });
        return prev.filter(id => id !== comboId);
      } else {
        toast({
          title: "Added to Wishlist",
          description: "Combo added to your wishlist.",
        });
        return [...prev, comboId];
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Exclusive Combo Offers
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 font-medium">
              Save more with our specially curated combo packs
            </p>
          </div>
        </div>

        {/* Combo Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {comboProducts.map((combo) => {
            const products = typeof combo.products === 'string' ? JSON.parse(combo.products) : combo.products;
            const price = typeof combo.price === 'string' ? parseFloat(combo.price) : combo.price;
            const originalPrice = typeof combo.originalPrice === 'string' ? parseFloat(combo.originalPrice) : combo.originalPrice;
            const rating = typeof combo.rating === 'string' ? parseFloat(combo.rating) : combo.rating;

            return (
            <Card key={combo.id} className="overflow-hidden bg-white/70 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="relative">
                <img
                  src={combo.imageUrl}
                  alt={combo.name}
                  className="w-full h-64 object-cover"
                />
                <Badge className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 text-lg font-bold">
                  {combo.discount}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute top-4 left-4 rounded-full ${
                    wishlist.includes(combo.id)
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-white/90 hover:bg-white"
                  }`}
                  onClick={() => handleToggleWishlist(combo.id)}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      wishlist.includes(combo.id) ? "fill-current" : ""
                    }`}
                  />
                </Button>
              </div>

              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {combo.name}
                </h3>
                <p className="text-gray-600 mb-4 text-sm">
                  {combo.description}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {rating} ({combo.reviewCount} reviews)
                  </span>
                </div>

                {/* Products Included */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Includes:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {products.map((product: string, index: number) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-xs"
                      >
                        {product}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        ₹{price}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        ₹{originalPrice}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      You save ₹{originalPrice - price}
                    </p>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => handleAddToCart(combo)}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          );
        })}
        </div>

        {/* Benefits Section */}
        <div className="mt-16 bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/20">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Why Choose Our Combos?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="font-bold text-lg mb-2">Save More</h3>
              <p className="text-gray-600">Get up to 45% off on combo packs</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="font-bold text-lg mb-2">Curated Selection</h3>
              <p className="text-gray-600">Expertly selected products that work together</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎁</span>
              </div>
              <h3 className="font-bold text-lg mb-2">Perfect Gifting</h3>
              <p className="text-gray-600">Beautifully packaged for any occasion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
