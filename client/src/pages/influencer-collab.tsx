
import { ArrowLeft, Users, TrendingUp, Heart, Camera, Gift, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InfluencerCollab() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Influencer Collaboration
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join the Poppik family and collaborate with India's fastest-growing beauty and lifestyle brand!
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <Card className="mb-8 shadow-xl border-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white overflow-hidden">
          <CardContent className="py-12 px-6 text-center">
            <Camera className="h-16 w-16 mx-auto mb-4 text-white" />
            <h2 className="text-3xl font-bold mb-4">Create Magic Together</h2>
            <p className="text-lg text-pink-100 max-w-2xl mx-auto mb-8">
              We believe in the power of authentic content and genuine connections. 
              Partner with Poppik to create engaging content that resonates with your audience 
              while showcasing premium beauty products.
            </p>
          </CardContent>
        </Card>

        {/* Why Collaborate Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Why Partner With Poppik?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <Gift className="h-6 w-6 text-pink-600" />
                </div>
                <CardTitle className="text-xl">Exclusive Products</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Get access to our latest launches and exclusive products before anyone else. 
                  Showcase premium beauty essentials to your followers.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Grow Together</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Benefit from mutual growth opportunities. We support our creators with 
                  promotional campaigns and cross-platform visibility.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Authentic Partnership</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We value genuine collaborations. Creative freedom, fair compensation, 
                  and long-term partnerships are our priorities.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Community Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Join a supportive community of creators. Share experiences, tips, 
                  and collaborate on exciting campaigns together.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <Camera className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle className="text-xl">Content Flexibility</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Create content in your unique style across Instagram, YouTube, 
                  or any platform where your audience engages most.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Performance Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Earn competitive commissions and bonuses based on performance. 
                  We reward creativity and results.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Who We're Looking For */}
        <Card className="mb-8 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
            <CardTitle className="text-2xl text-gray-900">Who We're Looking For</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-3">Content Creators</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-pink-600 mr-2">✓</span>
                    Beauty and lifestyle influencers
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-600 mr-2">✓</span>
                    Micro and macro influencers (1K+ followers)
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-600 mr-2">✓</span>
                    YouTube vloggers and reviewers
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-600 mr-2">✓</span>
                    Instagram content creators
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-3">What We Value</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-pink-600 mr-2">✓</span>
                    Authentic and engaging content
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-600 mr-2">✓</span>
                    Strong audience engagement
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-600 mr-2">✓</span>
                    Professional and reliable approach
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-600 mr-2">✓</span>
                    Passion for beauty and wellness
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collaboration Types */}
        <Card className="mb-8 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="text-2xl text-gray-900">Collaboration Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="p-4 bg-pink-50 rounded-lg">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Product Reviews & Unboxing</h3>
                <p className="text-gray-600">
                  Receive our latest products and create honest, detailed reviews for your audience.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Sponsored Content</h3>
                <p className="text-gray-600">
                  Collaborate on paid campaigns featuring Poppik products in your content style.
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Affiliate Partnership</h3>
                <p className="text-gray-600">
                  Earn commissions by sharing your unique discount codes with your followers.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Brand Ambassador</h3>
                <p className="text-gray-600">
                  Become the face of Poppik with long-term exclusive partnerships and benefits.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="shadow-2xl border-0 bg-gradient-to-r from-pink-600 to-purple-600 text-white">
          <CardContent className="text-center py-12 px-6">
            <Users className="h-16 w-16 mx-auto mb-4 text-white" />
            <h2 className="text-3xl font-bold mb-4">Ready to Collaborate?</h2>
            <p className="text-lg text-pink-100 max-w-2xl mx-auto mb-8">
              Join our growing community of influencers and content creators. 
              Fill out our collaboration form and let's create something amazing together!
            </p>
            <a 
              href="https://forms.gle/qAtXqvoDXeFmtQpPA" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button 
                size="lg" 
                className="bg-white text-pink-600 hover:bg-gray-100 font-semibold text-lg px-8 py-6 shadow-xl"
              >
                Apply Now
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <p className="text-sm text-pink-100 mt-4">
              We review all applications within 3-5 business days
            </p>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="mt-8 shadow-xl">
          <CardContent className="text-center py-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Questions?</h3>
            <p className="text-gray-600 mb-4">
              Have questions about our influencer program? We're here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:info@poppik.in" className="text-pink-600 hover:text-pink-700 font-medium">
                Email: info@poppik.in
              </a>
              <span className="hidden sm:inline text-gray-300">|</span>
              <Link href="/contact">
                <span className="text-pink-600 hover:text-pink-700 font-medium cursor-pointer">
                  Contact Us
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
