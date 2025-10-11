import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, ArrowLeft, Share2 } from "lucide-react";
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

export default function BlogPostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handleShare = async () => {
    const url = window.location.href;
    const title = post?.title || "Check out this blog post";

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
        toast({
          title: "Shared Successfully!",
          description: "Thank you for sharing this post.",
        });
      } catch (error) {
        console.log("Sharing canceled");
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link Copied!",
          description: "Blog post link has been copied to clipboard.",
        });
      } catch (error) {
        toast({
          title: "Share",
          description: "Please copy the URL manually to share this post.",
          variant: "destructive"
        });
      }
    }
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
      {/* Hero Section with Featured Image */}
      <div className="w-full bg-gray-100">
        {post.videoUrl ? (
          <video 
            className="w-full h-[500px] object-cover"
            controls
            preload="metadata"
            poster={post.imageUrl}
          >
            <source src={post.videoUrl} type="video/mp4" />
          </video>
        ) : (
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-[500px] object-cover"
          />
        )}
      </div>

      {/* Title and Metadata Section - Below Image */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-8 md:px-12 py-8">
          <div className="mb-4">
            <Link href="/blog">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Home
              </Button>
            </Link>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-gray-600">The World of Faces</span>
          </div>

          <p className="text-gray-500 text-sm mb-4">
            {new Date(post.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: '2-digit', 
              year: 'numeric' 
            })}
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            {post.title}
          </h1>

          {/* <div className="flex items-center gap-6 text-gray-600 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{post.readTime}</span>
            </div>
            <Badge variant="outline" className="border-gray-300">
              {post.category}
            </Badge>
          </div> */}
        </div>
      </div>

      {/* Main Content */}
      <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Author & Meta Info */}
        <div className="py-8 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{post.author}</p>
              <p className="text-sm text-gray-500">Beauty Expert</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Excerpt */}
        <div className="py-8">
          <p className="text-xl text-gray-700 leading-relaxed font-light">
            {post.excerpt}
          </p>
        </div>

        {/* Content Sections */}
        <div className="prose prose-lg max-w-none mb-12 blog-content">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="py-8 border-t border-b">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Related Posts Section */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">You may also like</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                  <div className="group cursor-pointer">
                    <div className="relative overflow-hidden bg-gray-100 mb-4" style={{ paddingBottom: '66.67%' }}>
                      <img
                        src={relatedPost.imageUrl}
                        alt={relatedPost.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <p className="text-sm text-gray-500 mb-2">
                      {new Date(relatedPost.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: '2-digit', 
                        year: 'numeric' 
                      })}
                    </p>

                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/blog">
                {/* <Button 
                  variant="default" 
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-base"
                >
                  VIEW ALL
                </Button> */}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Back to Blog CTA */}
      <div className="py-12 text-center bg-white">
        <Link href="/blog">
          <Button variant="outline" size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Explore More Articles
          </Button>
        </Link>
      </div>
    </div>
  );
}