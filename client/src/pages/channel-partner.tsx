
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
      {/* Hero Section */}
      <section className="relative py-8 xs:py-10 sm:py-12 md:py-16 lg:py-20 xl:py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] bg-repeat"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-1 xs:gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-sm px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 rounded-full mb-3 xs:mb-4 sm:mb-5 md:mb-6">
              <Handshake className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="text-white text-[10px] xs:text-xs sm:text-sm font-medium">Exclusive Partnership Opportunity</span>
            </div>
            
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 xs:mb-4 sm:mb-5 md:mb-6 px-2 leading-tight">
              Join as a Channel Partner
            </h1>
            
            <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-4 xs:mb-5 sm:mb-6 md:mb-8 max-w-2xl mx-auto px-3 xs:px-4 leading-relaxed">
              Build your business empire with Poppik. Become our authorized channel partner and unlock unlimited earning potential
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 xs:gap-3 sm:gap-4 justify-center px-2 xs:px-3">
              <Button 
                onClick={() => window.open('https://forms.gle/FBpJH1oZ1aKaNGhE6', '_blank')}
                size="lg"
                className="bg-white text-purple-600 hover:bg-pink-50 font-semibold text-xs xs:text-sm sm:text-base px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5 sm:py-3 min-h-[36px] xs:min-h-[40px]"
              >
                Apply for Partnership
              </Button>
              <Button 
                onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg"
                variant="outline" 
                className="border-2 border-white text-purple-600 font-semibold hover:bg-white/10 text-xs xs:text-sm sm:text-base px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5 sm:py-3 min-h-[36px] xs:min-h-[40px]"
              >
                Explore Benefits
              </Button>
            </div>
          </div>
        </div>
      </section>

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
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="w-12 h-12 text-white mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Build Your Business Empire?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Join the Poppik family and unlock unlimited growth potential
          </p>
          <Button 
            onClick={() => window.open('https://forms.gle/FBpJH1oZ1aKaNGhE6', '_blank')}
            size="lg"
            className="bg-white text-purple-600 hover:bg-pink-50"
          >
            Become a Channel Partner Today
          </Button>
        </div>
      </section>
    </div>
  );
}
