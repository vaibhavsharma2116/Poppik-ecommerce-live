
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface Announcement {
  id: number;
  text: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
  });

  // Ensure announcements is an array
  if (!isVisible || !Array.isArray(announcements) || announcements.length === 0) return null;

  // Combine all announcements with separator and spacing (minimum 6 non-breaking spaces)
  const spacing = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'; // 6 non-breaking spaces
  const announcementText = announcements.map(a => a.text).join(`${spacing}•${spacing}`);
  
  // Duplicate the text for seamless loop
  const duplicatedText = `${announcementText}${spacing}•${spacing}${announcementText}`;

  return (
    <div className="relative bg-black text-white py-2.5 sm:py-2 overflow-hidden min-h-[40px] sm:min-h-[36px]">
      <div className="flex">
        <div className="animate-scroll-continuous whitespace-pre text-[11px] leading-[1.3] xs:text-xs sm:text-sm md:text-base font-medium tracking-wide">
          {duplicatedText}
        </div>
      </div>

      <style>{`
        @keyframes scroll-continuous {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll-continuous {
          display: inline-block;
          animation: scroll-continuous 30s linear infinite;
        }
        
        .animate-scroll-continuous:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
