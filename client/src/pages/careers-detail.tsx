
import { ArrowLeft, MapPin, Briefcase, Clock, CheckCircle2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CareersDetail() {
  const [, params] = useRoute("/careers/:position");
  const positionSlug = params?.position || "";
  
  // Position data - this should match the data from careers.tsx
  const positionsData: Record<string, any> = {
    "beauty-consultant": {
      title: "Beauty Consultant",
      department: "Sales",
      location: "Mumbai, India",
      type: "Full-time",
      description: "Help customers discover their perfect beauty products and provide expert advice on skincare and makeup.",
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
      ]
    },
    "digital-marketing-specialist": {
      title: "Digital Marketing Specialist",
      department: "Marketing",
      location: "Remote",
      type: "Full-time",
      description: "Drive our digital presence through innovative campaigns and social media strategies.",
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
      ]
    },
    "product-development-manager": {
      title: "Product Development Manager",
      department: "R&D",
      location: "Bangalore, India",
      type: "Full-time",
      description: "Lead the development of new beauty products from concept to launch.",
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
      ]
    },
    "customer-service-representative": {
      title: "Customer Service Representative",
      department: "Support",
      location: "Mumbai, India",
      type: "Part-time",
      description: "Provide exceptional customer support and ensure customer satisfaction.",
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
      ]
    }
  };

  const position = positionsData[positionSlug];

  if (!position) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link href="/careers" className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-8 transition-colors font-medium">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to All Positions
        </Link>
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-pink-500 p-8 sm:p-12 text-white">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-4xl sm:text-5xl font-bold mb-4">{position.title}</h1>
                <p className="text-pink-100 text-lg mb-6 max-w-2xl">{position.description}</p>
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 text-sm">
                    <Briefcase className="h-4 w-4 mr-2" />
                    {position.department}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 text-sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    {position.location}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 text-sm">
                    <Clock className="h-4 w-4 mr-2" />
                    {position.type}
                  </Badge>
                </div>
              </div>
              <div className="lg:mt-0">
                <Link href={`/careers/apply/${positionSlug}`}>
                  <Button className="bg-white text-pink-600 hover:bg-pink-50 font-bold px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all">
                    Apply Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Job Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Responsibilities */}
            <Card className="shadow-xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-100">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <div className="w-2 h-8 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full mr-3"></div>
                  Key Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-4">
                  {position.responsibilities.map((item: string, index: number) => (
                    <li key={index} className="flex items-start group">
                      <CheckCircle2 className="h-6 w-6 text-pink-500 mr-3 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span className="text-gray-700 text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card className="shadow-xl border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full mr-3"></div>
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-4">
                  {position.requirements.map((item: string, index: number) => (
                    <li key={index} className="flex items-start group">
                      <CheckCircle2 className="h-6 w-6 text-purple-500 mr-3 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span className="text-gray-700 text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Qualifications */}
            <Card className="shadow-xl border-0 overflow-hidden sticky top-8">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-100">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="w-2 h-8 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full mr-3"></div>
                  Preferred Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-4">
                  {position.qualifications.map((item: string, index: number) => (
                    <li key={index} className="flex items-start group">
                      <CheckCircle2 className="h-5 w-5 text-pink-500 mr-3 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Apply CTA Card */}
            <Card className="shadow-xl border-0 overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-3">Ready to Apply?</h3>
                <p className="text-gray-300 mb-5 text-sm">
                  Take the next step in your career journey with us!
                </p>
                <Link href={`/careers/apply/${positionSlug}`}>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-3 shadow-lg hover:shadow-xl transition-all">
                    Submit Application
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA */}
        <Card className="mt-12 shadow-2xl border-0 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-500 text-white overflow-hidden">
          <CardContent className="text-center py-12 px-6">
            <h3 className="text-3xl font-bold mb-4">Join the Poppik Family</h3>
            <p className="text-pink-100 mb-8 text-lg max-w-3xl mx-auto">
              Be part of a team that's revolutionizing the beauty industry. We can't wait to meet you!
            </p>
            <Link href={`/careers/apply/${positionSlug}`}>
              <Button className="bg-white text-pink-600 hover:bg-pink-50 px-12 py-6 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all">
                Apply for this Position
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
