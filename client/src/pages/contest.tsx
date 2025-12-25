import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { Link } from "wouter";

interface Contest {
  id: number;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export default function ContestsPage() {
  const { data: contests = [], isLoading } = useQuery<Contest[]>({
    queryKey: ['/api/contests'],
    queryFn: async () => {
      const response = await fetch('/api/contests');
      if (!response.ok) {
        console.error('Failed to fetch contests:', response.status);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    retry: 1,
  });

  const displayContests = contests || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-8 sm:py-12 md:py-16 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Loading contests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      {/* Contests Grid - Responsive Layout */}
      <div className="max-w-[90rem] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
          {displayContests.map((contest) => {
            const isExpired = new Date(contest.validUntil) < new Date();
            
            return (
              <Link href={`/contest/${contest.slug}`} key={contest.id}>
                <Card 
                  className="overflow-hidden border-0 bg-white cursor-pointer"
                >
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden">
                      {/* Contest Badge */}
                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 z-10">
                        {/* <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 text-xs sm:text-sm md:text-base font-bold shadow-lg flex items-center gap-1">
                          <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                          CONTEST
                        </Badge> */}
                      </div>

                      {/* Expired Badge */}
                      {isExpired && (
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 z-10">
                          <Badge className="bg-gray-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 text-xs sm:text-sm md:text-base font-bold shadow-lg">
                            ENDED
                          </Badge>
                        </div>
                      )}

                      {/* Image - Responsive Heights */}
                      <div className="relative h-40 xs:h-48 sm:h-72 md:h-80 lg:h-96 xl:h-[400px] overflow-hidden bg-gradient-to-br from-yellow-100 to-orange-100">
                        <img
                          src={contest.imageUrl}
                          alt={contest.title}
                          className="w-full h-full"
                          loading="lazy"
                        />
                      </div>

                     
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {displayContests.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No contests available</p>
          </div>
        )}
      </div>
    </div>
  );
}
