import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Gift, TrendingUp, Users, Sparkles, Award, Target } from "lucide-react";

export default function AffiliatePage() {
  const [, setLocation] = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Check if user has approved affiliate application
  const { data: application, isLoading } = useQuery({
    queryKey: ["/api/affiliate/my-application", user.id],
    queryFn: async () => {
      if (!user.id) return null;
      const res = await fetch(`/api/affiliate/my-application?userId=${user.id}`);
      if (!res.ok) {
        console.log('Failed to fetch application, checking localStorage');
        // Check localStorage for pending application
        const pending = localStorage.getItem('pendingAffiliateApplication');
        if (pending) {
          const pendingApp = JSON.parse(pending);
          // Only use if submitted within last 24 hours
          const submittedTime = new Date(pendingApp.submittedAt).getTime();
          if (Date.now() - submittedTime < 24 * 60 * 60 * 1000) {
            return pendingApp;
          } else {
            localStorage.removeItem('pendingAffiliateApplication');
          }
        }
        return null;
      }
      // Clear localStorage if we got data from server
      localStorage.removeItem('pendingAffiliateApplication');
      const data = await res.json();
      console.log('Application data received:', data);
      return data;
    },
    enabled: !!user.id,
    retry: 1,
    retryDelay: 1000,
  });

  // Redirect to dashboard if approved
  useEffect(() => {
    console.log('Checking application status:', application);
    if (application) {
      console.log('Application status:', application.status);
      const status = application.status?.toLowerCase();
      if (status === "approved") {
        console.log('Redirecting to affiliate dashboard');
        // Clear localStorage before redirect
        localStorage.removeItem('pendingAffiliateApplication');
        setLocation("/affiliate-dashboard");
      }
    }
  }, [application, setLocation]);


  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If approved, show dashboard link (this part will be skipped due to useEffect redirect)
  if (application && application.status === "approved") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome Back, Affiliate!</h1>
          <p className="text-gray-600 mb-8">You're already an approved affiliate</p>
          <Button
            onClick={() => setLocation("/affiliate-dashboard")}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Peach Background */}
      <section className="relative bg-gradient-to-r from-pink-50 to-red-50 py-8 xs:py-10 sm:py-12 md:py-16 lg:py-20 xl:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-5 sm:gap-6 md:gap-8 items-center">
            {/* Image - Shows first on mobile, second on desktop */}
            <div className="relative order-1 md:order-2">
              <img
                src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=600&fit=crop"
                alt="Affiliate Partnership"
                className="rounded-3xl shadow-2xl w-full"
              />
            </div>

            {/* Content - Shows second on mobile, first on desktop */}
            <div className="text-left order-2 md:order-1">
              <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-3 xs:mb-4 sm:mb-5 md:mb-6 leading-tight">
                Become an Affiliate<br />
                <span className="text-gray-800">With Poppik Lifestyle!</span>
              </h1>
              <p className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-700 mb-4 xs:mb-5 sm:mb-6 md:mb-8 leading-relaxed">
                Partner with us to earn commissions and grow together!
              </p>
              <div className="space-y-2 xs:space-y-3 sm:space-y-4">
                <h3 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900">Join Our Affiliate Community</h3>
                <p className="text-sm xs:text-base text-gray-700 leading-relaxed">
                  Are you passionate about beauty and personal care? Do you love creating engaging content that inspires your audience? We're looking for creative influencers to collaborate with Poppik Lifestyle!
                </p>
                <p className="text-sm xs:text-base text-gray-700 leading-relaxed">
                  Whether you're a makeup artist, beauty enthusiast, or lifestyle creator, we want to work with you. Get exclusive access to our products, create authentic content, and be part of a brand that celebrates beauty in all its forms!
                </p>
                {!application ? (
                  <Button
                    onClick={() => setLocation("/affiliate-application")}
                    className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-6 xs:px-8 py-4 xs:py-6 text-base xs:text-lg rounded-full mt-4 w-full sm:w-auto"
                  >
                    APPLY NOW
                  </Button>
                ) : (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Application Status:</strong> {
                        !application.status || application.status === 'pending'
                          ? 'Pending Review'
                          : application.status === 'approved'
                            ? 'Approved'
                            : application.status === 'rejected'
                              ? 'Not Approved'
                              : 'Under Review'
                      }
                    </p>
                    {(!application.status || application.status === 'pending') && (
                      <p className="text-xs text-blue-600">
                        Thank you for applying! We will review your application and get back to you within 5-7 business days.
                      </p>
                    )}
                    {application.status === 'approved' && (
                      <Button
                        onClick={() => setLocation("/affiliate-dashboard")}
                        className="bg-green-600 hover:bg-green-700 text-white mt-3"
                      >
                        Go to Dashboard
                      </Button>
                    )}
                    {application.status === 'rejected' && (
                      <p className="text-xs text-red-600 mt-2">
                        Unfortunately, your application was not approved at this time. You may reapply after 3 months.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's in it for You Section */}
      <section className="py-16 bg-white">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Why Become an Affiliate?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-10 h-10 text-pink-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Free Product PR Packages</h3>
              <p className="text-gray-600">Receive our latest products to try, review, and create content with</p>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Exclusive Brand Partnerships</h3>
              <p className="text-gray-600">Long-term collaboration opportunities with competitive compensation</p>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Grow Your Platform</h3>
              <p className="text-gray-600">Get featured on our social media and reach thousands of beauty lovers</p>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Creative Freedom</h3>
              <p className="text-gray-600">Express your unique style while showcasing our products your way</p>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Join a Community</h3>
              <p className="text-gray-600">Connect with like-minded creators and build lasting relationships</p>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Early Access</h3>
              <p className="text-gray-600">Be the first to try new launches and exclusive collections</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Affiliates Sections */}
      <section className="py-8 bg-gradient-to-r from-red-50 to-pink-100">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Images - First on mobile */}
            <div className="flex justify-center order-1 md:order-2">
              <img
                src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop"
                alt="Featured Affiliate"
                className="rounded-full w-48 h-48 sm:w-64 sm:h-64 object-cover shadow-xl border-8 border-white"
              />
              <div className="flex -ml-12 sm:-ml-16 mt-20 sm:mt-24 space-x-2 sm:space-x-4">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                  alt="Affiliate 2"
                  className="rounded-full w-16 h-16 sm:w-20 sm:h-20 object-cover border-4 border-white shadow-lg"
                />
                <img
                  src="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop"
                  alt="Affiliate 3"
                  className="rounded-full w-16 h-16 sm:w-20 sm:h-20 object-cover border-4 border-white shadow-lg"
                />
              </div>
            </div>

            {/* Content - Second on mobile */}
            <div className="order-2 md:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Meet Our Amazing
              </h2>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                Affiliate Community
              </h3>
              <p className="text-gray-700 text-base sm:text-lg">
                Join hundreds of affiliates who are already creating stunning content with Poppik products
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 bg-gradient-to-r from-pink-100 to-red-50">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Images - First on mobile */}
            <div className="flex justify-center order-1">
              <img
                src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop"
                alt="Featured Affiliate"
                className="rounded-full w-48 h-48 sm:w-64 sm:h-64 object-cover shadow-xl border-8 border-white"
              />
              <div className="flex -ml-12 sm:-ml-16 mt-20 sm:mt-24 space-x-2 sm:space-x-4">
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
                  alt="Affiliate 2"
                  className="rounded-full w-16 h-16 sm:w-20 sm:h-20 object-cover border-4 border-white shadow-lg"
                />
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                  alt="Affiliate 3"
                  className="rounded-full w-16 h-16 sm:w-20 sm:h-20 object-cover border-4 border-white shadow-lg"
                />
              </div>
            </div>

            {/* Content - Second on mobile */}
            <div className="order-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Be Part of Our
              </h2>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                Growing Family
              </h3>
              <p className="text-gray-700 text-base sm:text-lg">
                Create authentic content, inspire your followers, and grow with a brand that values creativity
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 bg-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-lg text-gray-700 mb-6">
            Ready to start your journey with Poppik? We'd love to hear from you!
          </p>
          <Button
            onClick={() => setLocation("/affiliate-application")}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-8 py-6 text-lg rounded-full"
          >
            APPLY FOR AFFILIATE PROGRAM
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Affiliate Program FAQs
          </h2>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Who can apply for the affiliate program?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                We welcome content creators across all platforms - Instagram, YouTube, TikTok, and more. Whether you're a micro-influencer or have a large following, if you create authentic beauty content, we'd love to work with you!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                What's the minimum follower requirement?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                While we value quality over quantity, we typically look for creators with at least 2,000 engaged followers. However, if you have exceptional content and engagement, we're open to discussing opportunities regardless of follower count.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Do I need to pay to join?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Absolutely not! Our affiliate program is completely free. We believe in genuine partnerships and will never charge creators to work with us.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                What type of content do you expect?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                We love authentic, creative content! This can include product reviews, makeup tutorials, GRWM videos, reels, stories, unboxing videos, and more. We encourage you to showcase our products in your unique style.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                How are affiliates compensated?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Compensation varies based on the collaboration type. We offer product gifting, paid partnerships, commission-based programs, and exclusive discount codes for your audience. Long-term partnerships may include monthly retainers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                How long does the application process take?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                We review all applications within 5-7 business days. If approved, our team will reach out to discuss collaboration opportunities and next steps.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Can I apply again if rejected?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Yes! You can reapply after 3 months. We encourage you to grow your content quality and engagement, and try again. The beauty industry is constantly evolving, and so are we!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Will I get free products?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Yes! Approved affiliates receive PR packages with our products to create authentic content. You'll also get early access to new launches and exclusive collections.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Do I need exclusive partnership with Poppik?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                No, we don't require exclusivity. However, we do ask that you maintain authenticity and not promote competing products in the same content piece as our products.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-10" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Can international affiliates apply?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
               We're currently collaborating primarily with Indian creators as part of our core focus. However, we're excited to expand globally!
International affiliates are welcome to apply — collaborations will be evaluated based on audience relevance and shipping feasibility.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-11" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                What platforms do you focus on?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                We collaborate with creators across Instagram, YouTube, TikTok, Facebook, and blogs. Each platform has unique opportunities, and we tailor our collaborations accordingly.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-12" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                How do I track my affiliate performance?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                We provide unique tracking links and discount codes so you can monitor your performance. Regular reports and insights will be shared to help you understand your impact.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-13" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Where can I contact for more information?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                For any queries about the affiliate program, reach out to us at info@poppik.in or use the contact form on our website. We're here to help!
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

    </div>
  );
}