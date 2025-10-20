
import { Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function FashionShow() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-8 bg-white/80 backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-bounce"></div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Poppik Fashion Show
            </span>
          </h1>

          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
            <p className="text-xl sm:text-2xl font-semibold text-gray-700">
              Coming Soon
            </p>
            <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
          </div>

          <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Experience the glamour and beauty! Join us for an exclusive fashion show featuring the latest trends, stunning looks, and unforgettable runway moments. Get ready to witness beauty redefined!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                Explore Products
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="px-8 py-6 text-lg rounded-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
