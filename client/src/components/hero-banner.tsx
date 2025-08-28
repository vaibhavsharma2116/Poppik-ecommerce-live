import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton";

interface Slider {
  id: number;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
}

interface HeroBannerProps {
  autoplay?: boolean;
  autoplayDelay?: number;
  showIndicators?: boolean;
  showProgress?: boolean;
  showControls?: boolean;
}

export default function HeroBanner({
  autoplay = true,
  autoplayDelay = 8000,
  showIndicators = true,
  showProgress = true,
  showControls = true,
}: HeroBannerProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [progress, setProgress] = useState(0);

  // Fetch sliders from API
  const { data: slidersData = [], isLoading, error } = useQuery<Slider[]>({
    queryKey: ['sliders'],
    queryFn: async () => {
      const response = await fetch('/api/sliders');
      if (!response.ok) {
        throw new Error('Failed to fetch sliders');
      }
      return response.json();
    },
  });

  // Filter only active sliders and sort by sortOrder
  const slides = slidersData.filter(slider => slider.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
      setProgress(0);
    });
  }, [api]);

  useEffect(() => {
    if (!isPlaying || !api) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (api.canScrollNext()) {
            api.scrollNext();
          } else {
            api.scrollTo(0);
          }
          return 0;
        }
        return prev + (100 / (autoplayDelay / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [api, isPlaying, autoplayDelay]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const goToSlide = (index: number) => {
    api?.scrollTo(index);
    setProgress(0);
  };

  const nextSlide = () => {
    if (api?.canScrollNext()) {
      api.scrollNext();
    } else {
      api?.scrollTo(0);
    }
    setProgress(0);
  };

  const prevSlide = () => {
    if (api?.canScrollPrev()) {
      api.scrollPrev();
    } else {
      api?.scrollTo(slides.length - 1);
    }
    setProgress(0);
  };

  if (isLoading) {
    return (
      <div className="w-full relative">
        <Skeleton className="w-full aspect-video" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center bg-red-50 py-20">
        <p className="text-red-500">Failed to load hero banner: {(error as Error).message}</p>
      </div>
    );
  }

  if (!slides.length) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-50 py-20">
        <p className="text-gray-500">No slides available</p>
      </div>
    );
  }

  return (
    <section className="relative w-full -mt-4" aria-label="Hero banner carousel">
      <Carousel
        setApi={setApi}
        className="w-full"
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem key={slide.id}>
              <div className="mobile-slider-container relative w-full overflow-hidden">
                {showProgress && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 z-10">
                    <div 
                      className="h-full bg-red-500 transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                      aria-hidden="true"
                    />
                  </div>
                )}

                <img 
                  src={slide.imageUrl} 
                  alt={`Slide ${slide.id}`}
                  className="w-full object-contain bg-gray-100"
                  style={{ aspectRatio: 'auto' }}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {showControls && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5 text-gray-800" />
            </button>
          </>
        )}

        

        <div className="absolute top-6 right-6 z-20 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
          {current + 1} / {slides.length}
        </div>
      </Carousel>
    </section>
  );
}