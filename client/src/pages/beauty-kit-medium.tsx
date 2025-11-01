
import { Sparkles, Package } from "lucide-react";

export default function BeautyKitMedium() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-16 md:py-24">
        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-white rounded-full p-4 sm:p-6 shadow-2xl">
                <Package className="h-12 w-12 sm:h-16 sm:w-16 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 px-2">
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Design Your Beauty Kit - Medium
            </span>
          </h1>

          <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 animate-pulse" />
            <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700">
              Coming Soon
            </p>
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 animate-pulse" />
          </div>

          <p className="text-sm sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
            Get ready to design your perfect Medium Beauty Kit! Build a comprehensive collection with a great balance of must-have products for your beauty routine.
          </p>
        </div>
      </div>
    </div>
  );
}
