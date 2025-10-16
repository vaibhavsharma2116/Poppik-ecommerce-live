
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

interface Announcement {
  id: number;
  text: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
  });

  useEffect(() => {
    if (announcements.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  if (!isVisible || announcements.length === 0) return null;

  return (
    <div className="relative bg-black text-white py-2.5 sm:py-2 text-center overflow-hidden min-h-[40px] sm:min-h-[36px]">
      <div className="flex items-center justify-center h-full px-2 sm:px-4">
        {announcements.map((announcement, index) => (
          <div
            key={announcement.id}
            className={`absolute inset-0 flex items-center justify-center px-3 sm:px-6 md:px-8 transition-all duration-500 ${
              index === currentIndex
                ? "opacity-100 translate-x-0"
                : index < currentIndex
                ? "opacity-0 -translate-x-full"
                : "opacity-0 translate-x-full"
            }`}
          >
            <p className="text-[11px] leading-[1.3] xs:text-xs sm:text-sm md:text-base font-medium tracking-wide max-w-full announcement-bar-mobile">
              {announcement.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
