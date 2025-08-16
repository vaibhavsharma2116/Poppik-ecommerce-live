
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, FlaskConical, Heart, Users, Award, Sparkles } from "lucide-react";

export default function About() {
  const stats = [
    // { label: "Happy Customers", value: "5M+", icon: Users },
    // { label: "Products", value: "100+", icon: Sparkles },
    // { label: "Average Rating", value: "4.7★", icon: Award },
  ];

  const values = [
    {
      icon: Leaf,
      title: "Natural & Clean",
      description: "We use natural ingredients and avoid harmful chemicals in all our formulations.",
    },
    {
      icon: FlaskConical,
      title: "Science-Backed",
      description: "Every product is developed with proven active ingredients and rigorous testing.",
    },
    {
      icon: Heart,
      title: "Cruelty-Free",
      description: "We never test on animals and are committed to ethical beauty practices.",
    },
  ];

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About Poppik</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            At Poppik, we believe beauty is more than skin deep. We're a modern cosmetics and personal care brand offering high-performance color cosmetics, skincare essentials, and premium bath products designed for the bold, confident, and conscious consumer.
          </p>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
               Founded by industry experts with a deep passion for beauty and innovation:

                  Jay Gupta brings over 14 years of experience in sales strategy, marketing, and brand development. He is also a proud Mentor of Change at NITI Aayog, supporting entrepreneurship and innovation across India.
                  
                  Ravinder Singh has 27 years of rich experience in sales leadership, having worked with top brands like MyGlamm, Himalaya, and Britannia. He also serves as a Senior Consultant to Khadi India, promoting indigenous and sustainable beauty solutions.
                  
                  Together, they bring vision, experience, and excellence to create a brand that truly understands Indian beauty.

              </p>
              <p>
                Today, we're proud to offer a comprehensive range of skincare, haircare, makeup, and body care 
                products that are carefully formulated with active ingredients, rigorously tested, and loved by 
                millions of customers worldwide.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="flex justify-center mb-2">
                      <IconComponent className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-500">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
              alt="Beauty lab with scientists developing formulations"
              className="rounded-2xl shadow-lg w-full h-auto"
            />
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <Card key={index} className="text-center border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            At Poppik, our mission is to offer a full range of innovative, safe, and high-performance beauty products thoughtfully tailored to the needs of Indian consumers. We aim to bridge the gap between modern beauty trends and traditional Indian values by infusing our formulations with time-tested ingredients and cultural relevance. Our products are designed to empower self-expression through color, care, and confidence, helping individuals feel seen, celebrated, and beautiful in their own skin. At the heart of our mission lies a commitment to sustainability and ethics — by supporting local manufacturing, creating employment opportunities, and promoting responsible beauty, we strive to make a meaningful impact on both people and the planet.

          </p>
        </div>
      </div>
    </div>
  );
}
