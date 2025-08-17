
import { Link } from "wouter";
import { ArrowLeft, Shield, Eye, Share2, Lock, Cookie, UserCheck, Baby, RefreshCw, Mail, CreditCard, Truck, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Privacy() {
  const sections = [
    {
      icon: Eye,
      title: "Information We Collect",
      content: "Your personal information (name, contact number, address, etc.) is collected solely for processing and delivering orders. We collect information you provide directly to us when you create an account, make a purchase, or contact us for support.",
      highlight: "Order Processing Only"
    },
    {
      icon: Share2,
      title: "Data Sharing",
      content: "We do not share your data with third parties, except with your consent, for legal reasons, or with authorized service providers who comply with our Privacy Policy. Aggregated, non-personal data may be shared for analytics and reporting purposes.",
      highlight: "No Third-Party Selling"
    },
    {
      icon: Package,
      title: "Product Usage",
      content: "Products sold via www.poppik.in are for personal use only and must not be resold. If you have known allergies, please review product ingredients before use. We maintain strict quality standards for all products.",
      highlight: "Personal Use Only"
    },
    {
      icon: CreditCard,
      title: "Payment Security",
      content: "We accept UPI, Credit Cards, Debit Cards, Net Banking, and Wallets. All payments are processed through secure, RBI-compliant payment gateways. Poppik is not responsible for payment failures or data breaches outside its system. Cash on Delivery (COD) may be available for select pincodes.",
      highlight: "Secure Payments"
    },
    {
      icon: Truck,
      title: "Order Processing",
      content: "Orders are shipped within 24–48 business hours. Delivery may take 2–7 working days depending on your location. Shipping fee of Rs. 99 applies to orders below Rs. 500. We ensure secure handling of your delivery information.",
      highlight: "Fast Processing"
    },
    {
      icon: Shield,
      title: "Data Security",
      content: "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.",
      highlight: "Protected Information"
    },
    {
      icon: UserCheck,
      title: "Your Rights",
      content: "You have the right to access, update, or delete your personal information. You can also opt out of promotional communications at any time. Contact our Grievance Officer Mr. Vishal Karande at vishal@poppik.in for any privacy concerns.",
      highlight: "User Control"
    },
    {
      icon: RefreshCw,
      title: "Promotional Communications",
      content: "By registering on the Website, you consent to receive promotional communications from Poppik via SMS, email, WhatsApp, and other platforms. You can opt out of these communications at any time.",
      highlight: "Communication Consent"
    },
    {
      icon: Mail,
      title: "Contact & Grievances",
      content: "In compliance with the Information Technology Act 2000, our Grievance Officer is Mr. Vishal Karande (vishal@poppik.in) with a response time within 48 hours. For general privacy questions, contact us at info@poppik.in.",
      highlight: "Quick Response"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <div className="text-center">
            <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-700 border-blue-200">
              Privacy Document
            </Badge>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600 text-lg">Poppik Lifestyle Private Limited</p>
          </div>
        </div>

        {/* Introduction Card */}
        <Card className="shadow-xl mb-8 border-0 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-100 rounded-full">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-blue-700">Your Privacy Matters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 text-center leading-relaxed text-lg">
              At Poppik, we take your privacy seriously. This policy explains how we collect, use, and protect your 
              personal information when you use our website and services. We are committed to transparency and giving 
              you control over your data.
            </p>
          </CardContent>
        </Card>

        {/* Privacy Sections */}
        <div className="grid gap-6">
          {sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <Card key={index} className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-900 group-hover:text-blue-700 transition-colors">
                          {index + 1}. {section.title}
                        </CardTitle>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      {section.highlight}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed text-base">
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Authenticity Guarantee */}
        <Card className="mt-8 shadow-xl border-0 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-green-700">Authenticity Guarantee</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700 leading-relaxed">
              At poppik.in, we ONLY stock authentic products. All our items are genuine and are sourced directly 
              from the manufacturer or from their authorized distributors. Prior to shipping, we do several levels of 
              rigorous quality checks, hence eliminating any chances of counterfeit products. If you have concerns 
              about authenticity, contact us at info@poppik.in.
            </p>
          </CardContent>
        </Card>

        {/* Data Protection Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="text-center py-6">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">RBI Compliant</h3>
              <p className="text-gray-600 text-sm">All payments processed through secure, RBI-compliant gateways.</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="text-center py-6">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                <UserCheck className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">IT Act 2000 Compliant</h3>
              <p className="text-gray-600 text-sm">Grievance redressal within 48 hours as per IT Act requirements.</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="text-center py-6">
              <div className="p-3 bg-orange-100 rounded-full w-fit mx-auto mb-4">
                <Eye className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No Data Selling</h3>
              <p className="text-gray-600 text-sm">We never sell your personal data to third parties.</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer CTA */}
        <Card className="mt-8 shadow-xl border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="text-center py-8">
            <h3 className="text-2xl font-semibold mb-4">Privacy Questions?</h3>
            <p className="text-blue-100 mb-6 text-lg">
              We believe in transparency. If you have any questions about how we handle your data, we're here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-medium transition-colors">
                  Contact Privacy Team
                </button>
              </Link>
              <a href="mailto:vishal@poppik.in" className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-3 rounded-lg font-medium transition-colors border border-blue-500">
                Grievance Officer
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
