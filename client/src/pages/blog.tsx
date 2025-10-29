import { useState, useEffect, startTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User, Search, Tag, ArrowRight, Share2, Play } from "lucide-react";
import { Link } from "wouter";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  imageUrl: string;
  videoUrl?: string;
  featured: boolean;
  published: boolean;
  likes: number;
  comments: number;
  readTime: string;
  createdAt: string;
  updatedAt: string;
}

interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // Fetch blog posts
  useEffect(() => {
    fetchBlogPosts();
  }, [selectedCategory, searchQuery]);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchBlogPosts = async () => {
    try {
      startTransition(() => {
        setLoading(true);
      });

      const params = new URLSearchParams();

      if (selectedCategory && selectedCategory !== "All") {
        params.append("category", selectedCategory);
      }

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const response = await fetch(`/api/blog/posts?${params}`);
      if (response.ok) {
        const data = await response.json();
        startTransition(() => {
          setBlogPosts(data);
          setLoading(false);
        });
      } else {
        throw new Error("Failed to fetch blog posts");
      }
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      startTransition(() => {
        setError("Failed to load blog posts");
        setLoading(false);
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/blog/categories");
      if (response.ok) {
        const data = await response.json();
        startTransition(() => {
          setCategories(data.filter(cat => cat.isActive));
        });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
     
    }
  };

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPosts = blogPosts.filter(post => post.featured);

  const allCategories = ["All", ...categories.map(cat => cat.name)];

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header - Mobile Responsive */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-light text-gray-900 mb-3 sm:mb-4 leading-tight">
              Explore the World of Beauty, Lifestyle & Wellness
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-4 sm:mb-6 md:mb-8 px-2">
              Unveil expert insights and timeless secrets in beauty, lifestyle, and wellness
            </p>
            <div className="relative max-w-md mx-auto px-2 sm:px-0">
              <Search className="absolute left-5 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  startTransition(() => {
                    setSearchQuery(value);
                  });
                }}
                className="pl-10 sm:pl-12 py-4 sm:py-5 md:py-6 text-sm sm:text-base border-gray-300 rounded-lg sm:rounded-none focus:ring-1 focus:ring-gray-400 w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filter - Mobile Responsive Horizontal Tabs */}
        <div className="mb-6 sm:mb-8 md:mb-12 border-b overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 sm:gap-6 md:gap-8 min-w-max px-2 sm:px-0">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  startTransition(() => {
                    setSelectedCategory(category);
                  });
                }}
                className={`pb-3 sm:pb-4 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "text-gray-900 border-b-2 border-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchBlogPosts} variant="outline" className="rounded-none">
              Try Again
            </Button>
          </div>
        )}

        {/* Blog Posts Grid */}
        {!loading && (
          <section>
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery
                    ? `No articles match "${searchQuery}". Try different keywords.`
                    : "No articles available in this category yet."
                  }
                </p>
                {searchQuery && (
                  <Button
                    onClick={() => {
                      startTransition(() => {
                        setSearchQuery("");
                      });
                    }}
                    variant="outline"
                    className="rounded-none"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-2 sm:px-0">
                {filteredPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <div className="group cursor-pointer">
                      {/* Image - Mobile Optimized */}
                      <div className="relative overflow-hidden bg-gray-100 mb-3 sm:mb-4 rounded-lg sm:rounded-none" style={{ paddingBottom: '66.67%' }}>
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                        {post.videoUrl && (
                          <div className="absolute inset-0">
                            <video
                              className="w-full h-full"
                              controls
                              preload="metadata"
                              poster={post.imageUrl}
                            >
                              <source src={post.videoUrl} type="video/mp4" />
                            </video>
                          </div>
                        )}
                      </div>

                      {/* Content - Mobile Responsive */}
                      <div className="space-y-2 sm:space-y-3 px-1 sm:px-0">
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-wrap">
                          <Badge variant="outline" className="rounded-full sm:rounded-none border-gray-300 text-gray-600 text-xs px-2 py-0.5">
                            {post.category}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="hidden sm:inline">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="sm:hidden">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg md:text-xl font-medium text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 leading-tight">
                          {post.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                          {post.excerpt}
                        </p>

                        <div className="flex items-center justify-between pt-1 sm:pt-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[100px] sm:max-w-none">{post.author}</span>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">{post.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}