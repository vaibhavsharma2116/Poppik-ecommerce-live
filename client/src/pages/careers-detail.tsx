
import { ArrowLeft, MapPin, Briefcase, Clock, CheckCircle2, Calendar } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function CareersDetail() {
  const [, params] = useRoute("/careers/:position");
  const positionSlug = params?.position || "";
  
  // Fetch position data from API
  const { data: position, isLoading, error } = useQuery({
    queryKey: ['/api/job-positions', positionSlug],
    queryFn: async () => {
      const response = await fetch(`/api/job-positions/${positionSlug}`);
      if (!response.ok) throw new Error('Failed to fetch job position');
      return response.json();
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Back Button */}
        <Link href="/careers" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors font-medium text-sm sm:text-base">
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
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
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs sm:text-sm">
                    Job ID: {position.jobId}
                  </Badge>
                </div>
                <Link href={`/careers/apply/${positionSlug}`} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 text-sm sm:text-base">
                    Apply
                  </Button>
                </Link>
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
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">About the Role</h2>
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                {position.aboutRole}
              </p>
            </div>

            {/* Key Responsibilities */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Key Responsibilities</h2>
              <ul className="space-y-2 sm:space-y-3">
                {position.responsibilities.map((item: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What We're Looking For */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">What We're Looking For</h2>
              <ul className="space-y-2 sm:space-y-3">
                {position.requirements.map((item: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Additional Note */}
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                While this position is for a {position.type.toLowerCase()}, outstanding candidates may be considered for full-time positions based on performance and availability or the requirements within the company. We encourage you to demonstrate your skills and dedication throughout your time with us.
              </p>
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 sm:top-8 space-y-4 sm:space-y-6">
              {/* Apply CTA */}
              <Card className="shadow-sm">
                <CardContent className="p-4 sm:p-6 text-center">
                  <Link href={`/careers/apply/${positionSlug}`}>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 sm:py-3 mb-2 sm:mb-3 text-sm sm:text-base">
                      Apply
                    </Button>
                  </Link>
                  <Link href="/careers">
                    <Button variant="outline" className="w-full text-sm sm:text-base">
                      See all jobs
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Job Details */}
              <Card className="shadow-sm">
                <CardHeader className="border-b p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">Job Details</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Experience Level</h4>
                    <p className="text-gray-600 text-xs sm:text-base">{position.experienceLevel}</p>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Work Experience (years)</h4>
                    <p className="text-gray-600 text-xs sm:text-base">{position.workExperience}</p>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Education</h4>
                    <p className="text-gray-600 text-xs sm:text-base">{position.education}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card className="shadow-sm">
                <CardHeader className="border-b p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">Skills</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {position.skills.map((skill: string, index: number) => (
                      <Badge key={index} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs sm:text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Share Job - Optional */}
              <Card className="shadow-sm">
                <CardContent className="p-4 sm:p-6 text-center">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Share this job</h4>
                  <p className="text-xs text-gray-500">Help us find the right candidate!</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
