import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton";
import { LazyImage } from "@/components/LazyImage";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";

interface Slider {
  id: number;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
}

interface Offer {
  id: number;
  isActive: boolean;
  sortOrder: number;
  imageUrl?: string | null;
  bannerImageUrl?: string | null;
  bannerImages?: string[] | null;
}

type HeroSlide = {
  key: string;
  imageUrl: string;
  sortOrder: number;
  type: 'slider' | 'offer';
  offerId?: number;
};

interface HeroBannerProps {
  autoplay?: boolean;
  autoplayDelay?: number;
  showIndicators?: boolean;
  showProgress?: boolean;
  showControls?: boolean;
}

function getImageDimensionsFromUrl(src?: string | null): { width?: number; height?: number } {
  if (!src) return {};
  try {
    const url = new URL(src, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const wRaw = url.searchParams.get('w') || url.searchParams.get('width');
    const hRaw = url.searchParams.get('h') || url.searchParams.get('height');
    const width = wRaw ? Number(wRaw) : undefined;
    const height = hRaw ? Number(hRaw) : undefined;
    if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return {};
    }
    return { width, height };
  } catch {
    return {};
  }
}

export default function HeroBanner({
  autoplay = true,
  autoplayDelay = 8000,
  showIndicators = true,
  showProgress = true,
  showControls = true,
}: HeroBannerProps) {
  const [, setLocation] = useLocation();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [progress, setProgress] = useState(0);

  // Fetch sliders from API
  const { data: slidersData = [], isLoading: slidersLoading, error: slidersError } = useQuery<Slider[]>({
    queryKey: ['sliders'],
    queryFn: async () => {
      const response = await fetch('/api/sliders');
      if (!response.ok) {
        throw new Error('Failed to fetch sliders');
      }
      const data = await response.json();
      // Ensure data is an array
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: offersData = [], isLoading: offersLoading, error: offersError } = useQuery<Offer[]>({
    queryKey: ['/api/offers'],
  });

  // Filter only active sliders and sort by sortOrder
  const sliderSlides: HeroSlide[] = Array.isArray(slidersData)
    ? slidersData
        .filter((slider) => slider.isActive)
        .map((slider) => ({
          key: `slider-${slider.id}`,
          imageUrl: slider.imageUrl,
          sortOrder: slider.sortOrder,
          type: 'slider' as const,
        }))
    : [];

  const offerSlides: HeroSlide[] = Array.isArray(offersData)
    ? offersData
        .filter((offer) => offer.isActive)
        .map((offer) => {
          const imageUrl =
            offer.imageUrl ||
            offer.bannerImageUrl ||
            (Array.isArray(offer.bannerImages) ? offer.bannerImages[0] : null) ||
            '';

          return {
            key: `offer-${offer.id}`,
            imageUrl,
            sortOrder: offer.sortOrder,
            type: 'offer' as const,
            offerId: offer.id,
          };
        })
        .filter((s) => !!s.imageUrl)
    : [];

  const slides: HeroSlide[] = [...sliderSlides, ...offerSlides].sort((a, b) => a.sortOrder - b.sortOrder);

  const lcpSlide = slides[0];
  const lcpImageUrl = lcpSlide?.imageUrl;
  const isLcpSlide = (slide: HeroSlide) => slide.key === lcpSlide?.key;

  // Reserve space for hero images (reduces CLS)
  const firstOfferSlide = slides.find((s) => s.type === 'offer');
  const heroBaseUrl = firstOfferSlide?.imageUrl || lcpImageUrl;
  const { width: heroWFromUrl, height: heroHFromUrl } = getImageDimensionsFromUrl(heroBaseUrl);
  const HERO_WIDTH = heroWFromUrl || 1920;
  const HERO_HEIGHT = heroHFromUrl || 600;

  const isLoading = slidersLoading || offersLoading;
  const error = slidersError || offersError;

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

  if (error && !slides.length) {
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
    <section className="relative w-full" aria-label="Hero banner carousel">
      {lcpImageUrl ? (
        <Helmet>
          <link
            {...({
              rel: 'preload',
              as: 'image',
              href: lcpImageUrl,
              fetchpriority: 'high',
            } as any)}
          />
        </Helmet>
      ) : null}
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
            <CarouselItem key={slide.key}>
              <div
                className={
                  slide.type === 'offer'
                    ? "mobile-slider-container relative w-full overflow-hidden bg-white"
                    : "mobile-slider-container relative w-full overflow-hidden"
                }
                style={{ aspectRatio: `${HERO_WIDTH}/${HERO_HEIGHT}` }}
                role={slide.type === 'offer' ? 'button' : undefined}
                tabIndex={slide.type === 'offer' ? 0 : undefined}
                onClick={() => {
                  if (slide.type === 'offer' && slide.offerId) {
                    setLocation(`/offer/${slide.offerId}`);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && slide.type === 'offer' && slide.offerId) {
                    setLocation(`/offer/${slide.offerId}`);
                  }
                }}
              >
                {slide.type === 'offer' ? (
                  <img
                    src={slide.imageUrl}
                    alt={`Offer ${slide.offerId ?? ''}`}
                    className="w-full h-full object-contain bg-gray-100"
                    loading={isLcpSlide(slide) ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={isLcpSlide(slide) ? 'high' : 'auto'}
                    width={HERO_WIDTH}
                    height={HERO_HEIGHT}
                  />
                ) : (
                  <LazyImage
                    src={slide.imageUrl} 
                    alt={slide.key}
                    width={HERO_WIDTH}
                    height={HERO_HEIGHT}
                    priority={isLcpSlide(slide)}
                    className="w-full object-contain bg-gray-100"
                  />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {showControls && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20  rounded-full p-2  transition-all"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20  rounded-full p-2  transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6 text-gray-800" />
            </button>
          </>
        )}

        

        {/* <div className="absolute top-6 right-6 z-20 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
          {current + 1} / {slides.length}
        </div> */}
      </Carousel>
    </section>
  );
}