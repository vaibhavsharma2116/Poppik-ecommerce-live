
import { useState, useEffect, useRef } from "react";
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
import { 
  Handshake, 
  TrendingUp, 
  Award, 
  Sparkles, 
  Target, 
  Users, 
  BadgeCheck,
  Store,
  DollarSign,
  Globe,
  Rocket,
  Shield
} from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

function ChannelPartnerVideos() {
 const { data: items = [], isLoading, refetch: refetchList } = useQuery<MediaItem[]>({
    queryKey: ['/api/admin/channel-partner-videos'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');
      const res = await fetch(`/api/admin/channel-partner-videos?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch channel partner videos');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: true
  });

  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showMore, setShowMore] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (selectedVideo && videoRef.current) {
      try {
        videoRef.current.play().catch(() => {});
      } catch (e) {}
    }
  }, [selectedVideo]);

  const handlePlay = async (media: any) => {
    setSelectedVideo(media);
    try {
      await fetch(`/api/channel-partner-videos/${media.id}/click`, { method: 'POST' });
    } catch (e) {}
  };

  const handleShare = (media: any) => {
    const shareUrl = `${window.location.origin}/share/channel-partner-videos/${media.id}`;
    if ((navigator as any).share) {
      (navigator as any).share({ title: media.title || 'Channel Partner Video', url: shareUrl }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => alert('Link copied to clipboard'));
    } else {
      prompt('Copy this link', shareUrl);
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading videos…</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 gap-6">
        {(items || []).length ? ((items.slice(0, showMore ? 9 : 6)).map((v: any) => (
          <div key={v.id} className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="relative rounded-t-2xl overflow-hidden">
              <img src={v.imageUrl} alt={v.title} className="w-full h-72 md:h-80 object-cover" />
              <button onClick={() => handlePlay(v)} aria-label="Play video" className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white p-5 rounded-full shadow-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-6.518-3.76A1 1 0 007 8.28v7.44a1 1 0 001.234.97l6.518-1.54A1 1 0 0016 14.84V9.16a1 1 0 00-1.248-.992z" />
                  </svg>
                </div>
              </button>
              <button onClick={() => handleShare(v)} aria-label="Share" className="absolute right-4 top-4 bg-white p-3 rounded-full shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v.01M12 12v.01M20 12v.01M4 12a8 8 0 0116 0M4 12a8 8 0 0116 0" />
                </svg>
              </button>
              {v.metadata && typeof v.metadata === 'object' && v.metadata.duration && (
                <div className="absolute left-4 bottom-4 bg-black bg-opacity-70 text-white text-xs px-3 py-1 rounded">{v.metadata.duration}</div>
              )}
            </div>
            <div className="p-6">
              <p className="text-pink-600 text-sm font-medium uppercase mb-1">{v.partnerName || v.affiliateName || v.partner || ''}</p>
              <h3 className="font-extrabold text-2xl leading-tight">{v.title}</h3>
              {v.description && <p className="text-gray-500 mt-3">{v.description}</p>}
            </div>
          </div>
        ))) : (
          <p className="text-center text-gray-500">No channel partner videos available yet.</p>
        )}
      </div>

      {(items || []).length > 6 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowMore(!showMore)}
            aria-expanded={showMore}
            className="bg-white border border-pink-100 rounded-full px-8 py-3 shadow-lg text-pink-600 inline-flex items-center gap-3 hover:shadow-2xl transition-shadow"
          >
            <span className="font-medium">{showMore ? 'Show less' : 'Show more'}</span>
            <span className={`flex items-center justify-center bg-white rounded-full p-1 shadow-sm transition-transform ${showMore ? 'rotate-180' : ''}`}>
              <ChevronDown className="h-4 w-4 text-pink-600" />
            </span>
          </button>
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <div>
                <h4 className="font-semibold">{selectedVideo.title}</h4>
                <p className="text-sm text-gray-600">{selectedVideo.partnerName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setSelectedVideo(null)}>Close</Button>
              </div>
            </div>
            <div className="p-2">
              {selectedVideo.videoUrl && selectedVideo.videoUrl.includes('youtube') ? (
                <iframe title={selectedVideo.title} src={selectedVideo.videoUrl} className="w-full h-[60vh]" />
              ) : (
                <video ref={videoRef} src={selectedVideo.videoUrl} controls controlsList="nodownload" autoPlay className="w-full max-h-[70vh]" onContextMenu={(e) => e.preventDefault()} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ChannelPartnerPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    city: "",
    experience: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and contact you soon.",
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        businessName: "",
        city: "",
        experience: "",
        message: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
    
        <div className="mb-4 xs:mb-5 sm:mb-6 md:mb-8">
          <a href="https://docs.google.com/forms/d/e/1FAIpQLScXcgR5MUHnlCHsV56rTrLwxvRDYv4bjU96tgxyu5qg-On2bw/viewform?usp=send_form" target="_blank" rel="noopener noreferrer" className="relative w-full overflow-hidden  block">
            <img 
              src="/CHANNELPART.jpg"
              alt="Join Our Team at Poppik" 
              className="w-full h-auto "
              style={{ maxHeight: '500px' }}
            />
            
          </a>
        </div>

      {/* Stats Section */}
      {/* <section className="py-12 bg-gray-50 border-y">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "200+", label: "Active Partners" },
              { number: "₹2Cr+", label: "Partner Revenue" },
              { number: "50+", label: "Cities Covered" },
              { number: "98%", label: "Partner Satisfaction" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">{stat.number}</div>
                <div className="text-sm md:text-base text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Benefits Section */}
      <section id="benefits" className="py-16 md:py-20 bg-white">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Partnership Benefits
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Grow your business with exclusive perks and support
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: DollarSign,
                title: "High Profit Margins",
                description: "Earn attractive margins on every product sold through your channel"
              },
              {
                icon: Store,
                title: "Exclusive Territory Rights",
                description: "Get exclusive rights to distribute in your designated area"
              },
              {
                icon: Rocket,
                title: "Marketing Support",
                description: "Complete marketing materials and promotional support from Poppik"
              },
              {
                icon: BadgeCheck,
                title: "Authorized Dealer Status",
                description: "Become an authorized Poppik dealer with official certification"
              },
              {
                icon: Target,
                title: "Sales Training",
                description: "Comprehensive training programs for you and your team"
              },
              {
                icon: Shield,
                title: "Business Protection",
                description: "Protected territory with no competing partners in your area"
              }
            ].map((benefit, index) => (
              <div 
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all hover:border-purple-200"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-purple-600" />
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

      {/* Featured Channel Partner Videos */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-8">Channel Partner Videos</h2>

          {/* Fetch channel partner videos */}
          <ChannelPartnerVideos />
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Partner With Poppik?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: TrendingUp,
                title: "Growing Brand",
                description: "Join India's fastest-growing beauty brand with proven market demand"
              },
              {
                icon: Award,
                title: "Quality Products",
                description: "Premium quality products that customers love and trust"
              },
              {
                icon: Users,
                title: "Strong Support System",
                description: "Dedicated partner success team to help you grow"
              },
              {
                icon: Globe,
                title: "Pan-India Presence",
                description: "Be part of a brand with nationwide recognition"
              }
            ].map((item, index) => (
              <div key={index} className="flex gap-4 bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Partnership Requirements
            </h2>
            <p className="text-lg text-gray-600">
              Simple eligibility criteria to get started
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
            <div className="space-y-4">
              {[
                "Business registration or GST certificate",
                "Minimum investment capacity of ₹2-5 lakhs",
                "Storage facility or retail space",
                "Passion for beauty and cosmetics industry",
                "Strong local network and market knowledge",
                "Commitment to brand values and quality"
              ].map((requirement, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                      <BadgeCheck className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-gray-700">{requirement}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      {/* <section id="partner-form" className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Apply for Partnership
            </h2>
            <p className="text-lg text-gray-600">
              Fill in your details and we'll get back to you within 48 hours
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <Input
                    required
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    required
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <Input
                    required
                    placeholder="Your business name"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <Input
                    required
                    placeholder="Your city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Experience (years)
                  </label>
                  <Input
                    placeholder="e.g., 5"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why do you want to become our partner?
                </label>
                <Textarea
                  placeholder="Tell us about your business plans and vision..."
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <Button 
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                size="lg"
              >
                Submit Partnership Application
              </Button>
            </form>
          </div>
        </div>
      </section> */}

      {/* FAQ Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            {[
              {
                question: "What is the investment required?",
                answer: "The initial investment ranges from ₹2-5 lakhs depending on the territory and business model you choose. This includes inventory, marketing materials, and setup costs."
              },
              {
                question: "What are the profit margins?",
                answer: "Our channel partners enjoy attractive margins ranging from upto 70% depending on product categories and order volumes."
              },
              {
                question: "Do I need a physical store?",
                answer: "While having a retail space is beneficial, it's not mandatory. You can start with a warehouse or storage facility and focus on B2B distribution."
              },
              {
                question: "What kind of support will I receive?",
                answer: "You'll receive comprehensive support including marketing materials, sales training, product demos, and a dedicated partner success manager."
              },
              {
                question: "Is there any exclusivity in territory?",
                answer: "Yes, we provide exclusive territory rights to our partners to ensure no internal competition in your designated area."
              },
              {
                question: "How long is the partnership agreement?",
                answer: "Our standard partnership agreement is for 3 years with renewal options based on performance."
              },
              {
                question: "What is the application review process?",
                answer: "We review applications within 48 hours and conduct a preliminary discussion. Selected candidates then go through a detailed onboarding process."
              },
              {
                question: "Can I sell other brands alongside Poppik?",
                answer: "Yes, you can sell complementary beauty products, but we require that Poppik remains a primary focus of your business."
              }
            ].map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`} 
                className="bg-gray-50 border border-gray-200 rounded-lg px-6"
              >
                <AccordionTrigger className="text-left font-medium text-gray-900 hover:text-purple-600">
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

      {/* CTA Section */}
      <section className="py-0">
        <a
          href="https://forms.gle/FBpJH1oZ1aKaNGhE6"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
        >
          <img
            src="/CHANNELPARTNER.jpg"
            alt="Become a Channel Partner"
            className="block w-full h-auto object-cover"
          />
        </a>
      </section>
    </div>
  );
}
