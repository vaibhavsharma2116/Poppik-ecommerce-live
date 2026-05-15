
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
}

export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  width = 400, 
  height = 400,
  priority = false,
  fit
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
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

  const optimizedSrc = optimizeImageUrl(src, { 
    width, 
    height, 
    quality: priority ? 85 : 75,
    fit
  });

  return (
    <div className="relative" style={{ aspectRatio: `${width}/${height}` }}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={isInView ? optimizedSrc : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        width={width}
        height={height}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}
