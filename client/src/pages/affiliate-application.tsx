
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

export default function AffiliateApplicationPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    instagramHandle: "",
    instagramFollowers: "",
    youtubeChannel: "",
    youtubeSubscribers: "",
    tiktokHandle: "",
    facebookProfile: "",
    contentNiche: "",
    avgEngagementRate: "",
    whyJoin: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/affiliate-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Application Submitted Successfully!",
          description: "We'll review your application and get back to you within 5-7 business days.",
        });
        setLocation("/affiliate");
      } else {
        throw new Error(data.error || "Failed to submit application");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-red-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/affiliate")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Affiliate Page
        </Button>

        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Affiliate Application Form
            </h1>
            <p className="text-gray-600">
              Fill in your details to join the Poppik Lifestyle affiliate program
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="Your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Your last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  placeholder="Your full address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    required
                    placeholder="123456"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Social Media Profiles</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instagramHandle">Instagram Handle *</Label>
                  <Input
                    id="instagramHandle"
                    name="instagramHandle"
                    value={formData.instagramHandle}
                    onChange={handleInputChange}
                    required
                    placeholder="@yourhandle"
                  />
                </div>
                <div>
                  <Label htmlFor="instagramFollowers">Instagram Followers *</Label>
                  <Input
                    id="instagramFollowers"
                    name="instagramFollowers"
                    type="number"
                    value={formData.instagramFollowers}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="youtubeChannel">YouTube Channel Link</Label>
                  <Input
                    id="youtubeChannel"
                    name="youtubeChannel"
                    type="url"
                    value={formData.youtubeChannel}
                    onChange={handleInputChange}
                    placeholder="https://youtube.com/@yourchannel"
                  />
                </div>
                <div>
                  <Label htmlFor="youtubeSubscribers">YouTube Subscribers</Label>
                  <Input
                    id="youtubeSubscribers"
                    name="youtubeSubscribers"
                    type="number"
                    value={formData.youtubeSubscribers}
                    onChange={handleInputChange}
                    placeholder="e.g., 1000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tiktokHandle">TikTok Handle</Label>
                  <Input
                    id="tiktokHandle"
                    name="tiktokHandle"
                    value={formData.tiktokHandle}
                    onChange={handleInputChange}
                    placeholder="@yourhandle"
                  />
                </div>
                <div>
                  <Label htmlFor="facebookProfile">Facebook Profile</Label>
                  <Input
                    id="facebookProfile"
                    name="facebookProfile"
                    type="url"
                    value={formData.facebookProfile}
                    onChange={handleInputChange}
                    placeholder="https://facebook.com/yourprofile"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">Content & Engagement</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contentNiche">Content *</Label>
                  <Input
                    id="contentNiche"
                    name="contentNiche"
                    value={formData.contentNiche}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Beauty, Fashion, Lifestyle"
                  />
                </div>
                <div>
                  <Label htmlFor="avgEngagementRate">Average Engagement Rate</Label>
                  <Input
                    id="avgEngagementRate"
                    name="avgEngagementRate"
                    value={formData.avgEngagementRate}
                    onChange={handleInputChange}
                    placeholder="e.g., 5%"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="whyJoin">Why do you want to join Poppik Lifestyle? *</Label>
                <Textarea
                  id="whyJoin"
                  name="whyJoin"
                  value={formData.whyJoin}
                  onChange={handleInputChange}
                  required
                  placeholder="Tell us about yourself and why you'd be a great fit for our affiliate program..."
                  className="min-h-[150px]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/affiliate")}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
