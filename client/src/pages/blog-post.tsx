import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Clock, User, ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  thumbnailUrl?: string;
  heroImageUrl?: string;
  videoUrl?: string;
  featured: boolean;
  published: boolean;
  likes: number;
  comments: number;
  readTime: string;
  createdAt: string;
  updatedAt: string;
}

export default function BlogPostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      fetchBlogPost(slug);
    }
  }, [slug]);

  const fetchBlogPost = async (postSlug: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blog/posts/${postSlug}`);

      if (response.ok) {
        const data = await response.json();
        setPost(data);

        // Fetch related posts
        fetchRelatedPosts(data.category, data.id);
      } else {
        setError("Blog post not found");
      }
    } catch (error) {
      console.error("Error fetching blog post:", error);
      setError("Failed to load blog post");
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedPosts = async (category: string, currentPostId: number) => {
    try {
      const response = await fetch(`/api/blog/posts?category=${category}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current post and limit to 3
        const filtered = data
          .filter((p: BlogPost) => p.id !== currentPostId)
          .slice(0, 3);
        setRelatedPosts(filtered);
      }
    } catch (error) {
      console.error("Error fetching related posts:", error);
    }
  };

  const resolveImage = (url?: string | null) => {
    if (!url) return '/placeholder.png';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return `${window.location.origin}/api/images/${url}`;
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Blog post link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive"
      });
    }
  };

  const shareToWhatsApp = () => {
    const url = window.location.href;
    const text = encodeURIComponent(post?.title || "Check out this blog post");
    window.open(`https://wa.me/?text=${text}%20${encodeURIComponent(url)}`, '_blank');
  };

  const shareToFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToTwitter = () => {
    const url = window.location.href;
    const text = encodeURIComponent(post?.title || "Check out this blog post");
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="text-center py-12">
            <CardContent>
              <h1 className="text-2xl font-medium text-gray-900 mb-4">Post Not Found</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link href="/blog">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Blog
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Featured Image - Mobile Responsive */}
      <div className="w-full bg-gray-100">
        {post.videoUrl ? (
          <video
            className="w-full h-[200px] sm:h-[300px] md:h-[400px] lg:h-[500px] object-cover"
            controls
            preload="metadata"
            poster={post.imageUrl}
            playsInline
          >
            <source src={post.videoUrl} type="video/mp4" />
            <source src={post.videoUrl} type="video/webm" />
            <p className="text-center p-8">
              Your browser does not support the video tag. Please{" "}
              <a href={post.videoUrl} className="text-blue-600 underline" download>
                download the video
              </a>{" "}
              to view it.
            </p>
          </video>
        ) : (
          <img
            src={resolveImage(post.heroImageUrl || post.thumbnailUrl || post.imageUrl)}
            alt={post.title}
            className="w-full h-[160px] sm:h-[280px] md:h-[380px] lg:h-[400px] "
          />
        )}
      </div>

      {/* Title and Metadata Section - Mobile Responsive */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 lg:px-12 py-4 sm:py-6 md:py-8">
          <div className="mb-3 sm:mb-4 flex items-center flex-wrap gap-1">
            <Link href="/blog">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 px-2 sm:px-4 text-xs sm:text-sm">
                Home
              </Button>
            </Link>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-gray-600 text-xs sm:text-sm">The World of Beauty,Lifestyle and wellness</span>
          </div>

          <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">
            {new Date(post.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric'
            })}
          </p>

          <h6 className="text-2sm lg:text-5xl xl:text-3xl  text-gray-900 mb-4 sm:mb-6 leading-tight">
            {post.title}
          </h6>
        </div>
      </div>

      {/* Main Content */}
      <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Author & Meta Info - Mobile Responsive */}
        <div className="py-4 sm:py-6 md:py-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-sm sm:text-base text-gray-900">{post.author}</p>
              <p className="text-xs sm:text-sm text-gray-500">Beauty Expert</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Share
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-2">
                  <p className="text-sm font-medium mb-3">Share this article</p>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={shareToWhatsApp}
                  >
                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={shareToFacebook}
                  >
                    <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={shareToTwitter}
                  >
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Twitter
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => {
                      const url = window.location.href;
                      window.open(`https://www.instagram.com/`, '_blank');
                      toast({
                        title: "Instagram",
                        description: "Instagram doesn't support direct link sharing. Please copy the link and share manually.",
                      });
                    }}
                  >
                    <svg className="h-5 w-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => {
                      const url = window.location.href;
                      const text = encodeURIComponent(post?.title || "Check out this blog post");
                      window.open(`https://www.threads.net/intent/post?text=${text}%20${encodeURIComponent(url)}`, '_blank');
                    }}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
                      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z"/>
                    </svg>
                    Threads
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant={copied ? "default" : "ghost"}
              size="sm"
              onClick={handleCopyLink}
              className="text-xs sm:text-sm"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Excerpt - Mobile Responsive */}
        <div className="py-4 sm:py-6 md:py-8 border-l-4 border-gray-900 pl-4 sm:pl-6 bg-gray-50">
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-900 leading-relaxed font-medium italic">
            {post.excerpt}
          </p>
        </div>

        {/* Content Sections - Mobile Responsive */}
        <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none mb-8 sm:mb-10 md:mb-12 blog-content">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />

          {/* Render video if videoUrl exists and not already in content */}
          {post.videoUrl && !post.content.includes('video') && (
            <div className="video-container my-8">
              <video 
                controls 
                preload="metadata"
                className="w-full max-w-3xl mx-auto rounded-lg shadow-lg"
                style={{ maxWidth: '800px' }}
              >
                <source src={post.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </div>

        {/* Tags - Mobile Responsive */}

      </article>

      {/* Related Posts Section - Mobile Responsive */}
      {relatedPosts.length > 0 && (
        <section className="py-8 sm:py-12 md:py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 md:mb-8">You may also like</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {relatedPosts.map((relatedPost) => (
                <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                  <div className="group cursor-pointer">
                    <div className="relative overflow-hidden bg-gray-100 mb-3 sm:mb-4 rounded-lg sm:rounded-none" style={{ paddingBottom: '66.67%' }}>
                      <img
                        src={relatedPost.imageUrl}
                        alt={relatedPost.title}
                        className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <p className="text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2">
                      {new Date(relatedPost.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric'
                      })}
                    </p>

                    <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2 leading-tight">
                      {relatedPost.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8 sm:mt-10 md:mt-12">
              <Link href="/blog">
                {/* <Button
                  variant="default"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base"
                >
                  VIEW ALL
                </Button> */}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Back to Blog CTA - Mobile Responsive */}
      <div className="py-6 sm:py-8 md:py-12 text-center bg-white">
        <Link href="/blog">
          <Button variant="outline" size="lg" className="text-xs sm:text-sm md:text-base px-4 sm:px-6 py-2 sm:py-3">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Explore More Articles
          </Button>
        </Link>
      </div>
    </div>
  );
}