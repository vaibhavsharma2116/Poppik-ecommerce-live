
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
    queryKey: ['/api/admin/job-positions'],
    queryFn: async () => {
      console.log('🔄 Fetching job positions from /api/admin/job-positions...');
      const response = await fetch('/api/admin/job-positions');
      if (!response.ok) {
        console.error('❌ Failed to fetch job positions:', response.status);
        throw new Error('Failed to fetch job positions');
      }
      const data = await response.json();
      console.log('✅ Job positions received:', data);
      console.log('✅ Number of positions:', Array.isArray(data) ? data.length : 'Not an array');
      
      // Parse JSONB fields if they are strings
      if (Array.isArray(data)) {
        return data.map((position, idx) => {
          console.log(`Position ${idx + 1}: "${position.title}", isActive: ${position.isActive}`);
          return {
            ...position,
            responsibilities: typeof position.responsibilities === 'string' 
              ? JSON.parse(position.responsibilities) 
              : (position.responsibilities || []),
            requirements: typeof position.requirements === 'string' 
              ? JSON.parse(position.requirements) 
              : (position.requirements || []),
            skills: typeof position.skills === 'string' 
              ? JSON.parse(position.skills) 
              : (position.skills || []),
          };
        });
      }
      
      return data;
    },
    select: (data) => Array.isArray(data) ? data : [],
  });

  // Get unique departments and locations with safety check
  const validPositions = Array.isArray(openPositions) ? openPositions : [];
  const departments = ["all", ...Array.from(new Set(validPositions.map(p => p.department).filter(Boolean)))];
  const locations = ["all", ...Array.from(new Set(validPositions.map(p => p.location).filter(Boolean)))];

  // Filter positions based on selected department and location
  const filteredPositions = validPositions.filter(position => {
    const deptMatch = selectedDepartment === "all" || position.department === selectedDepartment;
    const locMatch = selectedLocation === "all" || position.location === selectedLocation;
    return deptMatch && locMatch;
  });

  // Debug logs
  if (validPositions.length > 0) {
    console.log(`📊 Careers Page - Total positions: ${validPositions.length}, Filtered: ${filteredPositions.length}, Filter: Dept="${selectedDepartment}", Loc="${selectedLocation}"`);
  }

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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-3 xs:py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 xs:mb-5 sm:mb-6 md:mb-8">
          <Link href="/" className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-3 xs:mb-4 sm:mb-5 md:mb-6 transition-colors text-xs xs:text-sm sm:text-base">
            <ArrowLeft className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 mr-1.5 xs:mr-2" />
            Back to Home
          </Link>
          <div className="text-center">
            <Badge variant="outline" className="mb-2 xs:mb-3 sm:mb-4 bg-pink-50 text-pink-700 border-pink-200 text-[10px] xs:text-xs sm:text-sm px-2 xs:px-3 py-0.5 xs:py-1">
              Join Our Team
            </Badge>
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 xs:mb-3 sm:mb-4 px-1 xs:px-2 leading-tight">Careers at Poppik</h1>
            <p className="text-gray-600 text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto px-3 xs:px-4 leading-relaxed">
              Be part of a team that's transforming the beauty industry. We're looking for passionate individuals who want to make a difference.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4 xs:mb-5 sm:mb-6 md:mb-8 shadow-md sm:shadow-lg">
          <CardContent className="py-3 xs:py-4 sm:py-5 md:py-6 px-3 xs:px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 xs:gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] xs:text-xs sm:text-sm font-medium text-gray-700 mb-1 xs:mb-1.5 sm:mb-2">
                  Department
                </label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full text-xs xs:text-sm sm:text-base h-9 xs:h-10 sm:h-11">
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
                <label className="block text-[10px] xs:text-xs sm:text-sm font-medium text-gray-700 mb-1 xs:mb-1.5 sm:mb-2">
                  Location
                </label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-full text-xs xs:text-sm sm:text-base h-9 xs:h-10 sm:h-11">
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
        <div className="mb-4 xs:mb-5 sm:mb-6 md:mb-8">
          <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 xs:mb-4 sm:mb-5 md:mb-6 text-center px-1 xs:px-2 leading-tight">
            Open Positions {filteredPositions.length < openPositions.length && `(${filteredPositions.length} of ${openPositions.length})`}
          </h2>
          {filteredPositions.length === 0 ? (
            <Card className="shadow-md sm:shadow-lg">
              <CardContent className="py-6 xs:py-8 sm:py-10 md:py-12 text-center px-3 xs:px-4">
                <p className="text-gray-500 text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl px-2 xs:px-4">
                  {validPositions.length === 0 
                    ? "No positions available at the moment. Please check back soon!"
                    : "No positions found matching your criteria."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 xs:gap-4 sm:gap-5 md:gap-6">
              {filteredPositions.map((position, index) => (
              <Card key={index} className={`shadow-md sm:shadow-lg hover:shadow-xl transition-shadow ${!position.isActive ? 'opacity-90 bg-gray-50 border-2 border-gray-300' : ''}`}>
                <CardHeader className="p-3 xs:p-4 sm:p-5 md:p-6">
                  <div className="flex flex-col lg:flex-row gap-2 xs:gap-3 sm:gap-4 lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-900 mb-1.5 xs:mb-2 leading-tight">{position.title}</CardTitle>
                      <div className="flex flex-wrap gap-1 xs:gap-1.5 sm:gap-2">
                        <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 text-[10px] xs:text-xs sm:text-sm px-1.5 xs:px-2 py-0.5">
                          {position.department}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] xs:text-xs sm:text-sm px-1.5 xs:px-2 py-0.5">
                          <MapPin className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />
                          {position.location}
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] xs:text-xs sm:text-sm px-1.5 xs:px-2 py-0.5">
                          {position.type}
                        </Badge>
                        {!position.isActive && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] xs:text-xs sm:text-sm px-1.5 xs:px-2 py-0.5 font-semibold">
                            Vacancy Full - Applications Closed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Link href={`/careers/${position.slug}`} className="w-full lg:w-auto lg:flex-shrink-0">
                      <Button className={`w-full lg:w-auto ${position.isActive ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600' : 'bg-gray-400 hover:bg-gray-500 cursor-default'} text-white text-xs xs:text-sm sm:text-base px-3 xs:px-4 sm:px-6 py-1.5 xs:py-2 min-h-[36px] xs:min-h-[40px]`}>
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-3 xs:p-4 sm:p-5 md:p-6 pt-0">
                  <p className="text-gray-600 text-xs xs:text-sm sm:text-base leading-relaxed">{position.description}</p>
                  {!position.isActive && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-amber-800 text-xs xs:text-sm font-medium">
                        ℹ️ This position is currently closed. Please check back later or explore other opportunities.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </div>
  <Card className="mb-4 xs:mb-5 sm:mb-6 md:mb-8 shadow-lg xs:shadow-xl border-0 bg-gradient-to-r from-pink-500 to-purple-500 text-white">
          <CardContent className="py-3 xs:py-4 sm:py-6 md:py-8 px-2 xs:px-3 sm:px-4 md:px-6">
            <h2 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-center mb-3 xs:mb-4 sm:mb-6 md:mb-8 px-1 xs:px-2 leading-tight">Why Work With Us?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center p-1.5 xs:p-2 sm:p-3 md:p-0">
                  <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1.5 xs:mb-2 sm:mb-3 md:mb-4">
                    <div className="text-white [&>svg]:w-3 [&>svg]:h-3 xs:[&>svg]:w-4 xs:[&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6">{benefit.icon}</div>
                  </div>
                  <h3 className="font-bold text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg mb-0.5 xs:mb-1 sm:mb-1.5 md:mb-2 px-0.5 xs:px-1 leading-tight">{benefit.title}</h3>
                  <p className="text-pink-100 text-[9px] xs:text-[10px] sm:text-xs md:text-sm px-1 xs:px-2 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
      </div>
      
    </div>
  );
}
