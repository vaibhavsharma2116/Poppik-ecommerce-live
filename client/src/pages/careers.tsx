
import { ArrowLeft, Briefcase, Users, TrendingUp, Heart, MapPin, Mail } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Careers() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Fetch job positions from API
  const { data: openPositions = [], isLoading } = useQuery({
    queryKey: ['/api/job-positions', selectedDepartment, selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (selectedLocation !== 'all') params.append('location', selectedLocation);
      
      const response = await fetch(`/api/job-positions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch job positions');
      return response.json();
    },
  });

  // Get unique departments and locations
  const departments = ["all", ...Array.from(new Set(openPositions.map(p => p.department)))];
  const locations = ["all", ...Array.from(new Set(openPositions.map(p => p.location)))];

  // Positions are already filtered by the API
  const filteredPositions = openPositions;

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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-4 sm:mb-6 transition-colors text-sm sm:text-base">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Back to Home
          </Link>
          <div className="text-center">
            <Badge variant="outline" className="mb-3 sm:mb-4 bg-pink-50 text-pink-700 border-pink-200 text-xs sm:text-sm">
              Join Our Team
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">Careers at Poppik</h1>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-4">
              Be part of a team that's transforming the beauty industry. We're looking for passionate individuals who want to make a difference.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 sm:mb-8 shadow-lg">
          <CardContent className="py-4 sm:py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Department
                </label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full text-sm sm:text-base h-10 sm:h-11">
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Location
                </label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-full text-sm sm:text-base h-10 sm:h-11">
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


        {/* Open Positions */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 text-center px-2">
            Open Positions {filteredPositions.length < openPositions.length && `(${filteredPositions.length} of ${openPositions.length})`}
          </h2>
          {filteredPositions.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="py-8 sm:py-12 text-center">
                <p className="text-gray-500 text-sm sm:text-base lg:text-lg px-4">No positions found matching your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {filteredPositions.map((position, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg md:text-xl text-gray-900 mb-2">{position.title}</CardTitle>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 text-xs sm:text-sm">
                          {position.department}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs sm:text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          {position.location}
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs sm:text-sm">
                          {position.type}
                        </Badge>
                      </div>
                    </div>
                    <Link href={`/careers/${position.slug}`} className="w-full lg:w-auto lg:flex-shrink-0">
                      <Button className="w-full lg:w-auto bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-sm sm:text-base px-4 sm:px-6 py-2">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-gray-600 text-sm sm:text-base">{position.description}</p>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </div>
  <Card className="mb-6 sm:mb-8 shadow-xl border-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white">
          <CardContent className="py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center mb-4 sm:mb-6 md:mb-8 px-2">Why Work With Us?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center p-2 sm:p-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4">
                    <div className="text-white [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6">{benefit.icon}</div>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base md:text-lg mb-1 sm:mb-1.5 md:mb-2 px-1">{benefit.title}</h3>
                  <p className="text-pink-100 text-xs sm:text-sm px-2 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Contact Section */}
        <Card className="shadow-xl border-0 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <CardContent className="text-center py-6 sm:py-8 px-4 sm:px-6">
            <Mail className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-pink-400" />
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">Don't See Your Role?</h3>
            <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-2">
              We're always looking for talented individuals. Send us your resume and we'll keep you in mind for future opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <a href="mailto:careers@poppik.in" className="bg-pink-600 hover:bg-pink-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium transition-colors inline-block text-sm sm:text-base">
                Email: careers@poppik.in
              </a>
              <Link href="/contact" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-white text-black hover:bg-white/10 px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base">
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
