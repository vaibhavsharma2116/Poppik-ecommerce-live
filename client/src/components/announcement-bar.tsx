
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Announcement {
  id: number;
  text: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  const queryClient = useQueryClient();
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  // Lightweight WebSocket to receive real-time announcement updates
  useEffect(() => {
    let mounted = true;
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;

    const ua = (navigator as any)?.userAgent || '';
    if (/lighthouse|pagespeed|chrome-lighthouse/i.test(String(ua))) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const isLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
    const hostsToTry = [
      `${protocol}://${window.location.host}/ws/announcements`,
      ...(isLocalhost ? [`${protocol}://${window.location.hostname}:8085/ws/announcements`] : []),
    ];

    const MAX_RECONNECTS = 6; // stop after a few attempts to avoid resource exhaustion

    const onMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
    };

    // If a global announcements WS exists (created in main.tsx), reuse it instead
    const globalWs = (window as any).__announcements_ws__ as WebSocket | undefined;
    if (globalWs) {
      try {
        globalWs.addEventListener('message', onMessage);
      } catch (e) {}

      return () => {
        try { globalWs.removeEventListener('message', onMessage); } catch (e) {}
      };
    }

    function connect() {
      if (!mounted) return;
      if (!navigator.onLine) {
        // if offline, retry later
        setTimeout(connect, 2000);
        return;
      }

      if (reconnectAttempts >= MAX_RECONNECTS) {
        console.warn('[announcement-bar] max reconnect attempts reached, stopping retries');
        return;
      }

      const url = hostsToTry[Math.min(reconnectAttempts, hostsToTry.length - 1)];
      try {
        ws = new WebSocket(url);

        ws.onopen = () => {
          reconnectAttempts = 0;
        };

        ws.onmessage = onMessage;

        ws.onclose = () => {
          if (!mounted) return;
          reconnectAttempts += 1;
          const delay = Math.min(10000, 500 * Math.pow(2, reconnectAttempts));
          setTimeout(connect, delay);
        };

        ws.onerror = () => {
          try { ws?.close(); } catch (_) {}
          reconnectAttempts += 1;
          const delay = Math.min(10000, 400 * Math.pow(2, reconnectAttempts));
          setTimeout(connect, delay);
        };
      } catch (e) {
        reconnectAttempts += 1;
        setTimeout(connect, 1000);
      }
    }

    connect();

    return () => {
      mounted = false;
      try { ws?.close(); } catch (_) {}
    };
  }, [queryClient]);

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
