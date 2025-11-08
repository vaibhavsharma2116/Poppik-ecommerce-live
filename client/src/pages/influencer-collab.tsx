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
      <section className="relative py-8 xs:py-10 sm:py-12 md:py-16 lg:py-20 xl:py-24 bg-gradient-to-br from-pink-500 to-pink-600 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] bg-repeat"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-1 xs:gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-sm px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 rounded-full mb-3 xs:mb-4 sm:mb-5 md:mb-6">
              <Sparkles className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="text-white text-[10px] xs:text-xs sm:text-sm font-medium">Join Our Influencer Network</span>
            </div>
            
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 xs:mb-4 sm:mb-5 md:mb-6 px-2 leading-tight">
              Become a Poppik Influencer
            </h1>
            
            <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-4 xs:mb-5 sm:mb-6 md:mb-8 max-w-2xl mx-auto px-3 xs:px-4 leading-relaxed">
              Join India's fastest-growing beauty community and earn while promoting products you love
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 xs:gap-3 sm:gap-4 justify-center px-2 xs:px-3">
              <Button 
                onClick={() => window.open('https://forms.gle/XMttjRBYg5wzMHKw7', '_blank')}
                size="lg"
                className="bg-white text-pink-600 hover:bg-pink-50 font-semibold text-xs xs:text-sm sm:text-base px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5 sm:py-3 min-h-[36px] xs:min-h-[40px]"
              >
                Apply Now
              </Button>
              <Button 
                onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg"
                variant="outline" 
                className="border-2 border-white text-pink-600 font-semibold hover:bg-white/10 text-xs xs:text-sm sm:text-base px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5 sm:py-3 min-h-[36px] xs:min-h-[40px]"
              >
                Learn More
              </Button>
            </div>
          </div>
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

      {/* CTA Section - Removed as it's redundant with the new Apply Button Section */}
      <section className=" bg-white">
        <div className="max-w-12xl ">
          <div className="relative overflow-hidden rounded-lg sm:rounded-xl">
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