import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Default query function for tanstack query
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const res = await fetch(queryKey[0] as string, {
    credentials: "include",
    // Disable cache for fresh database reads
    cache: 'no-store',
  });
  await throwIfResNotOk(res);
  return await res.json();
};

/**
 * Optimized QueryClient for fast database loads
 * - Intelligent caching without page reload
 * - Different strategies for different data types
 * - No stale data shown without refetch
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      
      // Caching Strategy - balance fresh data with performance
      staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory cache
      
      // Smart refetch strategy - no unnecessary requests
      refetchOnWindowFocus: 'stale', // Only if data is stale
      refetchOnMount: 'stale', // Only if data is stale
      refetchOnReconnect: 'stale', // Only if data is stale
      refetchIntervalInBackground: false, // Don't drain resources
      
      // Retry on failure
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      
      // Show old data while refetching
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

/**
 * Query keys organized by entity for easy cache invalidation
 */
export const queryKeys = {
  // Products
  products: {
    all: ['products'] as const,
    list: () => [...queryKeys.products.all, 'list'] as const,
    featured: () => [...queryKeys.products.all, 'featured'] as const,
    bestseller: () => [...queryKeys.products.all, 'bestseller'] as const,
    newLaunch: () => [...queryKeys.products.all, 'newLaunch'] as const,
    byId: (id: number) => [...queryKeys.products.all, 'byId', id] as const,
    bySlug: (slug: string) => [...queryKeys.products.all, 'bySlug', slug] as const,
    byCategory: (category: string) => [...queryKeys.products.all, 'byCategory', category] as const,
    search: (query: string) => [...queryKeys.products.all, 'search', query] as const,
    images: (productId: number) => [...queryKeys.products.all, 'images', productId] as const,
    shades: (productId: number) => [...queryKeys.products.all, 'shades', productId] as const,
    reviews: (productId: number) => [...queryKeys.products.all, 'reviews', productId] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
    byId: (id: number) => [...queryKeys.categories.all, 'byId', id] as const,
    bySlug: (slug: string) => [...queryKeys.categories.all, 'bySlug', slug] as const,
  },

  // Subcategories
  subcategories: {
    all: ['subcategories'] as const,
    list: () => [...queryKeys.subcategories.all, 'list'] as const,
    byCategory: (categoryId: number) => [...queryKeys.subcategories.all, 'byCategory', categoryId] as const,
  },

  // Offers & Combos
  offers: {
    all: ['offers'] as const,
    list: () => [...queryKeys.offers.all, 'list'] as const,
    byId: (id: number) => [...queryKeys.offers.all, 'byId', id] as const,
    reviews: (offerId: number) => [...queryKeys.offers.all, 'reviews', offerId] as const,
  },

  combos: {
    all: ['combos'] as const,
    list: () => [...queryKeys.combos.all, 'list'] as const,
    byId: (id: number) => [...queryKeys.combos.all, 'byId', id] as const,
    reviews: (comboId: number) => [...queryKeys.combos.all, 'reviews', comboId] as const,
  },

  // Blog
  blog: {
    all: ['blog'] as const,
    posts: () => [...queryKeys.blog.all, 'posts'] as const,
    published: () => [...queryKeys.blog.all, 'published'] as const,
    featured: () => [...queryKeys.blog.all, 'featured'] as const,
    bySlug: (slug: string) => [...queryKeys.blog.all, 'bySlug', slug] as const,
    categories: () => [...queryKeys.blog.all, 'categories'] as const,
    search: (query: string) => [...queryKeys.blog.all, 'search', query] as const,
  },

  // Testimonials
  testimonials: {
    all: ['testimonials'] as const,
    list: () => [...queryKeys.testimonials.all, 'list'] as const,
    video: () => [...queryKeys.testimonials.all, 'video'] as const,
    videoActive: () => [...queryKeys.testimonials.all, 'videoActive'] as const,
  },

  // User
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    wallet: () => [...queryKeys.user.all, 'wallet'] as const,
  },

  // Contests & Admin
  contests: {
    all: ['contests'] as const,
    list: () => [...queryKeys.contests.all, 'list'] as const,
  },

  // Jobs
  jobs: {
    all: ['jobs'] as const,
    list: () => [...queryKeys.jobs.all, 'list'] as const,
    bySlug: (slug: string) => [...queryKeys.jobs.all, 'bySlug', slug] as const,
  },
};