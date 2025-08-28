
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'crop' | 'contain' | 'cover';
}

export function optimizeImageUrl(
  originalUrl: string, 
  options: ImageOptimizationOptions = {}
): string {
  const {
    width = 400,
    height = 400,
    quality = 80,
    format = 'webp',
    fit = 'contain'
  } = options;

  // Handle Unsplash URLs
  if (originalUrl.includes('unsplash.com')) {
    const baseUrl = originalUrl.split('?')[0];
    return `${baseUrl}?w=${width}&h=${height}&q=${quality}&fit=${fit}&fm=${format}&auto=format`;
  }

  // Handle local images through our API
  if (originalUrl.startsWith('/api/images/')) {
    return `${originalUrl}?w=${width}&h=${height}&q=${quality}&format=${format}`;
  }

  // Return original URL for other sources
  return originalUrl;
}

export function getResponsiveImageSizes(baseWidth: number = 400) {
  return {
    small: baseWidth / 2,
    medium: baseWidth,
    large: baseWidth * 1.5,
    xlarge: baseWidth * 2
  };
}

export function createResponsiveImageSet(
  originalUrl: string,
  baseWidth: number = 400
) {
  const sizes = getResponsiveImageSizes(baseWidth);
  
  return {
    src: optimizeImageUrl(originalUrl, { width: sizes.medium, quality: 80 }),
    srcSet: [
      `${optimizeImageUrl(originalUrl, { width: sizes.small, quality: 75 })} ${sizes.small}w`,
      `${optimizeImageUrl(originalUrl, { width: sizes.medium, quality: 80 })} ${sizes.medium}w`,
      `${optimizeImageUrl(originalUrl, { width: sizes.large, quality: 85 })} ${sizes.large}w`,
      `${optimizeImageUrl(originalUrl, { width: sizes.xlarge, quality: 90 })} ${sizes.xlarge}w`
    ].join(', '),
    sizes: '(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw'
  };
}

// Lazy loading intersection observer
export function createImageObserver(callback: IntersectionObserverCallback) {
  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  });
}

// Image preloader for critical images
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// WebP support detection
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}
