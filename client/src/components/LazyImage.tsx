
import { useState, useEffect, useRef } from 'react';
import { optimizeImageUrl } from '@/lib/imageUtils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  fit?: 'crop' | 'contain' | 'cover';
  fallbackSrc?: string;
}

export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  width = 400, 
  height = 400,
  priority = false,
  fit,
  fallbackSrc
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const defaultFallback = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80';
  const finalFallback = fallbackSrc || defaultFallback;
  
  const optimizedSrc = optimizeImageUrl(src, { 
    width, 
    height, 
    quality: priority ? 85 : 75,
    fit
  });

  const handleError = () => {
    setHasError(true);
  };

  const displaySrc = hasError ? finalFallback : optimizedSrc;

  return (
    <div className="relative" style={{ aspectRatio: `${width}/${height}` }}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={isInView ? displaySrc : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className={`${className} ${isLoaded || hasError ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        width={width}
        height={height}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
      />
    </div>
  );
}
