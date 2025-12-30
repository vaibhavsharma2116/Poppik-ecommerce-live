import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { User, Mail, Phone, Calendar, LogOut, Edit, Wallet, Gift, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// City to State and Pincode mapping
const cityLocationMap: Record<string, { state: string; pincodes: string[] }> = {
  mumbai: { state: "maharashtra", pincodes: ["400001", "400002", "400003", "400004", "400005", "400006", "400007", "400008", "400009", "400010"] },
  delhi: { state: "delhi", pincodes: ["110001", "110002", "110003", "110004", "110005", "110006", "110007", "110008", "110009", "110010"] },
  bangalore: { state: "karnataka", pincodes: ["560001", "560002", "560003", "560004", "560005", "560006", "560007", "560008", "560009", "560010"] },
  hyderabad: { state: "telangana", pincodes: ["500001", "500002", "500003", "500004", "500005", "500006", "500007", "500008", "500009", "500010"] },
  ahmedabad: { state: "gujarat", pincodes: ["380001", "380002", "380003", "380004", "380005", "380006", "380007", "380008", "380009", "380010"] },
  chennai: { state: "tamil_nadu", pincodes: ["600001", "600002", "600003", "600004", "600005", "600006", "600007", "600008", "600009", "600010"] },
  kolkata: { state: "west_bengal", pincodes: ["700001", "700002", "700003", "700004", "700005", "700006", "700007", "700008", "700009", "700010"] },
  pune: { state: "maharashtra", pincodes: ["411001", "411002", "411003", "411004", "411005", "411006", "411007", "411008", "411009", "411010"] },
  jaipur: { state: "rajasthan", pincodes: ["302001", "302002", "302003", "302004", "302005", "302006", "302007", "302008", "302009", "302010"] },
  surat: { state: "gujarat", pincodes: ["395001", "395002", "395003", "395004", "395005", "395006", "395007", "395008", "395009", "395010"] },
  lucknow: { state: "uttar_pradesh", pincodes: ["226001", "226002", "226003", "226004", "226005"] },
  kanpur: { state: "uttar_pradesh", pincodes: ["208001", "208002", "208003", "208004", "208005"] },
  nagpur: { state: "maharashtra", pincodes: ["440001", "440002", "440003", "440004", "440005"] },
  indore: { state: "madhya_pradesh", pincodes: ["452001", "452002", "452003", "452004", "452005"] },
  thane: { state: "maharashtra", pincodes: ["400601", "400602", "400603", "400604", "400605"] },
  bhopal: { state: "madhya_pradesh", pincodes: ["462001", "462002", "462003", "462004", "462005"] },
  visakhapatnam: { state: "andhra_pradesh", pincodes: ["530001", "530002", "530003", "530004", "530005"] },
  pimpri: { state: "maharashtra", pincodes: ["411017", "411018", "411019", "411020", "411021"] },
  patna: { state: "bihar", pincodes: ["800001", "800002", "800003", "800004", "800005"] },
  vadodara: { state: "gujarat", pincodes: ["390001", "390002", "390003", "390004", "390005"] },
};

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: string;
  address?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export default function Profile() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [currentOTP, setCurrentOTP] = useState<string | null>(null);
  const showDevOTP = true; // show OTP in UI for development/testing
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { toast } = useToast();

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("91") && cleaned.length === 12) {
      return cleaned.substring(2);
    }
    return cleaned;
  };

  // Fetch wallet data
  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/wallet?userId=${user.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Initialize form data with user data
        setEditFormData({
          firstName: parsedUser.firstName || '',
          lastName: parsedUser.lastName || '',
          phone: parsedUser.phone || '',
          dateOfBirth: parsedUser.dateOfBirth || '',
          address: parsedUser.address || '',
          city: parsedUser.city || '',
          state: parsedUser.state || '',
          pincode: parsedUser.pincode || ''
        });
      } catch (error) {
        console.error("Error parsing user data:", error);
        // Redirect to login if user data is invalid
        window.location.href = "/auth/login";
      }
    } else {
      // Redirect to login if no user data
      window.location.href = "/auth/login";
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search || "");
      const edit = qs.get('edit');
      if (edit === '1') {
        // Wait until user is loaded; effect below will open the modal.
      }
    } catch (e) {
      // ignore
    }
  }, [location]);

  const handleEditProfile = () => {
    if (user) {
      setEditFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || ''
      });
      setNewPhone(user.phone || "");
      setIsEditModalOpen(true);
    }
  };

  useEffect(() => {
    if (!user) return;
    try {
      const qs = new URLSearchParams(window.location.search || "");
      const edit = qs.get('edit');
      const del = qs.get('delete');
      if (edit === '1' && !isEditModalOpen) {
        handleEditProfile();
        try {
          window.history.replaceState(null, '', '/profile');
        } catch (e) {
          // ignore
        }
      }
      if (del === '1' && !isDeleteModalOpen) {
        setIsDeleteModalOpen(true);
        try {
          window.history.replaceState(null, '', '/profile');
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
  }, [user, isEditModalOpen, isDeleteModalOpen]);

  const performProfileUpdate = async () => {
    if (!user) return;

    try {
      console.log('Testing API connection...');
      const healthResponse = await fetch('/api/health');
      if (!healthResponse.ok) {
        throw new Error('API server is not reachable');
      }
      const healthData = await healthResponse.json();
      console.log('API health check:', healthData);

      console.log('Updating profile for user:', user.id);
      console.log('Profile data:', editFormData);

      if (isUpdating) return;
      setIsUpdating(true);

      const requestData = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        phone: editFormData.phone,
        dateOfBirth: editFormData.dateOfBirth,
        address: editFormData.address,
        city: editFormData.city,
        state: editFormData.state,
        pincode: editFormData.pincode
      };

      console.log('Sending PUT request to:', `/api/users/${user.id}`);
      console.log('Request data:', requestData);

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Server returned non-JSON response:", text);
        console.error("This usually means the API route is not being handled by the server");
        setIsUpdating(false);
        throw new Error("API server error: The profile update endpoint is not responding correctly");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      const updatedUser = data.user || data;

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      try {
        window.dispatchEvent(new Event('userUpdated'));
      } catch (e) {
        // ignore
      }
      try {
        window.dispatchEvent(new Event('deliveryAddressesUpdated'));
      } catch (e) {
        // ignore
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });

      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setIsSaving(false);
    }
  };

  const sendPhoneOTP = async () => {
    const targetPhone = newPhone || user?.phone || "";
    const cleanedPhone = formatPhoneNumber(targetPhone);

    if (!cleanedPhone || cleanedPhone.length !== 10) {
      toast({
        title: "Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch("/api/auth/send-mobile-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: cleanedPhone }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "OTP Sent",
          description: "OTP sent to your mobile number.",
        });
        setOtpSent(true);
        setOtpCountdown(60);

        // Fetch OTP for development display (in case SMS gateway fails)
        if (showDevOTP) {
          try {
            const debugResponse = await fetch(`/api/auth/debug-otp/${cleanedPhone}`);
            const debugResult = await debugResponse.json();
            if (debugResult.success && debugResult.otp) {
              setCurrentOTP(debugResult.otp);
            }
          } catch (error) {
            console.log("Could not fetch debug OTP:", error);
          }
        }
      } else {
        toast({
          title: "Error",
          description: result.error || result.message || "Failed to send OTP",
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
      setIsSendingOtp(false);
    }
  };

  const verifyPhoneOTPAndUpdate = async () => {
    const cleanedPhone = formatPhoneNumber(newPhone);

    if (!cleanedPhone || cleanedPhone.length !== 10) {
      toast({
        title: "Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    if (!otp || otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch("/api/auth/verify-mobile-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: cleanedPhone,
          otp,
        }),
      });

      const result = await response.json();

      if (response.ok && result.verified) {
        // After successful OTP verification, update phone number on server
        try {
          if (!user) {
            throw new Error("User not found");
          }

          const requestData = {
            firstName: user.firstName,
            lastName: user.lastName,
            phone: cleanedPhone,
            dateOfBirth: user.dateOfBirth || "",
            address: user.address || "",
            city: user.city || "",
            state: user.state || "",
            pincode: user.pincode || "",
          };

          const response = await fetch(`/api/users/${user.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(requestData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update phone number");
          }

          const data = await response.json();
          const updatedUser = data.user || data;

          setUser(updatedUser);
          try {
            localStorage.setItem("user", JSON.stringify(updatedUser));
          } catch (e) {
            // ignore
          }
          try {
            window.dispatchEvent(new Event('userUpdated'));
          } catch (e) {
            // ignore
          }
          try {
            window.dispatchEvent(new Event('deliveryAddressesUpdated'));
          } catch (e) {
            // ignore
          }

          setIsOtpModalOpen(false);

          toast({
            title: "Verified",
            description: "Your phone number has been updated.",
          });
        } catch (updateError) {
          console.error("Phone update error:", updateError);
          toast({
            title: "Error",
            description:
              updateError instanceof Error
                ? updateError.message
                : "Failed to update phone number. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.error || result.message || "Invalid OTP",
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
      setIsVerifyingOtp(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Phone number cannot be edited directly from this form.
    // It is updated only via the OTP verification flow.
    setIsSaving(true);
    await performProfileUpdate();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">Please log in to view your profile.</p>
            <Link href="/auth/login">
              <Button className="bg-red-600 hover:bg-red-700">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-red-600 hover:text-red-700 mb-4">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Wallet Card */}
          <div className="lg:col-span-1">
           

            {/* Profile Card */}
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarFallback className="text-2xl bg-red-100 text-red-600">
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl">
                  {user.firstName} {user.lastName}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
                
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleEditProfile}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button
                  variant="destructive"
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
             
          </div>

          {/* Account Details */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your personal details and account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <User className="h-4 w-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{user.firstName}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <User className="h-4 w-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{user.lastName}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-4 w-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{user.email}</span>
                    </div>
                  </div>

                  {user.phone && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Phone Number</label>
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Phone className="h-4 w-4 text-gray-400 mr-3" />
                        <span className="text-gray-900">{user.phone}</span>
                      </div>
                    </div>
                  )}

                  {user.dateOfBirth && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                        <span className="text-gray-900">{new Date(user.dateOfBirth).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{user.address || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{user.city || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{user.state || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">PIN Code</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{user.pincode || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Member Since</label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your account and orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/cart">
                    <Button variant="outline" className="w-full justify-start">
                      View Cart
                    </Button>
                  </Link>
                  <Link href="/order-history">
                    <Button variant="outline" className="w-full justify-start">
                      Order History
                    </Button>
                  </Link>
                  <Link href="/wishlist">
                    <Button variant="outline" className="w-full justify-start">
                      My Wishlist
                    </Button>
                  </Link>
                  <Link href="/auth/forgot-password">
                    <Button variant="outline" className="w-full justify-start">
                      Change Password
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" className="w-full justify-start">
                      Contact Support
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    className="w-full justify-start bg-red-600 hover:bg-red-700"
                    onClick={() => setIsDeleteModalOpen(true)}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={editFormData.firstName}
                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={editFormData.lastName}
                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                placeholder="Enter your last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  value={editFormData.phone}
                  readOnly
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                  placeholder="No phone number added"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setNewPhone(editFormData.phone || user.phone || "");
                    setOtp("");
                    setOtpSent(false);
                    setOtpCountdown(0);
                    setIsOtpModalOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Click the edit icon to change your mobile number using OTP verification.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={editFormData.dateOfBirth}
                onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                placeholder="Select your date of birth"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                placeholder="Enter your address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select
                value={editFormData.city}
                onValueChange={(value) => {
                  const cityData = cityLocationMap[value.toLowerCase()];
                  if (cityData) {
                    setEditFormData({ 
                      ...editFormData, 
                      city: value,
                      state: cityData.state,
                      pincode: cityData.pincodes[0] || ''
                    });
                  } else {
                    setEditFormData({ ...editFormData, city: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.keys(cityLocationMap).sort().map((city) => (
                    <SelectItem key={city} value={city}>
                      {city.charAt(0).toUpperCase() + city.slice(1).replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900">
                  {editFormData.state 
                    ? editFormData.state.charAt(0).toUpperCase() + editFormData.state.slice(1).replace(/_/g, ' ')
                    : 'Auto-filled based on city'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">PIN Code</Label>
              <Select
                value={editFormData.pincode}
                onValueChange={(value) => setEditFormData({ ...editFormData, pincode: value })}
                disabled={!editFormData.city || !cityLocationMap[editFormData.city.toLowerCase()]}
              >
                <SelectTrigger>
                  <SelectValue placeholder={editFormData.city ? "Select PIN Code" : "Select city first"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {editFormData.city && cityLocationMap[editFormData.city.toLowerCase()] ? (
                    cityLocationMap[editFormData.city.toLowerCase()].pincodes.map((pincode) => (
                      <SelectItem key={pincode} value={pincode}>
                        {pincode}
                      </SelectItem>
                    ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
          </ScrollArea>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Modal for Phone Change */}
      <Dialog open={isOtpModalOpen} onOpenChange={setIsOtpModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Verify New Mobile Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Enter new phone number */}
            <div className="space-y-2">
              <Label htmlFor="newPhone">New Mobile Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="newPhone"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="pl-10"
                  maxLength={10}
                />
              </div>
            </div>

            {/* OTP section: only after OTP is sent */}
            {otpSent && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit OTP sent to{" "}
                  <span className="font-medium">+91 {formatPhoneNumber(newPhone)}</span>.
                </p>

                <div className="space-y-2">
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

                {/* Development OTP display (for when SMS doesn't arrive) */}
                {showDevOTP && currentOTP && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 text-center">
                      <strong>Development Mode:</strong> Your OTP is{" "}
                      <span className="font-mono font-bold">{currentOTP}</span>
                    </p>
                  </div>
                )}

                {/* Resend OTP */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={sendPhoneOTP}
                    disabled={isSendingOtp || otpCountdown > 0}
                  >
                    {isSendingOtp ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : otpCountdown > 0 ? (
                      `Resend OTP in ${otpCountdown}s`
                    ) : (
                      "Resend OTP"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Send OTP button (shown before OTP is sent) */}
            {!otpSent && (
              <Button
                onClick={sendPhoneOTP}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={
                  isSendingOtp ||
                  !newPhone ||
                  formatPhoneNumber(newPhone).length !== 10
                }
              >
                {isSendingOtp ? "Sending OTP..." : "Send OTP"}
              </Button>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOtpModalOpen(false)}
              disabled={isVerifyingOtp}
            >
              Cancel
            </Button>
            {otpSent && (
              <Button
                onClick={verifyPhoneOTPAndUpdate}
                disabled={isVerifyingOtp || otp.length !== 6}
                className="bg-red-600 hover:bg-red-700"
              >
                {isVerifyingOtp ? "Verifying..." : "Verify & Update"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal (uses same mobile OTP flow) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-700">
              This action will permanently delete your account and cannot be undone.
              To confirm, we will send a verification OTP to your registered mobile
              number{" "}
              <span className="font-medium">
                +91 {formatPhoneNumber(user.phone || "")}
              </span>
              .
            </p>

            {/* OTP section: only after OTP is sent */}
            {otpSent && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-otp">Enter OTP</Label>
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

                {/* {showDevOTP && currentOTP && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 text-center">
                      <strong>Development Mode:</strong> Your OTP is{" "}
                      <span className="font-mono font-bold">{currentOTP}</span>
                    </p>
                  </div>
                )} */}

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={sendPhoneOTP}
                    disabled={isSendingOtp || otpCountdown > 0}
                  >
                    {isSendingOtp ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : otpCountdown > 0 ? (
                      `Resend OTP in ${otpCountdown}s`
                    ) : (
                      "Resend OTP"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {!otpSent && (
              <Button
                onClick={async () => {
                  setNewPhone(user.phone || "");
                  setOtp("");
                  await sendPhoneOTP();
                }}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={
                  isSendingOtp ||
                  !user.phone ||
                  formatPhoneNumber(user.phone).length !== 10
                }
              >
                {isSendingOtp ? "Sending OTP..." : "Send OTP"}
              </Button>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isVerifyingOtp}
            >
              Cancel
            </Button>
            {otpSent && (
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                disabled={isVerifyingOtp || otp.length !== 6}
                onClick={async () => {
                  try {
                    const cleanedPhone = formatPhoneNumber(user.phone || "");
                    if (!cleanedPhone || cleanedPhone.length !== 10) {
                      toast({
                        title: "Error",
                        description:
                          "Your registered mobile number is invalid. Please contact support.",
                        variant: "destructive",
                      });
                      return;
                    }

                    // First verify OTP
                    setIsVerifyingOtp(true);
                    const verifyRes = await fetch(
                      "/api/auth/verify-mobile-otp",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          phoneNumber: cleanedPhone,
                          otp,
                        }),
                      }
                    );
                    const verifyData = await verifyRes.json();
                    if (!verifyRes.ok || !verifyData.verified) {
                      toast({
                        title: "Error",
                        description:
                          verifyData.error ||
                          verifyData.message ||
                          "Invalid OTP",
                        variant: "destructive",
                      });
                      setIsVerifyingOtp(false);
                      return;
                    }

                    // OTP ok -> delete account
                    const deleteRes = await fetch(
                      `/api/users/${user.id}`,
                      {
                        method: "DELETE",
                        headers: {
                          "Authorization": `Bearer ${localStorage.getItem(
                            "token"
                          )}`,
                        },
                      }
                    );
                    const deleteData = await deleteRes.json();
                    if (!deleteRes.ok || !deleteData.success) {
                      throw new Error(
                        deleteData.error || "Failed to delete account"
                      );
                    }

                    // Clear local auth and redirect
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    toast({
                      title: "Account Deleted",
                      description:
                        "Your account has been deleted successfully.",
                    });
                    window.location.href = "/";
                  } catch (error) {
                    console.error("Delete account error:", error);
                    toast({
                      title: "Error",
                      description:
                        error instanceof Error
                          ? error.message
                          : "Failed to delete account. Please try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsVerifyingOtp(false);
                  }
                }}
              >
                {isVerifyingOtp ? "Deleting..." : "Confirm Delete"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}