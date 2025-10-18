
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComboProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  discount: string;
  imageUrl: string;
  products: string[];
  rating: number;
  reviewCount: number;
}

const comboProducts: ComboProduct[] = [
  {
    id: 1,
    name: "Complete Skincare Combo",
    description: "Get radiant, healthy skin with our complete skincare routine",
    price: 1499,
    originalPrice: 2499,
    discount: "40% OFF",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
    products: ["Face Wash", "Toner", "Moisturizer", "Night Cream"],
    rating: 4.8,
    reviewCount: 156
  },
  {
    id: 2,
    name: "Hair Care Essential Pack",
    description: "Transform your hair with our premium hair care collection",
    price: 1299,
    originalPrice: 2199,
    discount: "35% OFF",
    imageUrl: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&h=400&fit=crop",
    products: ["Shampoo", "Conditioner", "Hair Serum", "Hair Mask"],
    rating: 4.7,
    reviewCount: 203
  },
  {
    id: 3,
    name: "Makeup Starter Kit",
    description: "Everything you need to create stunning makeup looks",
    price: 1999,
    originalPrice: 3499,
    discount: "45% OFF",
    imageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=400&fit=crop",
    products: ["Foundation", "Lipstick", "Eyeliner", "Mascara", "Blush"],
    rating: 4.9,
    reviewCount: 287
  },
  {
    id: 4,
    name: "Body Care Bundle",
    description: "Pamper yourself with luxurious body care essentials",
    price: 1699,
    originalPrice: 2799,
    discount: "40% OFF",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f992d8b1?w=400&h=400&fit=crop",
    products: ["Body Wash", "Body Lotion", "Body Scrub", "Body Butter"],
    rating: 4.6,
    reviewCount: 134
  },
  {
    id: 5,
    name: "Anti-Aging Power Combo",
    description: "Fight signs of aging with our premium anti-aging collection",
    price: 2499,
    originalPrice: 4199,
    discount: "40% OFF",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
    products: ["Anti-Aging Serum", "Eye Cream", "Day Cream", "Night Serum"],
    rating: 4.9,
    reviewCount: 421
  },
  {
    id: 6,
    name: "Bridal Beauty Box",
    description: "Complete bridal beauty essentials for your special day",
    price: 3499,
    originalPrice: 5999,
    discount: "42% OFF",
    imageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=400&fit=crop",
    products: ["Bridal Face Pack", "Highlighter", "Setting Spray", "Primer", "Lip Kit"],
    rating: 5.0,
    reviewCount: 98
  }
];

export default function ComboPage() {
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState<number[]>([]);

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
          {comboProducts.map((combo) => (
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
                          i < Math.floor(combo.rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {combo.rating} ({combo.reviewCount} reviews)
                  </span>
                </div>

                {/* Products Included */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Includes:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {combo.products.map((product, index) => (
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
                        ₹{combo.price}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        ₹{combo.originalPrice}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      You save ₹{combo.originalPrice - combo.price}
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
          ))}
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
