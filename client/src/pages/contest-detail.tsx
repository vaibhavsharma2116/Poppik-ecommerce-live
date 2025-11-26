import React, { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Contest {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  imageUrl: string;
  bannerImageUrl?: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ContestDetail() {
  const { slug } = useParams();
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      fetchContest(slug);
    }
  }, [slug]);

  const fetchContest = async (contestSlug: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contests/${contestSlug}`);

      if (response.ok) {
        const data = await response.json();
        setContest(data);
      } else {
        setError("Contest not found");
      }
    } catch (error) {
      console.error("Error fetching contest:", error);
      setError("Failed to load contest");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to copy link', variant: 'destructive' });
    }
  };

  const shareOnSocial = (platform: string) => {
    const url = window.location.href;
    const title = contest?.title || 'Check out this contest';
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contest...</p>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Contest not found'}</p>
          <Link href="/contest">
            <Button className="bg-purple-600 hover:bg-purple-700">Back to Contests</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(contest.validUntil) < new Date();
  const displayDate = new Date(contest.validFrom).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Back Button */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <Link href="/contest">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              Back to Contests
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[450px] overflow-hidden bg-gray-100">
        <img
          src={contest.bannerImageUrl || contest.imageUrl}
          alt={contest.title}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay with Status */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent flex items-end">
          <div className="w-full p-4 sm:p-6 md:p-8">
            <div className="flex gap-2 mb-4">
              {isExpired ? (
                <Badge className="bg-gray-600 text-white">ENDED</Badge>
              ) : (
                <Badge className="bg-yellow-600 text-white">ACTIVE</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {contest.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 sm:gap-6 items-center text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span>{displayDate}</span>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-600">Share:</span>
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={() => shareOnSocial('twitter')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1DA1F2] hover:bg-[#1a91da] text-white transition-colors text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              Twitter
            </button>
            <button
              onClick={() => shareOnSocial('facebook')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] text-white transition-colors text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              Facebook
            </button>
            <button
              onClick={() => shareOnSocial('whatsapp')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white transition-colors text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-8 sm:my-12" />

        {/* Content */}
        <div className="prose prose-sm sm:prose md:prose-lg max-w-none">
          <div 
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: contest.content }}
          />
        </div>
      </div>
    </div>
  );
}

