
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { FirebaseSMSService } from "@/lib/firebase";
interface MobileOTPVerificationProps {
  phoneNumber?: string;
  onVerified?: (phoneNumber: string) => void;
}

export default function MobileOTPVerification({ phoneNumber: propPhoneNumber, onVerified }: MobileOTPVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState(propPhoneNumber || "");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 91, remove it (assuming Indian numbers)
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned.substring(2);
    }
    
    return cleaned;
  };

  const sendOTP = async () => {
    const cleanedPhone = formatPhoneNumber(phoneNumber);
    
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      toast({
        title: "Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await FirebaseSMSService.sendSMSOTP(cleanedPhone);

      if (result.success) {
        toast({
          title: "Success",
          description: "OTP sent to your mobile number!",
        });
        setOtpSent(true);
        setCountdown(60); // 60 seconds countdown
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send OTP",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await FirebaseSMSService.verifySMSOTP(otp);

      if (result.success) {
        toast({
          title: "Success",
          description: "Mobile number verified successfully",
        });

        if (onVerified) {
          onVerified(phoneNumber);
        } else {
          // Redirect or handle success
          window.location.href = "/profile";
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Invalid OTP",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast({
        title: "Error",
        description: "Failed to verify OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup Firebase service when component unmounts
  useEffect(() => {
    return () => {
      FirebaseSMSService.cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* reCAPTCHA container - hidden */}
        <div id="recaptcha-container" style={{ display: 'none' }}></div>
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-red-600 mb-2">Poppik</h1>
          </Link>
          <p className="text-gray-600">Verify your mobile number</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Mobile OTP Verification</CardTitle>
            <CardDescription className="text-center">
              {!otpSent 
                ? "Enter your mobile number to receive OTP"
                : "Enter the 6-digit code sent to your mobile"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phone Number Input */}
            {!otpSent && (
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                    maxLength={10}
                  />
                </div>
              </div>
            )}

            {/* Phone Number Display (when OTP sent) */}
            {otpSent && (
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">+91 {formatPhoneNumber(phoneNumber)}</span>
                </div>
              </div>
            )}

            {/* OTP Input (when OTP sent) */}
            {otpSent && (
              <div className="space-y-4">
                <Label htmlFor="otp">Enter OTP</Label>
                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={(value) => setOtp(value)}
                    maxLength={6}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            )}

            {/* Action Button */}
            {!otpSent ? (
              <Button 
                onClick={sendOTP} 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={isSending || !phoneNumber || formatPhoneNumber(phoneNumber).length !== 10}
              >
                {isSending ? "Sending..." : "Send OTP"}
              </Button>
            ) : (
              <Button 
                onClick={verifyOTP} 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>
            )}

            {/* Resend OTP (when OTP sent) */}
            {otpSent && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Didn't receive the code?
                </p>
                <Button
                  variant="outline"
                  onClick={sendOTP}
                  disabled={isSending || countdown > 0}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    `Resend OTP in ${countdown}s`
                  ) : (
                    "Resend OTP"
                  )}
                </Button>
              </div>
            )}

            {/* Back to Login */}
            <div className="text-center">
              <Link href="/auth/login" className="text-red-600 hover:text-red-700 text-sm">
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
