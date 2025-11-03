import { useState } from "react";
// import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function InfluencerCollab() {
  // const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    fullAddress: "",
    landmark: "",
    city: "",
    pinCode: "",
    state: "",
    country: "",
    instagramProfile: "",
    youtubeChannel: "",
    facebookProfile: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/influencer-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success!",
          description: data.message,
        });
        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          contactNumber: "",
          fullAddress: "",
          landmark: "",
          city: "",
          pinCode: "",
          state: "",
          country: "",
          instagramProfile: "",
          youtubeChannel: "",
          facebookProfile: "",
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Poppik Lifestyle – Influencer Collaboration Form
          </h1>
          <p className="text-gray-600">
            Help us connect billions to creativity, self-care & authentic storytelling.<br />
            Together, let's make real connections. After all, collaboration is made for YOU
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Apply now and be a part of our ever-growing influencer family ❤️
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
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
                onChange={handleChange}
                required
                placeholder="Your last name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <Label htmlFor="contactNumber">Contact Number *</Label>
            <Input
              id="contactNumber"
              name="contactNumber"
              type="tel"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              placeholder="+91 1234567890"
            />
          </div>

          <div>
            <Label htmlFor="fullAddress">Full Address *</Label>
            <Input
              id="fullAddress"
              name="fullAddress"
              value={formData.fullAddress}
              onChange={handleChange}
              required
              placeholder="Street address, apartment, suite, etc."
            />
          </div>

          <div>
            <Label htmlFor="landmark">Landmark</Label>
            <Input
              id="landmark"
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              placeholder="Nearby landmark (optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="Your city"
              />
            </div>
            <div>
              <Label htmlFor="pinCode">Pin Code *</Label>
              <Input
                id="pinCode"
                name="pinCode"
                value={formData.pinCode}
                onChange={handleChange}
                required
                placeholder="123456"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                placeholder="Your state"
              />
            </div>
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                placeholder="Your country"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900">Social Media Profiles</h3>

            <div>
              <Label htmlFor="instagramProfile">Instagram Profile Link</Label>
              <Input
                id="instagramProfile"
                name="instagramProfile"
                type="url"
                value={formData.instagramProfile}
                onChange={handleChange}
                placeholder="https://instagram.com/yourprofile"
              />
            </div>

            <div>
              <Label htmlFor="youtubeChannel">YouTube Channel Link (If Available)</Label>
              <Input
                id="youtubeChannel"
                name="youtubeChannel"
                type="url"
                value={formData.youtubeChannel}
                onChange={handleChange}
                placeholder="https://youtube.com/@yourchannel"
              />
            </div>

            <div>
              <Label htmlFor="facebookProfile">Facebook Profile Link (If Available)</Label>
              <Input
                id="facebookProfile"
                name="facebookProfile"
                type="url"
                value={formData.facebookProfile}
                onChange={handleChange}
                placeholder="https://facebook.com/yourprofile"
              />
            </div>
          </div>

          <div className="flex justify-center pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-12 py-3 text-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            This content is neither created nor endorsed by Google.{" "}
            <a href="#" className="text-blue-600 hover:underline">Report Abuse</a> -{" "}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> -{" "}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </form>
      </div>
    </div>
  );
}