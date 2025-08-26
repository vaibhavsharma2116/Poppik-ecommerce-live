
import React, { useState, useRef, useEffect } from 'react';
import { optimizeImageUrl, createResponsiveImageSet, type ImageOptimizationOptions } from '@/lib/imageUtils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  optimization?: ImageOptimizationOptions;
  placeholder?: string;
  lazy?: boolean;
  responsive?: boolean;
  onLoadComplete?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  optimization = {},
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+',
  lazy = true,
  responsive = false,
  onLoadComplete,
  className = '',
  style = {},
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoadComplete?.();
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  const getImageProps = () => {
    if (error) {
      return {
        src: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80',
        srcSet: undefined,
        sizes: undefined
      };
    }

    if (!isInView) {
      return {
        src: placeholder,
        srcSet: undefined,
        sizes: undefined
      };
    }

    if (responsive) {
      const responsiveSet = createResponsiveImageSet(src, optimization.width);
      return responsiveSet;
    }

    return {
      src: optimizeImageUrl(src, optimization),
      srcSet: undefined,
      sizes: undefined
    };
  };

  const imageProps = getImageProps();

  return (
    <img
      ref={imgRef}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{
        backgroundColor: '#f3f4f6',
        objectFit: 'contain',
        ...style
      }}
      onLoad={handleLoad}
      onError={handleError}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      {...imageProps}
      {...props}
    />
  );
}
