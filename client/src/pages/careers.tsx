
import { ArrowLeft, Briefcase, Users, TrendingUp, Heart, MapPin, Mail } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Careers() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const openPositions = [
    {
      title: "Beauty Consultant",
      department: "Sales",
      location: "Mumbai, India",
      type: "Full-time",
      description: "Help customers discover their perfect beauty products and provide expert advice on skincare and makeup."
    },
    {
      title: "Digital Marketing Specialist",
      department: "Marketing",
      location: "Remote",
      type: "Full-time",
      description: "Drive our digital presence through innovative campaigns and social media strategies."
    },
    {
      title: "Product Development Manager",
      department: "R&D",
      location: "Bangalore, India",
      type: "Full-time",
      description: "Lead the development of new beauty products from concept to launch."
    },
    {
      title: "Customer Service Representative",
      department: "Support",
      location: "Mumbai, India",
      type: "Part-time",
      description: "Provide exceptional customer support and ensure customer satisfaction."
    }
  ];

  // Get unique departments and locations
  const departments = ["all", ...Array.from(new Set(openPositions.map(p => p.department)))];
  const locations = ["all", ...Array.from(new Set(openPositions.map(p => p.location)))];

  // Filter positions based on selected filters
  const filteredPositions = openPositions.filter(position => {
    const departmentMatch = selectedDepartment === "all" || position.department === selectedDepartment;
    const locationMatch = selectedLocation === "all" || position.location === selectedLocation;
    return departmentMatch && locationMatch;
  });

  const benefits = [
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Health & Wellness",
      description: "Comprehensive health insurance and wellness programs"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Career Growth",
      description: "Clear career paths and continuous learning opportunities"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Great Culture",
      description: "Inclusive, collaborative, and fun work environment"
    },
    {
      icon: <Briefcase className="h-6 w-6" />,
      title: "Work-Life Balance",
      description: "Flexible working hours and generous time-off policies"
    }
  ];

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
            <Badge variant="outline" className="mb-4 bg-pink-50 text-pink-700 border-pink-200">
              Join Our Team
            </Badge>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Careers at Poppik</h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Be part of a team that's transforming the beauty industry. We're looking for passionate individuals who want to make a difference.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.filter(d => d !== "all").map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.filter(l => l !== "all").map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why Join Us */}
        <Card className="mb-8 shadow-xl border-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white">
          <CardContent className="py-8">
            <h2 className="text-3xl font-bold text-center mb-8">Why Work With Us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="text-white">{benefit.icon}</div>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-pink-100 text-sm">{benefit.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Open Positions */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Open Positions {filteredPositions.length < openPositions.length && `(${filteredPositions.length} of ${openPositions.length})`}
          </h2>
          {filteredPositions.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 text-lg">No positions found matching your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredPositions.map((position, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl text-gray-900">{position.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                          {position.department}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <MapPin className="h-3 w-3 mr-1" />
                          {position.location}
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {position.type}
                        </Badge>
                      </div>
                    </div>
                    <Link href={`/careers/${position.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{position.description}</p>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </div>

        {/* Contact Section */}
        <Card className="shadow-xl border-0 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <CardContent className="text-center py-8">
            <Mail className="h-12 w-12 mx-auto mb-4 text-pink-400" />
            <h3 className="text-2xl font-semibold mb-4">Don't See Your Role?</h3>
            <p className="text-gray-300 mb-6 text-lg max-w-2xl mx-auto">
              We're always looking for talented individuals. Send us your resume and we'll keep you in mind for future opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:careers@poppik.in" className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-lg font-medium transition-colors inline-block">
                Email: careers@poppik.in
              </a>
              <Link href="/contact">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-3">
                  Contact HR Team
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
