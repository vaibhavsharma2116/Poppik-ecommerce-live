
import { useState, useEffect, useCallback } from 'react';
import { optimizeImageUrl, supportsWebP, type ImageOptimizationOptions } from '@/lib/imageUtils';

interface UseImageOptimizationOptions extends ImageOptimizationOptions {
  lazy?: boolean;
  preload?: boolean;
}

export function useImageOptimization(
  src: string,
  options: UseImageOptimizationOptions = {}
) {
  const [optimizedSrc, setOptimizedSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null);

  // Check WebP support
  useEffect(() => {
    supportsWebP().then(setWebpSupported);
  }, []);

  // Generate optimized URL
  useEffect(() => {
    if (webpSupported === null) return;

    const optimizationOptions = {
      ...options,
      format: webpSupported ? 'webp' as const : options.format
    };

    const optimized = optimizeImageUrl(src, optimizationOptions);
    setOptimizedSrc(optimized);
  }, [src, options, webpSupported]);

  // Preload image if requested
  useEffect(() => {
    if (!options.preload || !optimizedSrc) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = (e) => setError(new Error('Failed to load image'));
    img.src = optimizedSrc;
  }, [optimizedSrc, options.preload]);

  const load = useCallback(() => {
    if (!optimizedSrc) return Promise.reject(new Error('No optimized source available'));

    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setIsLoaded(true);
        resolve();
      };
      img.onerror = () => {
        const error = new Error('Failed to load image');
        setError(error);
        reject(error);
      };
      img.src = optimizedSrc;
    });
  }, [optimizedSrc]);

  return {
    src: optimizedSrc,
    isLoaded,
    error,
    load,
    webpSupported
  };
}

// Hook for intersection observer based lazy loading
export function useIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) {
  const [observer, setObserver] = useState<IntersectionObserver | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
    setObserver(obs);

    return () => obs.disconnect();
  }, [callback, options]);

  return observer;
}

// Hook for responsive image loading
export function useResponsiveImages(
  src: string,
  breakpoints: number[] = [400, 800, 1200, 1600]
) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState(400);

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const suitable = breakpoints.find(bp => width <= bp) || breakpoints[breakpoints.length - 1];
      setCurrentBreakpoint(suitable);
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, [breakpoints]);

  return useImageOptimization(src, {
    width: currentBreakpoint,
    quality: currentBreakpoint <= 400 ? 75 : 80
  });
}
