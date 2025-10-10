
import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, ArrowLeft, Share2, Eye, Play } from "lucide-react";
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
      // Fallback: copy to clipboard
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="text-center py-12">
            <CardContent>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link href="/blog">
                <Button>
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/blog">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
          
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Badge variant="outline">{post.category}</Badge>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
            {post.featured && (
              <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                Featured
              </Badge>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="font-medium text-gray-900">{post.author}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleShare} className="text-gray-500">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Image/Video */}
        <div className="relative mb-8 rounded-xl overflow-hidden shadow-lg" style={{ height: '500px' }}>
          {post.videoUrl ? (
            <video 
              className="w-full h-full"
              controls
              preload="metadata"
              poster={post.imageUrl}
            >
              <source src={post.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full"
            />
          )}
        </div>

        {/* Article Content */}
        <Card className="mb-8">
          <CardContent className="p-8">
            {/* Excerpt */}
            <div className="text-lg text-gray-600 mb-6 font-medium leading-relaxed border-l-4 border-pink-500 pl-6 bg-pink-50 py-4 rounded-r-lg">
              {post.excerpt}
            </div>
            
            <Separator className="my-8" />
            
            {/* Main Content */}
            <div className="prose prose-lg max-w-none">
              <div 
                className="text-gray-800 leading-relaxed space-y-6"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {post.content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-base leading-7">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
            
            <Separator className="my-8" />
            
            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-sm font-medium text-gray-700 mr-2">Tags:</span>
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Article Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
              
              <div className="text-sm text-gray-500">
                Last updated: {new Date(post.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        

        {/* Author Info */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">About {post.author}</h3>
                <p className="text-gray-600">
                  Beauty expert and content creator passionate about helping others discover their perfect look.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Blog */}
        <div className="text-center">
          <Link href="/blog">
            <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Explore More Articles
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
