import { ArrowLeft, MapPin, Briefcase, Clock, CheckCircle2, Calendar, Share2, Copy, Check } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function CareersDetail() {
  const [, params] = useRoute("/careers/:position");
  const positionSlug = params?.position || "";
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Helper function to parse field content (HTML or JSON)
  const parseFieldContent = (content: any): string | string[] => {
    if (!content) return [];
    
    // If it's already an array, return it
    if (Array.isArray(content)) {
      return content;
    }

    // If it's a string, try to parse it
    if (typeof content === 'string') {
      // Try JSON parse first
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        // Not JSON, treat as HTML
      }

      // If it contains HTML tags, return as HTML string
      if (content.includes('<') && content.includes('>')) {
        return content;
      }

      // Otherwise return as single string in array
      return [content];
    }

    return [];
  };

  // Fetch position data from API
  const { data: position, isLoading, error } = useQuery({
    queryKey: ['job-positions', positionSlug],
    queryFn: async () => {
      console.log(`🔍 Fetching position: ${positionSlug}`);
      const response = await fetch(`/api/job-positions/${positionSlug}`);
      if (!response.ok) {
        console.error('❌ Failed to fetch job position:', response.status);
        throw new Error('Failed to fetch job position');
      }
      
      const data = await response.json();
      console.log('📊 Position data received:', data);

      if (data) {
        const processedData = {
          ...data,
          responsibilities: parseFieldContent(data.responsibilities),
          requirements: parseFieldContent(data.requirements),
          skills: parseFieldContent(data.skills) as string[],
        };
        
        console.log('✅ Processed position data:', processedData);
        return processedData;
      }

      return data;
    },
    enabled: !!positionSlug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading position details...</p>
        </div>
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Position Not Found</h1>
          <Link href="/careers">
            <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white">
              Back to Careers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const shareToWhatsApp = () => {
    const url = window.location.href;
    const text = `🚀 *${position?.title}* at Poppik Lifestyle\n\n📍 ${position?.location}\n💼 ${position?.department}\n⏰ ${position?.type}\n\n${position?.description}\n\n✨ Apply now: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToTwitter = () => {
    const url = window.location.href;
    const text = `Check out this job opportunity: ${position?.title} at Poppik Lifestyle - ${position?.location}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const copyJobLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Job link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Legacy position data for reference - can be removed
  const positionsDataLegacy: Record<string, any> = {
    "beauty-consultant": {
      title: "Beauty Consultant",
      department: "Sales",
      location: "Mumbai, India",
      type: "Full-time",
      jobId: "279875",
      experienceLevel: "Entry-Level",
      workExperience: "2+ years",
      education: "Bachelor's Degree",
      description: "Help customers discover their perfect beauty products and provide expert advice on skincare and makeup.",
      aboutRole: "We are looking for a creative and detail-oriented Beauty Consultant to join our team. The ideal candidate should have a keen eye for storytelling, pacing, and aesthetics. You will work closely with the creative and marketing teams to produce engaging beauty content for social media, campaigns, product launches, and other brand communication needs.",
      responsibilities: [
        "Provide personalized beauty consultations to customers",
        "Demonstrate product features and benefits",
        "Maintain knowledge of current beauty trends and products",
        "Meet sales targets and KPIs",
        "Build lasting customer relationships"
      ],
      requirements: [
        "2+ years of experience in beauty retail or consulting",
        "Excellent communication and interpersonal skills",
        "Passion for beauty and skincare products",
        "Sales-oriented mindset",
        "Knowledge of makeup application techniques"
      ],
      qualifications: [
        "High school diploma or equivalent",
        "Beauty certification preferred",
        "Experience with POS systems"
      ],
      skills: ["Customer Service", "Product Knowledge", "Sales", "Communication", "Makeup Application"]
    },
    "digital-marketing-specialist": {
      title: "Digital Marketing Specialist",
      department: "Marketing",
      location: "Remote",
      type: "Full-time",
      jobId: "279876",
      experienceLevel: "Mid-Level",
      workExperience: "3+ years",
      education: "Bachelor's Degree in Marketing",
      description: "Drive our digital presence through innovative campaigns and social media strategies.",
      aboutRole: "We are seeking a talented Digital Marketing Specialist to elevate our brand's online presence. You will develop and execute comprehensive digital marketing strategies that engage our audience and drive business growth.",
      responsibilities: [
        "Develop and execute digital marketing campaigns",
        "Manage social media channels and content calendar",
        "Analyze campaign performance and optimize strategies",
        "Collaborate with design team for creative assets",
        "Monitor industry trends and competitor activities"
      ],
      requirements: [
        "3+ years of digital marketing experience",
        "Proficiency in social media platforms and analytics tools",
        "Strong copywriting and content creation skills",
        "Experience with Google Ads and Facebook Ads",
        "Data-driven approach to marketing"
      ],
      qualifications: [
        "Bachelor's degree in Marketing or related field",
        "Google Analytics and Ads certifications",
        "Experience in beauty/cosmetics industry preferred"
      ],
      skills: ["Social Media Marketing", "Content Creation", "Analytics", "SEO", "Paid Advertising"]
    },
    "product-development-manager": {
      title: "Product Development Manager",
      department: "R&D",
      location: "Bangalore, India",
      type: "Full-time",
      jobId: "279877",
      experienceLevel: "Senior-Level",
      workExperience: "5+ years",
      education: "Bachelor's Degree in Chemistry/Cosmetic Science",
      description: "Lead the development of new beauty products from concept to launch.",
      aboutRole: "We are looking for an experienced Product Development Manager to lead our innovation initiatives. You will oversee the entire product development lifecycle, from concept to market launch, ensuring our products meet the highest quality standards.",
      responsibilities: [
        "Oversee product development lifecycle",
        "Conduct market research and competitive analysis",
        "Collaborate with R&D team on formulations",
        "Manage product launch timelines and budgets",
        "Ensure regulatory compliance and quality standards"
      ],
      requirements: [
        "5+ years in product development, preferably cosmetics",
        "Strong project management skills",
        "Knowledge of cosmetic regulations and safety standards",
        "Excellent leadership and team collaboration",
        "Analytical and problem-solving abilities"
      ],
      qualifications: [
        "Bachelor's degree in Chemistry, Cosmetic Science, or related field",
        "MBA or advanced degree preferred",
        "Experience with product lifecycle management"
      ],
      skills: ["Product Development", "Project Management", "Regulatory Compliance", "R&D", "Leadership"]
    },
    "customer-service-representative": {
      title: "Customer Service Representative",
      department: "Support",
      location: "Mumbai, India",
      type: "Part-time",
      jobId: "279878",
      experienceLevel: "Entry-Level",
      workExperience: "1+ years",
      education: "High School Diploma",
      description: "Provide exceptional customer support and ensure customer satisfaction.",
      aboutRole: "Join our customer support team and help us deliver outstanding service to our valued customers. You will be the first point of contact for customer inquiries and play a crucial role in maintaining our high satisfaction standards.",
      responsibilities: [
        "Respond to customer inquiries via phone, email, and chat",
        "Resolve customer complaints and issues promptly",
        "Process orders, returns, and exchanges",
        "Maintain customer records and documentation",
        "Provide product information and recommendations"
      ],
      requirements: [
        "1+ years of customer service experience",
        "Excellent verbal and written communication",
        "Strong problem-solving skills",
        "Patience and empathy with customers",
        "Ability to multitask in fast-paced environment"
      ],
      qualifications: [
        "High school diploma or equivalent",
        "Experience with CRM systems",
        "Fluency in English and Hindi"
      ],
      skills: ["Customer Support", "Communication", "Problem Solving", "CRM Systems", "Multitasking"]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @media (max-width: 640px) {
          .career-detail-container {
            padding: 1rem 0.75rem;
          }
          .career-section {
            padding: 1rem;
            margin-bottom: 1rem;
          }
          .career-title {
            font-size: 1.25rem;
            line-height: 1.5rem;
          }
          .career-subtitle {
            font-size: 0.875rem;
          }
          .career-text {
            font-size: 0.875rem;
          }
          .career-icon {
            height: 1rem;
            width: 1rem;
          }
          .career-badge {
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
          }
          .career-button {
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
            height: auto;
          }
          .career-skill-badge {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .career-detail-container {
            padding: 0.75rem 0.5rem;
          }
          .career-section {
            padding: 0.75rem;
            margin-bottom: 0.75rem;
            border-radius: 0.375rem;
          }
          .career-title {
            font-size: 1.125rem;
            line-height: 1.375rem;
          }
          .career-subtitle {
            font-size: 0.8125rem;
          }
          .career-text {
            font-size: 0.8125rem;
            line-height: 1.5rem;
          }
          .career-icon {
            height: 0.875rem;
            width: 0.875rem;
          }
          .career-gap {
            gap: 0.5rem;
          }
          .career-gap-sm {
            gap: 0.375rem;
          }
          .career-button-sm {
            font-size: 0.8125rem;
            padding: 0.375rem 0.75rem;
          }
          .career-list-item {
            gap: 0.5rem;
          }
          .career-sidebar {
            margin-top: 1rem;
          }
        }

        @media (max-width: 360px) {
          .career-detail-container {
            padding: 0.5rem 0.375rem;
          }
          .career-section {
            padding: 0.5rem;
            margin-bottom: 0.5rem;
          }
          .career-title {
            font-size: 1rem;
          }
          .career-subtitle {
            font-size: 0.75rem;
          }
          .career-text {
            font-size: 0.75rem;
          }
          .career-icon {
            height: 0.75rem;
            width: 0.75rem;
          }
          .career-badge {
            font-size: 0.625rem;
          }
        }

        /* Improvements for tablet screens */
        @media (min-width: 768px) and (max-width: 1024px) {
          .career-detail-container {
            padding: 1.5rem 1rem;
          }
          .career-section {
            padding: 1.5rem;
            margin-bottom: 1.5rem;
          }
        }
      `}</style>
      <div className="max-w-12xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 career-detail-container">
        {/* Back Button */}
        <Link href="/careers" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors font-medium text-sm sm:text-base career-text">
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 career-icon" />
          Back to All Jobs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Job Header */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 gap-3 sm:gap-0">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">{position.title}</h1>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs sm:text-sm">
                      Job ID: {position.jobId}
                    </Badge>
                    {!position.isActive && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs sm:text-sm">
                        Position Not Available
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {position.isActive ? (
                    <Link href={`/careers/apply/${positionSlug}`} className="flex-1 sm:flex-none">
                      <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 text-sm sm:text-base">
                        Apply Now
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="flex-1 sm:flex-none bg-gray-400 text-white px-4 sm:px-6 py-2 text-sm sm:text-base cursor-not-allowed">
                      Applications Closed
                    </Button>
                  )}
                  <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-2 border-purple-200 hover:border-purple-400 px-3 sm:px-4 py-2">
                        <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          Share Job
                        </DialogTitle>
                        <DialogDescription>
                          Share this job opportunity with your network
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-4">
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 hover:bg-green-50 hover:border-green-300 transition-colors"
                          onClick={shareToWhatsApp}
                        >
                          <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                          onClick={shareToFacebook}
                        >
                          <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 hover:bg-sky-50 hover:border-sky-300 transition-colors"
                          onClick={shareToTwitter}
                        >
                          <svg className="h-6 w-6 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                          Twitter
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                          onClick={shareToLinkedIn}
                        >
                          <svg className="h-6 w-6 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </Button>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Or</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 h-12 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                          onClick={copyJobLink}
                        >
                          {copied ? (
                            <Check className="h-6 w-6 text-green-600" />
                          ) : (
                            <Copy className="h-6 w-6 text-purple-600" />
                          )}
                          {copied ? "Link Copied!" : "Copy Link"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                <span className="flex items-center">
                  <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {position.department}
                </span>
                <span className="flex items-center">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {position.location}
                </span>
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {position.type}
                </span>
              </div>

              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                {position.description}
              </p>
            </div>

            {/* About the Role */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm career-section">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 career-title">About the Role</h2>
              {typeof position.aboutRole === 'string' && position.aboutRole.includes('<') ? (
                <div 
                  className="text-gray-700 leading-relaxed text-sm sm:text-base prose prose-sm max-w-none career-text"
                  dangerouslySetInnerHTML={{ __html: position.aboutRole }}
                />
              ) : (
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base career-text">
                  {position.aboutRole}
                </p>
              )}
            </div>

            {/* Key Responsibilities */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm career-section">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 career-title">Key Responsibilities</h2>
              {Array.isArray(position.responsibilities) ? (
                <ul className="space-y-2 sm:space-y-3">
                  {position.responsibilities.map((item: string, index: number) => (
                    <li key={index} className="flex items-start career-list-item">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 flex-shrink-0 mt-0.5 career-icon" />
                      <span className="text-gray-700 text-sm sm:text-base career-text">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div 
                  className="text-gray-700 leading-relaxed text-sm sm:text-base prose prose-sm max-w-none career-text"
                  dangerouslySetInnerHTML={{ __html: position.responsibilities as string }}
                />
              )}
            </div>

            {/* What We're Looking For */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm career-section">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 career-title">What We're Looking For</h2>
              {Array.isArray(position.requirements) ? (
                <ul className="space-y-2 sm:space-y-3">
                  {position.requirements.map((item: string, index: number) => (
                    <li key={index} className="flex items-start career-list-item">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 flex-shrink-0 mt-0.5 career-icon" />
                      <span className="text-gray-700 text-sm sm:text-base career-text">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div 
                  className="text-gray-700 leading-relaxed text-sm sm:text-base prose prose-sm max-w-none career-text"
                  dangerouslySetInnerHTML={{ __html: position.requirements as string }}
                />
              )}
            </div>

            {/* Additional Note */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm career-section">
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base career-text">
                While this position is for a {String(position.type || '').toLowerCase()}, outstanding candidates may be considered for full-time positions based on performance and availability or the requirements within the company. We encourage you to demonstrate your skills and dedication throughout your time with us.
              </p>
            </div>

            {/* Bottom Apply Now Button */}
            <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm career-section">
              <div className="text-center">
                {position.isActive ? (
                  <Link href={`/careers/apply/${positionSlug}`} className="inline-block w-full sm:w-auto">
                    <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg font-semibold shadow-lg w-full sm:w-auto career-button">
                      Apply Now
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="bg-gray-400 text-white px-8 sm:px-12 py-4 sm:py-6 text-base sm:text-lg font-semibold cursor-not-allowed w-full sm:w-auto career-button">
                    Applications Closed
                  </Button>
                )}
                <p className="text-sm text-gray-500 mt-4 career-text">
                  Ready to join our team? Submit your application now!
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="lg:col-span-1 career-sidebar">
            <div className="sticky top-4 sm:top-8 space-y-4 sm:space-y-6">

              {/* Job Details */}
              <Card className="shadow-sm">
                <CardHeader className="border-b p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 career-title">Job Details</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Experience Level</h4>
                    <p className="text-gray-600 text-xs sm:text-base career-text">{position.experienceLevel}</p>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Work Experience (years)</h4>
                    <p className="text-gray-600 text-xs sm:text-base career-text">{position.workExperience}</p>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Education</h4>
                    <p className="text-gray-600 text-xs sm:text-base career-text">{position.education}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card className="shadow-sm">
                <CardHeader className="border-b p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 career-title">Skills</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {position.skills && Array.isArray(position.skills) && position.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 career-gap">
                      {position.skills.map((skill: string, index: number) => (
                        <Badge key={index} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs sm:text-sm career-skill-badge">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm career-text">No skills specified</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}