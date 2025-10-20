
import { Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function MakeupStudio() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-4xl w-full">
        {/* Back Button */}
        <div className="mb-4 sm:mb-8">
          <Link href="/">
            <Button variant="ghost" className="group text-sm sm:text-base">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-4 sm:space-y-8 bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-yellow-400 rounded-full animate-bounce"></div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 px-2">
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Poppik Makeup Studio
            </span>
          </h1>

          <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 animate-pulse" />
            <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700">
              Coming Soon
            </p>
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 animate-pulse" />
          </div>

          <p className="text-sm sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto px-2">
            Get ready for a transformative beauty experience! Our exclusive Makeup Studio will offer professional makeup services, personalized consultations, and expert beauty transformations. Stay tuned for the grand opening!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <Link href="/">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                Explore Products
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
