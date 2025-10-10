
import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Announcement {
  id: number;
  text: string;
}

const announcements: Announcement[] = [
  { id: 1, text: "🎁 FREE GIFTS ON ORDERS ABOVE ₹399" },
  { id: 2, text: "🚚 FREE SHIPPING ON ALL PREPAID ORDERS" },
  { id: 3, text: "✨ SPECIAL DIWALI OFFERS - UPTO 50% OFF" },
];

export default function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
    }, 4000); // Change announcement every 3 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="relative bg-black text-white py-2 px-4 text-center overflow-hidden">
      <div className="flex items-center justify-center gap-2">
        {announcements.map((announcement, index) => (
          <div
            key={announcement.id}
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
              index === currentIndex
                ? "opacity-100 translate-x-0"
                : index < currentIndex
                ? "opacity-0 -translate-x-full"
                : "opacity-0 translate-x-full"
            }`}
          >
            <span className="text-xs sm:text-sm font-medium tracking-wide">
              {announcement.text}
            </span>
          </div>
        ))}
      </div>

      {/* Close Button */}
      {/* <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
        aria-label="Close announcement"
      >
        <X className="w-4 h-4" />
      </button> */}

      {/* Slide Indicators */}
      {/* <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1 pb-1">
        {announcements.map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? "bg-white w-4" : "bg-white/40"
            }`}
          />
        ))}
      </div> */}
    </div>
  );
}
