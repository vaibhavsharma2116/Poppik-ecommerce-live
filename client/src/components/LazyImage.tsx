
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
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 2;

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px 0px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  const optimizedSrc = optimizeImageUrl(src || '', { 
    width, 
    height, 
    quality: priority ? 85 : 75,
    fit
  });

  const handleError = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setIsLoaded(false);
    } else {
      setHasError(true);
    }
  };

  const displaySrc = hasError && fallbackSrc ? fallbackSrc : optimizedSrc;
  const key = `${src}-${retryCount}`;

  if (!src || !src.trim()) {
    return (
      <div 
        className={`relative ${className}`} 
        style={{ aspectRatio: `${width}/${height}` }}
      >
        <div className="absolute inset-0 bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="relative" style={{ aspectRatio: `${width}/${height}` }}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        key={key}
        ref={imgRef}
        src={isInView ? displaySrc : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className={`${className} ${isLoaded || (hasError && fallbackSrc) ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        width={width}
        height={height}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
      />
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 bg-gray-200" />
      )}
    </div>
  );
}
