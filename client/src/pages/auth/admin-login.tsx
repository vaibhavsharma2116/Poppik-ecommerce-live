
// import { useState } from "react";
// import { Link } from "wouter";
// import { Eye, EyeOff, Mail, Lock, Shield, User } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";

// export default function AdminLogin() {
//   const [showPassword, setShowPassword] = useState(false);
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//     rememberMe: false
//   });

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     try {
//       const response = await fetch("/api/auth/admin-login", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(formData),
//       });
      
//       const data = await response.json();
      
//       if (response.ok) {
//         // Store admin token in localStorage
//         localStorage.setItem("adminToken", data.token);
//         localStorage.setItem("adminUser", JSON.stringify(data.user));
        
//         alert("Admin login successful!");
//         window.location.href = "/admin"; // Redirect to admin dashboard
//       } else {
//         alert(data.error || "Invalid admin credentials");
//       }
//     } catch (error) {
//       console.error("Admin login error:", error);
//       alert("Failed to login. Please try again.");
//     }
//   };

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value, type, checked } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: type === 'checkbox' ? checked : value
//     }));
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
//       <div className="w-full max-w-md">
//         <div className="text-center mb-8">
//           <Link href="/">
//             <h1 className="text-3xl font-bold text-white mb-2">Poppik Admin</h1>
//           </Link>
//           <p className="text-slate-300">Secure admin portal access</p>
//         </div>

//         <Card className="shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
//           <CardHeader className="space-y-1">
//             <CardTitle className="text-2xl font-bold text-center text-white flex items-center justify-center gap-2">
//               <Shield className="h-6 w-6 text-purple-400" />
//               Admin Portal
//             </CardTitle>
//             <CardDescription className="text-center text-slate-300">
//               Enter your admin credentials to access the dashboard
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div className="space-y-2">
//                 <Label htmlFor="email" className="text-slate-200">Admin Email</Label>
//                 <div className="relative">
//                   <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
//                   <Input
//                     id="email"
//                     name="email"
//                     type="email"
//                     placeholder="Enter your admin email"
//                     value={formData.email}
//                     onChange={handleInputChange}
//                     className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-400"
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="password" className="text-slate-200">Password</Label>
//                 <div className="relative">
//                   <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
//                   <Input
//                     id="password"
//                     name="password"
//                     type={showPassword ? "text" : "password"}
//                     placeholder="Enter your password"
//                     value={formData.password}
//                     onChange={handleInputChange}
//                     className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-400"
//                     required
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
//                   >
//                     {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                   </button>
//                 </div>
//               </div>

//               <div className="flex items-center justify-between">
//                 <div className="flex items-center space-x-2">
//                   <input
//                     type="checkbox"
//                     id="rememberMe"
//                     name="rememberMe"
//                     checked={formData.rememberMe}
//                     onChange={handleInputChange}
//                     className="rounded border-slate-600 bg-slate-700"
//                   />
//                   <Label htmlFor="rememberMe" className="text-sm text-slate-300">Remember me</Label>
//                 </div>
//                 <Link href="/auth/admin-forgot-password" className="text-sm text-purple-400 hover:text-purple-300">
//                   Forgot password?
//                 </Link>
//               </div>

//               <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
//                 <Shield className="h-4 w-4 mr-2" />
//                 Sign In to Admin Portal
//               </Button>
//             </form>

//             <Separator className="bg-slate-600" />

//             <div className="text-center">
//               <span className="text-slate-400">Need admin access? </span>
//               <Link href="/contact" className="text-purple-400 hover:text-purple-300 font-medium">
//                 Contact IT Support
//               </Link>
//             </div>

//             <div className="text-center">
//               <Link href="/auth/login" className="text-sm text-slate-400 hover:text-slate-200">
//                 ← Back to User Login
//               </Link>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Security Notice */}
//         <div className="mt-6 text-center">
//           <p className="text-xs text-slate-400">
//             This is a secure admin portal. All login attempts are monitored and logged.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }
