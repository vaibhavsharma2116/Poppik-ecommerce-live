
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Testimonial {
  id: number;
  customerName: string;
  customerImage: string | null;
  rating: number;
  reviewText: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ['/api/testimonials'],
  });

  const activeTestimonials = testimonials.filter(t => t.isActive);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % activeTestimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + activeTestimonials.length) % activeTestimonials.length);
  };

  useEffect(() => {
    if (activeTestimonials.length === 0) return;
    
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTestimonials.length, currentIndex]);

  if (isLoading) {
    return (
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-gray-900">
            Testimonials
          </h2>
          <div className="flex items-center justify-center">
            <Skeleton className="w-full max-w-3xl h-64" />
          </div>
        </div>
      </section>
    );
  }

  if (activeTestimonials.length === 0) {
    return null;
  }

  const currentTestimonial = activeTestimonials[currentIndex];
  const visibleTestimonials = [
    activeTestimonials[(currentIndex - 2 + activeTestimonials.length) % activeTestimonials.length],
    activeTestimonials[(currentIndex - 1 + activeTestimonials.length) % activeTestimonials.length],
    activeTestimonials[currentIndex],
    activeTestimonials[(currentIndex + 1) % activeTestimonials.length],
    activeTestimonials[(currentIndex + 2) % activeTestimonials.length],
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-pink-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-gray-900">
          Testimonials
        </h2>

        {/* Carousel Container */}
        <div className="relative">
          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex bg-white/80 hover:bg-white shadow-lg rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex bg-white/80 hover:bg-white shadow-lg rounded-full"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Testimonial Images Carousel */}
          <div className="flex justify-center items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
            {visibleTestimonials.map((testimonial, index) => {
              const isCenter = index === 2;
              const scale = isCenter ? 'scale-125' : index === 1 || index === 3 ? 'scale-100' : 'scale-75';
              const opacity = isCenter ? 'opacity-100' : index === 1 || index === 3 ? 'opacity-70' : 'opacity-40';
              
              return (
                <div
                  key={testimonial.id}
                  className={`transition-all duration-300 ${scale} ${opacity}`}
                >
                  <div className={`rounded-2xl overflow-hidden ${isCenter ? 'w-24 h-24 sm:w-32 sm:h-32 ring-4 ring-red-400' : 'w-16 h-16 sm:w-20 sm:h-20'}`}>
                    {testimonial.customerImage ? (
                      <img
                        src={testimonial.customerImage}
                        alt={testimonial.customerName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {testimonial.customerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Star Rating */}
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 sm:w-6 sm:h-6 ${
                  i < currentTestimonial.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-300 text-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Testimonial Text */}
          <div className="text-center max-w-3xl mx-auto mb-6">
            <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-4 px-4">
              {currentTestimonial.reviewText}
            </p>
            <p className="text-sm sm:text-base text-gray-500">
              — {currentTestimonial.customerName}
            </p>
          </div>

          {/* Dots Navigation */}
          
        </div>
      </div>
    </section>
  );
}
