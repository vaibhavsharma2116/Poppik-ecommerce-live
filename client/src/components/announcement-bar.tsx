
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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

  const handleAnimationEnd = () => {
    if (announcements.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
    }
  };

  if (!isVisible || announcements.length === 0) return null;

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="relative bg-black text-white py-2.5 sm:py-2 text-center overflow-hidden min-h-[40px] sm:min-h-[36px]">
      <div className="flex items-center justify-center h-full">
        <div
          key={currentAnnouncement.id}
          className="animate-continuous-marquee text-[11px] leading-[1.3] xs:text-xs sm:text-sm md:text-base font-medium tracking-wide whitespace-nowrap inline-block"
          onAnimationIteration={handleAnimationEnd}
        >
          {currentAnnouncement.text}
        </div>
      </div>
    </div>
  );
}
