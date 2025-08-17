

import { useState, useEffect } from "react";
import { Clock, Zap, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TimerProps {
  targetDate?: Date;
  title?: string;
  subtitle?: string;
}

export default function Timer({ 
  targetDate = new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: 24 hours from now
  title = "Limited Time Offer",
  subtitle = "Hurry! Sale ends soon"
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <section className="py-16 bg-gradient-to-r from-red-50 via-pink-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
            <Zap className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        <Card className="max-w-4xl mx-auto shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-full w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 flex items-center justify-center mb-3 shadow-lg mx-auto">
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold">
                    {timeLeft.days.toString().padStart(2, '0')}
                  </div>
                </div>
                <p className="text-gray-600 font-semibold">Days</p>
              </div>
              
              <div className="text-center">
                <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-full w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 flex items-center justify-center mb-3 shadow-lg mx-auto">
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold">
                    {timeLeft.hours.toString().padStart(2, '0')}
                  </div>
                </div>
                <p className="text-gray-600 font-semibold">Hours</p>
              </div>
              
              <div className="text-center">
                <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-full w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 flex items-center justify-center mb-3 shadow-lg mx-auto">
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold">
                    {timeLeft.minutes.toString().padStart(2, '0')}
                  </div>
                </div>
                <p className="text-gray-600 font-semibold">Minutes</p>
              </div>
              
              <div className="text-center">
                <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-full w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 flex items-center justify-center mb-3 shadow-lg mx-auto animate-pulse">
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold">
                    {timeLeft.seconds.toString().padStart(2, '0')}
                  </div>
                </div>
                <p className="text-gray-600 font-semibold">Seconds</p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-red-100 to-pink-100 rounded-full px-6 py-3">
                <Gift className="h-5 w-5 text-red-600" />
                <span className="text-red-700 font-semibold">Up to 50% OFF on Selected Items</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            <Clock className="inline h-4 w-4 mr-1" />
            Don't miss out on our exclusive beauty deals!
          </p>
        </div>
      </div>
    </section>
  );
}
