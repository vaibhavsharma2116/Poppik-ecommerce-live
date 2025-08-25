
import { useState } from "react";
import { Link } from "wouter";
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import OTPVerification from "./otp-verification";
import PhoneOTPVerification from "./phone-otp-verification";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: form, 2: phone OTP verification, 3: account creation
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    agreeToTerms: false,
    subscribeNewsletter: false
  });
  const { toast } = useToast();

  // Countdown timer for resend
  useState(() => {
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

  
  const verifyPhoneOTP = async () => {
    if (phoneOtp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Verify OTP logic here
      setPhoneVerified(true);
      await createAccount();
    } catch (error) {
      console.error("OTP verification error:", error);
      toast({
        title: "Error",
        description: "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        toast({
          title: "Success",
          description: "Account created successfully!",
        });
        
        window.location.href = "/profile"; // Redirect to profile
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password || !formData.dateOfBirth || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate PIN code
    if (formData.pincode && (formData.pincode.length !== 6 || !/^\d{6}$/.test(formData.pincode))) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit PIN code",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match!",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (!formData.agreeToTerms) {
      toast({
        title: "Error",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const cleanedPhone = formatPhoneNumber(formData.phone);
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      toast({
        title: "Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-red-600 mb-2">Poppik</h1>
          </Link>
          <p className="text-gray-600">Start your natural beauty journey today</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {step === 1 ? "Create Account" : "Verify Phone Number"}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 1 
                ? "Join thousands of beauty enthusiasts"
                : "Enter the 6-digit code sent to your mobile"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 ? (
              // Step 1: Registration Form
              <>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="First name"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter your phone (10 digits)"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="pl-10"
                        maxLength={10}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Enter 10-digit mobile number without country code
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Address Section */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                    <Label className="text-base font-semibold text-gray-700">Address Information</Label>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address *</Label>
                      <Input
                        id="address"
                        name="address"
                        type="text"
                        placeholder="Enter your full address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <select
                          id="city"
                          name="city"
                          value={formData.city || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          required
                        >
                          <option value="">Select City</option>
                          <option value="mumbai">Mumbai</option>
                          <option value="delhi">Delhi</option>
                          <option value="bangalore">Bangalore</option>
                          <option value="hyderabad">Hyderabad</option>
                          <option value="ahmedabad">Ahmedabad</option>
                          <option value="chennai">Chennai</option>
                          <option value="kolkata">Kolkata</option>
                          <option value="pune">Pune</option>
                          <option value="jaipur">Jaipur</option>
                          <option value="lucknow">Lucknow</option>
                          <option value="kanpur">Kanpur</option>
                          <option value="nagpur">Nagpur</option>
                          <option value="indore">Indore</option>
                          <option value="thane">Thane</option>
                          <option value="bhopal">Bhopal</option>
                          <option value="visakhapatnam">Visakhapatnam</option>
                          <option value="pimpri-chinchwad">Pimpri-Chinchwad</option>
                          <option value="patna">Patna</option>
                          <option value="vadodara">Vadodara</option>
                          <option value="ghaziabad">Ghaziabad</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <select
                          id="state"
                          name="state"
                          value={formData.state || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          required
                        >
                          <option value="">Select State</option>
                          <option value="andhra-pradesh">Andhra Pradesh</option>
                          <option value="arunachal-pradesh">Arunachal Pradesh</option>
                          <option value="assam">Assam</option>
                          <option value="bihar">Bihar</option>
                          <option value="chhattisgarh">Chhattisgarh</option>
                          <option value="goa">Goa</option>
                          <option value="gujarat">Gujarat</option>
                          <option value="haryana">Haryana</option>
                          <option value="himachal-pradesh">Himachal Pradesh</option>
                          <option value="jharkhand">Jharkhand</option>
                          <option value="karnataka">Karnataka</option>
                          <option value="kerala">Kerala</option>
                          <option value="madhya-pradesh">Madhya Pradesh</option>
                          <option value="maharashtra">Maharashtra</option>
                          <option value="manipur">Manipur</option>
                          <option value="meghalaya">Meghalaya</option>
                          <option value="mizoram">Mizoram</option>
                          <option value="nagaland">Nagaland</option>
                          <option value="odisha">Odisha</option>
                          <option value="punjab">Punjab</option>
                          <option value="rajasthan">Rajasthan</option>
                          <option value="sikkim">Sikkim</option>
                          <option value="tamil-nadu">Tamil Nadu</option>
                          <option value="telangana">Telangana</option>
                          <option value="tripura">Tripura</option>
                          <option value="uttar-pradesh">Uttar Pradesh</option>
                          <option value="uttarakhand">Uttarakhand</option>
                          <option value="west-bengal">West Bengal</option>
                          <option value="delhi">Delhi</option>
                          <option value="chandigarh">Chandigarh</option>
                          <option value="puducherry">Puducherry</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pincode">PIN Code *</Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        type="text"
                        placeholder="Enter PIN code"
                        value={formData.pincode || ''}
                        onChange={handleInputChange}
                        maxLength={6}
                        pattern="[0-9]{6}"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center h-5 pt-0.5">
                        <Checkbox
                          id="agreeToTerms"
                          checked={formData.agreeToTerms}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({
                              ...prev,
                              agreeToTerms: checked === true
                            }))
                          }
                          className="w-5 h-5 text-red-600 bg-white border-red-300 focus:ring-red-500 focus:ring-2 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="agreeToTerms" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                          I agree to the <Link href="/terms" className="text-red-600 hover:text-red-700 font-medium underline">Terms of Service</Link> and <Link href="/privacy" className="text-red-600 hover:text-red-700 font-medium underline">Privacy Policy</Link>
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="subscribeNewsletter"
                        checked={formData.subscribeNewsletter}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({
                            ...prev,
                            subscribeNewsletter: checked === true
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <Label htmlFor="subscribeNewsletter" className="text-sm cursor-pointer">
                        Subscribe to our newsletter for exclusive offers
                      </Label>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-red-600 hover:bg-red-700"
                    disabled={isLoading}
                    onClick={createAccount}
                  >
                    {isLoading ? "Sending OTP..." : "Send Verification Code"}
                  </Button>
                </form>

                <Separator />

               
              </>
            ) : (
              // Step 2: Phone OTP Verification
              <>
                {/* Phone Display */}
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">+91 {formatPhoneNumber(formData.phone)}</span>
                  </div>
                </div>

                {/* OTP Input */}
                <div className="space-y-4">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      value={phoneOtp}
                      onChange={(value) => setPhoneOtp(value)}
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

                {/* Verify Button */}
                <Button 
                  onClick={verifyPhoneOTP} 
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={isLoading || phoneOtp.length !== 6}
                >
                  {isLoading ? "Creating Account..." : "Verify & Create Account"}
                </Button>

               
              </>
            )}

            <div className="text-center">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/auth/login" className="text-red-600 hover:text-red-700 font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}