import { useState } from "react";
import { ArrowLeft, Briefcase, Upload, X } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CareersApply() {
  const [, params] = useRoute("/careers/apply/:position?");
  const position = params?.position || "";
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    position: decodeURIComponent(position).replace(/-/g, " "),
    location: "",
    isFresher: false,
    experienceYears: "",
    experienceMonths: "",
    coverLetter: "",
    resume: null as File | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, resume: e.target.files![0] }));
    }
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, resume: null }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.resume) {
      toast({
        title: "Error",
        description: "Please upload your resume",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('fullName', formData.fullName);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('position', formData.position);
      submitData.append('location', formData.location);
      submitData.append('isFresher', formData.isFresher.toString());
      if (!formData.isFresher) {
        submitData.append('experienceYears', formData.experienceYears);
        submitData.append('experienceMonths', formData.experienceMonths);
      }
      submitData.append('coverLetter', formData.coverLetter);
      submitData.append('resume', formData.resume);

      const response = await fetch('/api/job-applications', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application');
      }

      toast({
        title: "Application Submitted!",
        description: result.message || "We'll review your application and get back to you soon.",
      });

      // Reset form
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        position: decodeURIComponent(position).replace(/-/g, " "),
        location: "",
        isFresher: false,
        experienceYears: "",
        experienceMonths: "",
        coverLetter: "",
        resume: null,
      });

      // Redirect to careers page after 2 seconds
      setTimeout(() => {
        window.location.href = '/careers';
      }, 2000);

    } catch (error) {
      console.error('Application submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/careers" className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Careers
          </Link>
          <div className="text-center">
            <Badge variant="outline" className="mb-4 bg-pink-50 text-pink-700 border-pink-200">
              <Briefcase className="h-4 w-4 mr-2" />
              Join Our Team
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Apply Now</h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Take the first step towards an exciting career at Poppik. Fill out the form below and we'll get back to you soon.
            </p>
          </div>
        </div>

        {/* Application Form */}
        <Card className="shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Application Form</CardTitle>
            {formData.position && (
              <p className="text-pink-100 mt-2">
                Position: <span className="font-semibold">{formData.position}</span>
              </p>
            )}
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john.doe@example.com"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 98765 43210"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Preferred Location *</Label>
                    <Input
                      id="location"
                      name="location"
                      type="text"
                      required
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Mumbai, India"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Position Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Position Details</h3>

                <div>
                  <Label htmlFor="position">Position Applied For *</Label>
                  <Input
                    id="position"
                    name="position"
                    type="text"
                    required
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="e.g., Beauty Consultant"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="experienceSection" className="text-base font-medium">
                    Total years of experience *
                  </Label>
                  <div className="flex items-center mt-2 mb-3">
                    <input
                      type="checkbox"
                      id="isFresher"
                      checked={formData.isFresher}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          isFresher: e.target.checked,
                          experienceYears: e.target.checked ? "" : prev.experienceYears,
                          experienceMonths: e.target.checked ? "" : prev.experienceMonths,
                        }));
                      }}
                      className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 cursor-pointer"
                    />
                    <Label htmlFor="isFresher" className="ml-2 text-sm font-normal cursor-pointer">
                      I am a fresher
                    </Label>
                  </div>

                  {!formData.isFresher && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Select
                          value={formData.experienceYears}
                          onValueChange={(value) => handleSelectChange("experienceYears", value)}
                          required={!formData.isFresher}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Years" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i} {i === 1 ? "Year" : "Years"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Select
                          value={formData.experienceMonths}
                          onValueChange={(value) => handleSelectChange("experienceMonths", value)}
                          required={!formData.isFresher}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Months" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {i} {i === 1 ? "Month" : "Months"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="coverLetter">Cover Letter / Why do you want to join Poppik? *</Label>
                  <Textarea
                    id="coverLetter"
                    name="coverLetter"
                    required
                    value={formData.coverLetter}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself and why you'd be a great fit for this position..."
                    className="mt-1 min-h-[150px]"
                  />
                </div>
              </div>

              {/* Resume Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Resume</h3>

                <div>
                  <Label htmlFor="resume">Upload Resume * (PDF, DOC, DOCX - Max 5MB)</Label>
                  <div className="mt-2">
                    {!formData.resume ? (
                      <label
                        htmlFor="resume"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX up to 5MB</p>
                        </div>
                        <Input
                          id="resume"
                          name="resume"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                          required
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded">
                            <Upload className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{formData.resume.name}</p>
                            <p className="text-xs text-gray-500">
                              {(formData.resume.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <X className="h-5 w-5 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6 text-lg font-semibold shadow-lg"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting Application...
                    </span>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-4">
                  By submitting this form, you agree to our Terms & Conditions and Privacy Policy
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-8 shadow-xl border-0 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <CardContent className="text-center py-8">
            <h3 className="text-2xl font-semibold mb-4">What Happens Next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold">1</span>
                </div>
                <p className="text-gray-300">Application Review</p>
                <p className="text-sm text-gray-400 mt-1">We'll review your application within 3-5 business days</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold">2</span>
                </div>
                <p className="text-gray-300">Interview Process</p>
                <p className="text-sm text-gray-400 mt-1">Shortlisted candidates will be contacted for interviews</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold">3</span>
                </div>
                <p className="text-gray-300">Final Decision</p>
                <p className="text-sm text-gray-400 mt-1">We'll notify you of our decision and next steps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}