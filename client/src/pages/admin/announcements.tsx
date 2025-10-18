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

  if (!isVisible || announcements.length === 0) return null;

  const announcementText = announcements.map(a => a.text).join(' • ');

  return (
    <div className="relative bg-black text-white py-2.5 sm:py-2 text-center overflow-hidden min-h-[40px] sm:min-h-[36px]">
      <div className="whitespace-nowrap animate-scroll text-[11px] leading-[1.3] xs:text-xs sm:text-sm md:text-base font-medium tracking-wide">
        {announcementText}
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-scroll {
          display: inline-block;
          animation: scroll 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
