
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'crop' | 'contain' | 'cover';
}

export function optimizeImageUrl(
  originalUrl?: string, 
  options: ImageOptimizationOptions = {}
): string {
  // Defensive: if no URL provided, return empty string
  if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.trim() === '') {
    return '';
  }

  // Remove any query parameters from the URL
  let urlWithoutParams = originalUrl.split('?')[0];

  // If it starts with /images/, convert to /api/images/
  if (urlWithoutParams.startsWith('/images/')) {
    return `/api/images/${urlWithoutParams.substring('/images/'.length)}`;
  }

  // If it already starts with /api/images/, keep it as is
  if (urlWithoutParams.startsWith('/api/images/')) {
    return urlWithoutParams;
  }

  // Return original URL for all other sources (no transformation)
  return urlWithoutParams;
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
  if (!originalUrl) {
    return { src: '', srcSet: '', sizes: '' };
  }
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
