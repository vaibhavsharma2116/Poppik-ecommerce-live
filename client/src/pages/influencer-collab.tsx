import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Gift, TrendingUp, Users, Sparkles, Award, Target, Star, Zap, Heart, Globe, CheckCircle2, Play, Clock, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { ArrowRight } from "lucide-react";
import INFLUENCER_Image from "@/assets/INFLUENCER BANNER-02.jpg";
import INFLUENCER_Image1 from "@/assets/INFLUENCER BANNER-03.jpg";

function VideosList() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clickPrefix, setClickPrefix] = useState('/api/media');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVideo, setModalVideo] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchMedia = async () => {
      setLoading(true);
      try {
        // Add timestamp to prevent caching
        const timestamp = Date.now();
        let res = await fetch(`/api/influencer-videos?isActive=true&category=influencer&t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        let source = 'influencer';
        if (!res.ok) {
          // fallback
          res = await fetch(`/api/media?isActive=true&t=${timestamp}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          source = 'media';
        }
        if (!res.ok) {
          setVideos([]);
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        // normalize items and parse metadata if needed
        const all = (data || []).filter((m: any) => (m.type === 'video' || m.videoUrl));
        const vids = all.map((m: any) => {
          let metadata = m.metadata || {};
          if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
          }
          return { ...m, metadata, __source: source };
        });
        setVideos(vids);
        setClickPrefix(source === 'influencer' ? '/api/influencer-videos' : '/api/media');
      } catch (err) {
        console.error('Failed to fetch media:', err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
    
    // Refresh every 5 seconds for fresh data
    const interval = setInterval(fetchMedia, 5000);
    
    return () => { 
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleClick = async (media: any) => {
    try {
      // Track click and get redirect URL
      const res = await fetch(`${clickPrefix}/${media.id}/click`, { method: 'POST' });
      if (res.ok) {
        const j = await res.json();
        const url = j.redirectUrl || media.videoUrl || media.redirectUrl;
        if (url) {
          // open inside modal instead of redirect
          const isIframe = isEmbeddable(url);
          const duration = media.metadata?.duration || media.duration || null;
          setModalVideo({ url, title: media.title, isIframe, duration });
          setModalOpen(true);
        }
      } else {
        // Fallback: open videoUrl or redirectUrl
        const url = media.videoUrl || media.redirectUrl;
        if (url) {
          const isIframe = isEmbeddable(url);
          const duration = media.metadata?.duration || media.duration || null;
          setModalVideo({ url, title: media.title, isIframe, duration });
          setModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error on media click:', err);
      const url = media.videoUrl || media.redirectUrl;
      if (url) {
        const isIframe = isEmbeddable(url);
        const duration = media.metadata?.duration || media.duration || null;
        setModalVideo({ url, title: media.title, isIframe, duration });
        setModalOpen(true);
      }
    }
  };

  const handleShare = async (e: React.MouseEvent, media: any) => {
    e.stopPropagation();
    try {
      // Prefer the server-side share page so social platforms pick up OG tags
      const shareUrl = `${window.location.origin}/share/influencer-videos/${media.id}`;
      const fallback = media.videoUrl || media.redirectUrl || shareUrl;
      if (navigator.share) {
        await navigator.share({ title: media.title || 'Video', text: media.description || '', url: shareUrl });
        toast({ title: 'Shared' });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied', description: 'Video link copied to clipboard' });
      } else {
        // last resort
        window.open(fallback, '_blank');
      }
    } catch (err) {
      console.error('Share failed', err);
      toast({ title: 'Error', description: 'Unable to share link', variant: 'destructive' });
    }
  };

  const isEmbeddable = (url: string) => {
    if (!url) return false;
    const u = url.toLowerCase();
    // common video hosts -> use iframe embed
    if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com')) return true;
    // otherwise, if it's a direct video file
    if (u.match(/\.(mp4|webm|ogg)(\?|$)/)) return false;
    // default to iframe for unknown external links
    return true;
  };

  if (loading) {
    return <div className="col-span-full text-center py-8">Loading videos...</div>;
  }

  if (!videos || videos.length === 0) {
    return <></>;
  }

  const isSingleVideo = videos.length === 1;

  return (
    <>
      <div className={isSingleVideo ? "col-span-full" : ""}>
        <div className={isSingleVideo ? "max-w-2xl mx-auto" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"}>
          {videos.slice(0, expanded ? 9 : 3).map((video, i) => (
            <div key={video.id || i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <div className="relative">
                <img src={video.imageUrl || video.thumb || '/uploads/placeholder.jpg'} alt={video.title} className={isSingleVideo ? "w-full h-96 object-cover" : "w-full h-64 md:h-72 object-cover"} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                {video.metadata?.badge && (
                  <span className="absolute left-4 top-4 bg-pink-600 text-white text-xs font-semibold px-3 py-1 rounded">{video.metadata.badge}</span>
                )}
                <button onClick={(e) => handleShare(e, video)} className="absolute right-4 top-4 bg-white bg-opacity-90 rounded-full p-2 shadow hover:bg-opacity-100 transition" title="Share" aria-label="Share video" onMouseDown={(e)=>e.stopPropagation()}>
                  <Share2 className="w-4 h-4 text-gray-700" />
                </button>
                <div className="absolute right-4 bottom-4 bg-black bg-opacity-80 text-white text-sm px-3 py-1 rounded">{video.metadata?.duration || video.duration || '-'}</div>
                <button onClick={() => handleClick(video)} className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform">
                  <div className="w-16 h-16 bg-white bg-opacity-95 rounded-full flex items-center justify-center shadow-xl">
                    <Play className="w-7 h-7 text-pink-600" />
                  </div>
                </button>
              </div>
              <div className={isSingleVideo ? "p-10" : "p-8"}>
                {video.influencerName ? (
                  <div className="text-sm text-pink-600 font-medium mb-2">{video.influencerName}</div>
                ) : null}
                <h3 className={isSingleVideo ? "text-2xl md:text-3xl font-bold text-gray-900 mb-3" : "text-lg md:text-xl font-semibold text-gray-900 mb-2 line-clamp-2"}>{video.title}</h3>
                {video.description ? (
                  <p className={isSingleVideo ? "text-base text-gray-600 mb-4 leading-relaxed" : "text-sm text-gray-600 mb-3 line-clamp-3"}>{video.description}</p>
                ) : null}
                <div className={isSingleVideo ? "text-base text-gray-500 font-medium" : "text-sm md:text-base text-gray-500"}>{video.metadata?.author || video.author || video.displayName || ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isSingleVideo && (
        <div className="col-span-full flex justify-center mt-8">
          <button onClick={() => setExpanded(prev => !prev)} className="bg-white border border-pink-100 rounded-full px-8 py-3 shadow-md flex items-center gap-3 text-sm md:text-base font-medium text-pink-600 hover:shadow-lg hover:border-pink-300 transition">
            <span>{expanded ? 'Show less' : 'Show more'}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setModalVideo(null); }}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-3">
                <span>{modalVideo?.title || 'Video'}</span>
                {modalVideo?.duration ? (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{modalVideo.duration}</span>
                ) : null}
              </DialogTitle>
            </div>
            <DialogClose />
          </DialogHeader>
          <div className="mt-4">
            {modalVideo ? (
              modalVideo.isIframe ? (
                <div className="aspect-video">
                  <iframe src={modalVideo.url} title={modalVideo.title} className="w-full h-full" frameBorder="0" allowFullScreen />
                </div>
                ) : (
                <video
                  src={modalVideo.url}
                  controls
                  autoPlay
                  className="w-full max-h-[70vh] bg-black"
                  // Hide native download option in supporting browsers
                  controlsList="nodownload"
                  // Prevent right-click context menu to avoid direct save options
                  onContextMenu={(e) => { e.preventDefault(); }}
                />
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function InfluencerCollabPage() {
  const { toast } = useToast();

  const handleApplyClick = () => {
    window.open('https://forms.gle/yLGN34wRPc8hKsd29', '_blank');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative w-full cursor-pointer" onClick={() => window.open('https://forms.gle/yLGN34wRPc8hKsd29', '_blank')}>
          <img
            src={INFLUENCER_Image}
            alt="Become a Poppik Influencer"
            className="w-full h-auto object-contain"
            style={{ maxHeight: 'none' }}
          />
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Partner With Us?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get access to exclusive benefits and grow your influence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Gift,
                title: "Free PR Packages",
                description: "Receive our latest products to review and share with your followers"
              },
              {
                icon: TrendingUp,
                title: "Earn Commission",
                description: "Get attractive commissions on every sale through your unique code"
              },
              {
                icon: Users,
                title: "Brand Features",
                description: "Get featured on our official social media channels"
              },
              {
                icon: Sparkles,
                title: "Creative Freedom",
                description: "Create content in your own style and voice"
              },
              {
                icon: Award,
                title: "Early Access",
                description: "Be the first to try new product launches"
              },
              {
                icon: Target,
                title: "Dedicated Support",
                description: "Get personal support from our team"
              }
            ].map((benefit, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get started in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Submit Application",
                description: "Fill out the form with your details and social media handles"
              },
              {
                step: "2",
                title: "Get Approved",
                description: "Our team reviews applications within 5-7 business days"
              },
              {
                step: "3",
                title: "Start Earning",
                description: "Receive products and start creating content"
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-600 text-white text-2xl font-bold rounded-full mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply Button Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Join Us?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Click below to fill out our application form
          </p>
          <Button
            onClick={handleApplyClick}
            size="lg"
            className="bg-pink-600 hover:bg-pink-700 text-white px-12 py-6 text-lg font-semibold"
          >
            Apply for Collaboration
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Get answers to common questions
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              {
                question: "Who can apply?",
                answer: "Anyone with an active social media presence and engaged followers can apply. We welcome creators from Instagram, YouTube, TikTok, and other platforms."
              },
              {
                question: "What's the minimum follower requirement?",
                answer: "We typically look for creators with at least 2,000 followers, but we value engagement quality over follower count."
              },
              {
                question: "Is there any joining fee?",
                answer: "No! Our influencer program is completely free. We never charge creators to join our program."
              },
              {
                question: "What type of content is expected?",
                answer: "We encourage authentic content like product reviews, tutorials, unboxing videos, reels, and stories in your unique style."
              },
              {
                question: "How do I get paid?",
                answer: "Influencers earn through commission on sales using their unique discount code, plus opportunities for paid collaborations."
              },
              {
                question: "How long is the review process?",
                answer: "We review all applications within 5-7 business days and reach out via email."
              },
              {
                question: "Can I reapply if rejected?",
                answer: "Yes, you can reapply after 3 months. We encourage growing your content quality and engagement in the meantime."
              },
              {
                question: "Will I receive free products?",
                answer: "Yes! Approved influencers receive PR packages with our latest products and early access to new launches."
              }
            ].map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white border border-gray-200 rounded-lg px-6"
              >
                <AccordionTrigger className="text-left font-medium text-gray-900 hover:text-pink-600">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>


      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Featured Videos
              </h2>
              <p className="text-base text-gray-600 mt-2">Curated picks for partners</p>
            </div>
          </div>

          <div className="flex justify-center">
            <VideosList />
          </div>
        </div>
      </section>

      {/* CTA Section - Removed as it's redundant with the new Apply Button Section */}
      <section className=" bg-white">
        <div className="max-w-12xl ">
          <div className="relative overflow-hidden rounded-lg sm:rounded-xl cursor-pointer" onClick={() => window.open('https://forms.gle/yLGN34wRPc8hKsd29', '_blank')}>
            <img
              src={INFLUENCER_Image1}
              alt="Poppik makeup products showcase"
              className="w-full h-auto object-contain bg-gray-50"
            />
          </div>
        </div>
      </section>
    </div>
  );
}