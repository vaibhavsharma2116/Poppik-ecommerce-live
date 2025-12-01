import React, { useState, useEffect } from 'react';
import { Loader2, Play, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MediaLink {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  videoUrl?: string;
  redirectUrl: string;
  category: string;
  type: string;
  clickCount: number;
  isActive: boolean;
  sortOrder: number;
  validFrom?: string;
  validUntil?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export default function MediaLinks() {
  const [mediaList, setMediaList] = useState<MediaLink[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaLink[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch media list and subscribe to server-sent events for live updates
  useEffect(() => {
    fetchMediaList();

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/media/stream');
      es.addEventListener('media', (e: MessageEvent) => {
        try {
          const payload = JSON.parse((e as any).data);
          if (!payload || !payload.action) return;
          switch (payload.action) {
            case 'create':
              setMediaList(prev => {
                const next = [payload.item, ...prev];
                setFilteredMedia(next);
                return next;
              });
              break;
            case 'update':
              setMediaList(prev => {
                const idx = prev.findIndex(p => p.id === payload.item.id);
                if (idx === -1) return prev;
                const copy = [...prev];
                copy[idx] = payload.item;
                setFilteredMedia(copy);
                return copy;
              });
              break;
            case 'delete':
              setMediaList(prev => {
                const next = prev.filter(p => p.id !== payload.item.id);
                setFilteredMedia(next);
                return next;
              });
              break;
            case 'reorder':
              if (Array.isArray(payload.items)) {
                setMediaList(payload.items);
                setFilteredMedia(payload.items);
              }
              break;
            default:
              break;
          }
        } catch (err) {
          console.warn('Error processing media SSE event:', err);
        }
      });
    } catch (e) {
      console.warn('SSE not available for media page:', e);
    }

    return () => { if (es) es.close(); };
  }, []);

  const fetchMediaList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/media?isActive=true', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setMediaList(data);
        setFilteredMedia(data);
      } else {
        toast({ title: 'Error', description: 'Failed to fetch media', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({ title: 'Error', description: 'Failed to fetch media', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filter by type
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredMedia(mediaList);
    } else {
      setFilteredMedia(mediaList.filter(m => m.type === selectedCategory));
    }
  }, [selectedCategory, mediaList]);

  // Get unique types
  const categories = ['all', ...Array.from(new Set(mediaList.map(m => m.type)))];

  // Handle media click - track and redirect
  const handleMediaClick = async (media: MediaLink) => {
    setRedirecting(media.id);
    try {
      const response = await fetch(`/api/media/${media.id}/click`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to the URL
        window.open(data.redirectUrl, '_blank');
      } else {
        // Still try to redirect even if tracking failed
        window.open(media.redirectUrl, '_blank');
      }
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still redirect even if tracking failed
      window.open(media.redirectUrl, '_blank');
    } finally {
      setRedirecting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading media...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div>
        {/* Page Title */}
        <div className="mb-12 text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl  text-gray-900 mb-4">OUR MEDIA</h1>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="mb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex gap-8 border-b border-gray-300 pb-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`pb-2 font-medium text-sm sm:text-base transition-all whitespace-nowrap ${
                    selectedCategory === category
                      ? 'text-black border-b-2 border-black'
                      : 'text-gray-400 border-b-2 border-transparent hover:text-gray-600'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Media Grid - Image and Video */}
        {filteredMedia.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg mx-4 sm:mx-6 lg:mx-8">
            <p className="text-gray-500 text-lg">No media found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-6 lg:px-8">
            {filteredMedia.map((media) => (
              <div
                key={media.id}
                className="cursor-pointer relative group"
                onClick={() => handleMediaClick(media)}
              >
                {/* Image - No Shadow, No Border */}
                {media.type === 'image' ? (
                  <img
                    src={media.imageUrl}
                    alt={media.title}
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  /* Video */
                  <div className="relative w-full h-64 bg-black overflow-hidden">
                    <video
                      src={media.videoUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      onError={() => {
                        console.error('Error loading video:', media.videoUrl);
                      }}
                    />
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-all">
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
