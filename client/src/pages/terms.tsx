import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowLeft, Shield, Package, CreditCard, Truck, RotateCcw, User, AlertTriangle, Mail, Eye, FileText, Scale, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Terms() {
  const sections = [
    {
      icon: FileText,
      title: "Introduction",
      content: "The website www.poppik.in (\"Website\") is an internet-based content and e-commerce portal operated by Poppik Lifestyle Private Limited, headquartered in India. By accessing the Website, you agree to be bound by these Terms and Conditions without modification. Poppik Lifestyle Pvt. Ltd. reserves the right to deny access or registration to any user without prior notice or reason. Unless otherwise stated, these Terms and Conditions override any previous understandings, agreements, or terms related to the use of this Website."
    },
    {
      id: "cashback",
      icon: Gift,
      title: "Cashback, Rewards & Wallet",
      content: "Cashback is a promotional reward provided by Poppik to eligible users as described below. Cashback is credited to your Poppik Wallet and is subject to these specific terms: \n\n1. Eligibility: Cashback is awarded only on qualifying purchases as communicated in the offer terms. Certain categories, products, coupons, or payment methods may be excluded. \n\n2. Crediting: Cashback may take up to 7 business days to reflect in your Wallet after order delivery/fulfilment and verification. \n\n3. Expiry: Cashback credited to your Wallet expires 180 days from the date it is credited unless a different period is stated in the offer. Expired cashback will be automatically removed and is non-recoverable. \n\n4. Redemption: Cashback can be used as part or full payment on future purchases only on www.poppik.in. Minimum and maximum redemption limits may apply as stated in the offer. Cashback cannot be redeemed for cash and cannot be transferred to other users. \n\n5. Stacking: Cashback usage may be subject to stacking rules with promo codes, discounts, or other offers. Poppik reserves the right to restrict stacking for specific offers. \n\n6. Reversals: If an order is returned, cancelled, or refunded, any cashback earned from that order may be reversed from your Wallet. If you used cashback towards payment and the order is refunded, refund amounts will be credited according to our refund policy and may exclude redeemed cashback. \n\n7. Abuse & Fraud: Any attempt to manipulate, game, or abuse cashback programs (including creating multiple accounts, using false information, or fraudulently triggering offers) will result in forfeiture of cashback, account suspension, and possible legal action. \n\n8. Limits & Changes: Poppik may impose limits on cashback per user, per transaction, or overall. Poppik reserves the right to modify, pause, or terminate cashback programs at any time without prior notice. \n\n9. Disputes: Any disputes related to cashback will be resolved at Poppik's sole discretion after investigation. For questions, contact info@poppik.in."
    },
    {
      id: "affiliate",
      icon: User,
      title: "Affiliate, Commission & Wallet",
      content: "Commission is a promotional earning provided to eligible affiliates for successful referrals and sales as described below. Commission is credited to your Affiliate Wallet and is subject to these specific terms: \n\n1. Eligibility: Commission is awarded only on qualifying sales made through your affiliate link/code as per the offer terms. Certain categories, products, coupons, or payment methods may be excluded. \n\n2. Crediting: Commission may take up to 7 business days to reflect in your Wallet after order delivery/fulfilment and verification. Cancelled or returned orders will not earn commission. \n\n3. Expiry: Commission credited to your Wallet is valid for withdrawal for 180 days from the date it is credited unless a different period is stated in the offer. Expired commission will be automatically removed and is non-recoverable. \n\n4. Withdrawal: Commission can be withdrawn to your bank account once minimum withdrawal threshold is met (e.g., ₹2500). Withdrawal requests are subject to verification and may take up to 7 business days to process. Poppik reserves the right to reject withdrawal requests if fraudulent activity is suspected. \n\n5. Stacking: Commission earnings may be subject to stacking rules with other offers, bonuses, or incentives. Poppik reserves the right to restrict stacking for specific campaigns. \n\n6. Reversals: If an order is returned, cancelled, or refunded, any commission earned from that order may be reversed from your Wallet. Refunds will be processed according to our refund policy and may exclude paid commission. \n\n7. Abuse & Fraud: Any attempt to manipulate, game, or abuse affiliate programs (including creating multiple accounts, using false information, or fraudulently triggering referrals) will result in forfeiture of commission, account suspension, and possible legal action. \n\n8. Limits & Changes: Poppik may impose limits on commission per user, per transaction, or overall. Poppik reserves the right to modify, pause, or terminate affiliate programs at any time without prior notice. \n\n9. Disputes: Any disputes related to commission will be resolved at Poppik's sole discretion after investigation. For questions, contact info@poppik.in."
    },
    {
      icon: User,
      title: "User Account, Password, and Security",
      content: "Use of the Website is available only to persons who can legally enter into binding contracts under Indian law. Users under the age of 18 must use the site under the supervision of a parent or legal guardian who agrees to these terms. You are responsible for maintaining the confidentiality of your account and password. Poppik will not be liable for any loss or damage arising from unauthorized use of your account."
    },
    {
      icon: Shield,
      title: "User Responsibilities",
      content: "You agree to immediately notify Poppik of any unauthorized use and ensure you log out at the end of each session. By using the Website, you agree not to upload, publish, or share any content that belongs to another person, violates intellectual property rights, is harmful, abusive, defamatory, obscene, or invasive of privacy, or impersonates another person. By registering on the Website, you consent to receive promotional communications from Poppik via SMS, email, WhatsApp, and other platforms."
    },
    {
      icon: Package,
      title: "Products and Services",
      content: "Products sold via www.poppik.in are for personal use only and must not be resold. If you have known allergies, please review product ingredients before use. We ONLY stock authentic products sourced directly from manufacturers or authorized distributors. We conduct rigorous quality checks to eliminate any chances of counterfeit products."
    },
    {
      icon: CreditCard,
      title: "Pricing and Payments",
      content: "Product prices and availability are subject to change without prior notice. Promotional offers and gifts are valid while supplies last. Free gifts may have a shorter shelf life (up to 1 month). Each user can avail free gift offers only once per month. We accept UPI, Credit Cards, Debit Cards, Net Banking, and Wallets. All payments are processed through secure, RBI-compliant payment gateways. Cash on Delivery (COD) may be available for select pincodes."
    },
    {
      icon: Truck,
      title: "Shipping & Delivery",
      content: "Orders are shipped within 24–48 business hours. Delivery may take 2–7 working days depending on your location. Shipping fee of Rs. 99 applies to orders below Rs. 500. Customers must not accept tampered or damaged shipments. Replacement for defective items will be arranged only once per order."
    },
    {
      icon: RotateCcw,
      title: "Returns & Refunds",
      content: "Poppik.in follows a transparent \"No Return & No Refund\" policy for all full-size products. Products once opened or used are not eligible for return. However, in case of unused items in original packaging, replacement requests may be considered within 7 days of delivery. Refunds are not applicable unless a replacement is unavailable. In case of a refund, the original mode of payment will be credited within 7-10 working days."
    },
    {
      icon: AlertTriangle,
      title: "Cancellation Policy",
      content: "An order can be cancelled only if it is in \"Pending\" status. Once processing begins, cancellation is not possible. Poppik reserves the right to cancel orders due to pricing or inventory errors, suspected fraudulent activity, or technological glitches. Please email us at info@poppik.in with the reason for cancellation."
    },
    {
      icon: Scale,
      title: "Copyright and Intellectual Property",
      content: "All content on www.poppik.in is protected under applicable copyright and IP laws. You may not modify, publish, transmit, reproduce, or distribute any content for commercial use without prior written permission from Poppik."
    },
    {
      icon: Mail,
      title: "Grievance Redressal & Contact",
      content: "In compliance with the Information Technology Act 2000, our Grievance Officer is Mr. Hanmant Dadas (hanmnt@poppik.in) with a response time within 48 hours. For any questions regarding these Terms & Conditions, contact us at info@poppik.in."
    }
  ];

  const [location] = useLocation();
  useEffect(() => {
    const hash = location && location.includes('#') ? location.split('#')[1] : (window.location.hash ? window.location.hash.replace('#','') : null);
    if (!hash) return;
    // small timeout to ensure the element is rendered
    setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-red-600 hover:text-red-700 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <div className="text-center">
            <Badge variant="outline" className="mb-4 bg-red-50 text-red-700 border-red-200">
              Legal Document
            </Badge>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Terms & Conditions</h1>
            <p className="text-gray-600 text-lg">Poppik Lifestyle Private Limited</p>
          </div>
        </div>

        {/* Introduction Card */}
        <Card className="shadow-xl mb-8 border-0 bg-gradient-to-r from-red-50 to-pink-50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl text-red-700">Agreement to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 text-center leading-relaxed text-lg">
              Welcome to Poppik! By accessing and using our website www.poppik.in, you agree to be bound by these 
              Terms and Conditions. Please read them carefully before using our services.
            </p>
          </CardContent>
        </Card>

        {/* Terms Sections */}
        <div className="grid gap-6">
          {sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <Card id={section.id ?? undefined} key={index} className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                      <IconComponent className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900 group-hover:text-red-700 transition-colors">
                        {index + 1}. {section.title}
                      </CardTitle>
                    </div>
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

        {/* Important Notice */}
        <Card className="mt-8 shadow-xl border-0 bg-gradient-to-r from-orange-50 to-red-50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-orange-700">Important Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700 leading-relaxed">
              Products listed under any clearance or promotion section are safe for use but may be within 12 months 
              of the expiry date. Kindly check before placing your order. Individual items from kits/sets are not 
              eligible for replacement or return.
            </p>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <Card className="mt-8 shadow-xl border-0 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <CardContent className="text-center py-8">
            <h3 className="text-2xl font-semibold mb-4">Questions about our Terms?</h3>
            <p className="text-gray-300 mb-6 text-lg">
              We're here to help! Contact us for any clarification on these terms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
                  Contact Support Team
                </button>
              </Link>
              <a href="mailto:info@poppik.in" className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-medium transition-colors">
                Email: info@poppik.in
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}