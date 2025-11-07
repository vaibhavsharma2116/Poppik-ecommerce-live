import { useState } from "react";
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
import { Gift, TrendingUp, Users, Sparkles, Award, Target, Star, Zap, Heart, Globe, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function InfluencerCollabPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    city: "",
    state: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/influencer-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Application Submitted!",
          description: "We'll review your application and get back to you soon.",
        });
        setFormData({
          name: "",
          email: "",
          phone: "",
          instagram: "",
          followers: "",
          message: "",
        });
      } else {
        throw new Error("Failed to submit application");
      }
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
      {/* Hero Section */}
      <section className="relative text-white py-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/attached_assets/INFLUENCER BANNER-02_1762506080774.jpg" 
            alt="Become a Poppik Influencer"
            className="w-full h-full object-cover"
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/20"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-block mb-6">
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-6 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2 inline" />
              Join Our Influencer Network
            </Badge>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in drop-shadow-lg">
            Become a Poppik Influencer
          </h1>

          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-white drop-shadow-md">
            Join India's fastest-growing beauty community and earn while promoting products you love
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/affiliate-application">
              <Button size="lg" className="bg-white text-pink-600 hover:bg-gray-100 font-semibold px-8 py-6 text-lg shadow-xl">
                Apply Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/20 backdrop-blur-sm font-semibold px-8 py-6 text-lg shadow-lg"
              onClick={() => {
                const benefitsSection = document.getElementById('benefits');
                benefitsSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section
      <section className="py-6 xs:py-8 sm:py-10 md:py-12 bg-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 md:gap-8">
            {[
              { number: "500+", label: "Active Influencers" },
              { number: "10M+", label: "Combined Reach" },
              { number: "₹50L+", label: "Paid to Influencers" },
              { number: "95%", label: "Satisfaction Rate" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-pink-600 mb-1 xs:mb-1.5 sm:mb-2 leading-tight">{stat.number}</div>
                <div className="text-[10px] xs:text-xs sm:text-sm md:text-base text-gray-600 leading-tight px-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

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

      {/* Application Form */}
      {/* <section id="application-form" className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Apply Now
            </h2>
            <p className="text-lg text-gray-600">
              Join our community of successful influencers
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
                    Instagram Handle *
                  </label>
                  <Input
                    required
                    placeholder="@yourusername"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follower Count *
                </label>
                <Input
                  required
                  type="number"
                  placeholder="e.g., 10000"
                  value={formData.followers}
                  onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why do you want to collaborate?
                </label>
                <Textarea
                  placeholder="Tell us about your content style and why you'd be a great fit..."
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <Button 
                type="submit"
                className="w-full bg-pink-600 hover:bg-pink-700"
                size="lg"
              >
                Submit Application
              </Button>
            </form>
          </div>
        </div>
      </section> */}

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

      {/* CTA Section */}
      <section className="py-16 bg-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Join our community and start earning today
          </p>
          <Button 
            onClick={() => window.open('https://forms.gle/XMttjRBYg5wzMHKw7', '_blank')}
            size="lg"
            className="bg-white text-pink-600 hover:bg-pink-50"
          >
            Apply for Collaboration
          </Button>
        </div>
      </section>
    </div>
  );
}