
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
import { Check, ChevronDown, Gift, TrendingUp, Users, Sparkles, Award, Target } from "lucide-react";

export default function InfluencerCollabPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    instagram: "",
    followers: "",
    message: "",
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
      {/* Hero Section with Peach Background */}
      <section className="relative bg-gradient-to-r from-[#FFD4C4] to-[#FFB8A3] py-16 sm:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Become an<br />
                <span className="text-gray-800">Ambassador!</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 mb-8">
                Can't wait to help you build a brand that pays!
              </p>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900">Join Our Affiliate Program Today it's FREE</h3>
                <p className="text-gray-700 leading-relaxed">
                  If you have made an impact on Beauty & Personal Care, share your opinions, you have the influence to drive conversations and inspire journeys? Come, join our Poppik Lifestyle affiliate program today!
                </p>
                <p className="text-gray-700 leading-relaxed">
                  It's an incredible opportunity to try our products, share your feedback, and earn the happy moolah! giving you the tools to share the goodness with your affiliate links!
                </p>
                <Button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-8 py-6 text-lg rounded-full mt-4">
                  JOIN NOW
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=600&fit=crop"
                alt="Become an Ambassador"
                className="rounded-3xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* What's in it for You Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            What's in it for You?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-10 h-10 text-pink-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Exclusive Poppik giveaways!</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Generous discount codes & perks for your loved ones</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Elevate your Social media game by doing exciting campaigns</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Chance to collaborate & shine alongside your favorite brands</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Interact with our enthusiastic community making lifelong friendships</h3>
            </div>
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Enjoy superior quality high-performing affordable products at your doorstep!</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Ambassador Leaderboard Sections */}
      <section className="py-8 bg-gradient-to-r from-[#FFD4C4] to-[#FFB8A3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Get featured on the
              </h2>
              <h3 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-6">
                Ambassador Leaderboard
              </h3>
            </div>
            <div className="flex justify-center">
              <img
                src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop"
                alt="Ambassador"
                className="rounded-full w-64 h-64 object-cover shadow-xl border-8 border-white"
              />
              <div className="flex -ml-16 mt-24 space-x-4">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                  alt="Ambassador 2"
                  className="rounded-full w-20 h-20 object-cover border-4 border-white shadow-lg"
                />
                <img
                  src="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop"
                  alt="Ambassador 3"
                  className="rounded-full w-20 h-20 object-cover border-4 border-white shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 bg-gradient-to-r from-[#FFB8A3] to-[#FFD4C4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="flex justify-center order-2 md:order-1">
              <img
                src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop"
                alt="Ambassador"
                className="rounded-full w-64 h-64 object-cover shadow-xl border-8 border-white"
              />
              <div className="flex -ml-16 mt-24 space-x-4">
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
                  alt="Ambassador 2"
                  className="rounded-full w-20 h-20 object-cover border-4 border-white shadow-lg"
                />
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                  alt="Ambassador 3"
                  className="rounded-full w-20 h-20 object-cover border-4 border-white shadow-lg"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Join our fam on the
              </h2>
              <h3 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-6">
                Ambassador Leaderboard
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 bg-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-lg text-gray-700 mb-6">
            If you want to start off with us or have more queries, feel free to
          </p>
          <Button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-8 py-6 text-lg rounded-full">
            JOIN NOW
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Affiliate Program
          </h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Affiliate Program FAQs
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Get answers to all your questions about our affiliate program.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                How much can I make by joining?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Your earnings depend on your influence and engagement. Top affiliates can earn significant commissions on every sale through their unique affiliate link.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                What is the eligibility criteria and fees charged while onboard?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                There are no fees to join! We welcome influencers with authentic engagement and passion for beauty and wellness products.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                How long can I use the payout from affiliate program?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Your earnings are yours to use anytime! Payouts are processed monthly once you reach the minimum threshold.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                How long does it take for my payout to get settled?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Payouts are processed within 30 days of the end of each month, directly to your registered bank account.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Is it valid at all offline stores?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                The affiliate program is primarily for online sales through your unique tracking links.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Can I apply again if I was declined once?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Yes! You can reapply after 3 months. We encourage you to grow your engagement and try again.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Will I get discount code on all Poppik Ambassador?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Yes! All approved ambassadors receive exclusive discount codes for themselves and their followers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                What is the discount on all offline products?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Discount rates vary by product and campaign. Check your ambassador dashboard for current offers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-10" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Where can we order and how much time will order takes to get deliver?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Orders can be placed through our website. Delivery typically takes 3-7 business days depending on your location.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-11" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Will I get my application if I am interested or withdraw at already filled form?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                You can withdraw your application anytime before approval by contacting our support team.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-12" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                What documents need to be submitted during the process?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Basic KYC documents and bank details are required for payout processing once you're approved.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-13" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Is there any guidelines that we are on this Ambassador?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Yes, we have brand guidelines and content requirements that all ambassadors must follow. These will be shared upon approval.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-14" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Where do I contact if I need have doubts about my eligibility?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Contact our support team at support@poppiklifestyle.com or use the contact form on our website.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-15" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                POPPIK AFFILIATE PROGRAM
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Join thousands of influencers who are already earning with Poppik and building their personal brand alongside ours.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-16" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                PAYMENT TERMS
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Payments are processed monthly via bank transfer. Minimum payout threshold is ₹1000.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-17" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                COMMISSION TIER (Tier-Based Approach)
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Earn 10-20% commission based on your performance tier. Higher sales mean higher commission rates!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-18" className="bg-white border rounded-lg px-6">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                TERMINATION
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Either party may terminate the agreement with 30 days notice. All pending commissions will be paid out.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-8">
            Apply to Become an Ambassador
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <Input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram Handle *
              </label>
              <Input
                type="text"
                required
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full"
                placeholder="@yourusername"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follower Count *
              </label>
              <Input
                type="text"
                required
                value={formData.followers}
                onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
                className="w-full"
                placeholder="e.g., 10K, 50K, 100K+"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why do you want to collaborate with Poppik? *
              </label>
              <Textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full"
                rows={5}
                placeholder="Tell us about yourself and why you'd be a great Poppik ambassador..."
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-6 text-lg rounded-full"
            >
              Submit Application
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
