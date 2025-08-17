import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings,
  FolderTree,
  Menu,
  X,
  Search,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Activity,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AdminSearchCommand from "./admin-search-command";
import { cn } from "@/lib/utils";
import { Images } from 'lucide-react';
import { Mail } from "lucide-react";
import { Palette } from "lucide-react";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "",
    icon: LayoutDashboard,
    badge: null,
  },


  {
    title: "Categories",
    href: "/categories",
    icon: FolderTree,
    badge: null,
  },
    {
    title: "Products",
    href: "/products",
    icon: Package,
    badge: "127",
  },
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
    badge: "8",
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    badge: "1.2k",
  },
  {
    title: "Shades",
    href: "/shades",
    icon: Palette,
    badge: null,
  },
  {
    title: "Sliders",
    href: "/sliders",
    icon: Images,
    badge: null,
  },
  {
    title: "Contact Submissions",
    href: "/contact-submissions",
    icon: Mail,
    badge: null,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    badge: null,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      // If no token or user data, redirect to admin login
      if (!token || !userStr) {
        console.log('No authentication found, redirecting to admin login');
        setLocation('/auth/admin-login');
        return;
      }

      let user;
      try {
        user = JSON.parse(userStr);
      } catch (error) {
        console.log('Invalid user data, redirecting to admin login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLocation('/auth/admin-login');
        return;
      }

      // Check if user is admin
      if (user.role !== 'admin') {
        console.log('User is not admin, redirecting to home page');
        setLocation('/');
        return;
      }

      try {
        // Validate token with server
        const response = await fetch('/api/auth/validate', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          console.log('Token validation failed, redirecting to admin login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setLocation('/auth/admin-login');
          return;
        }

        const validationResult = await response.json();

        // Double check role from server response
        if (validationResult.user.role !== 'admin') {
          console.log('User role is not admin, redirecting to home page');
          setLocation('/');
          return;
        }

        // User is authenticated
        setIsAuthenticating(false);
      } catch (error) {
        console.error('Auth validation error:', error);
        // On error, remove token and redirect to admin login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLocation('/auth/admin-login');
      }
    };

    checkAuth();
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setLocation('/auth/admin-login');
  };

  // Global keyboard shortcut for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle search opening
  const handleSearchOpen = () => {
    console.log('Opening search dialog');
    setIsSearchOpen(true);
  };

  // Show loading screen while authenticating
  if (isAuthenticating) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen", darkMode ? "dark" : "")}>
      {/* Mobile sidebar overlay */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800">
            {/* Mobile Logo */}
            <div className="flex items-center justify-center h-20 px-4 border-b border-slate-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Beauty Admin</h1>
                  <p className="text-xs text-slate-400">v2.0 Dashboard</p>
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-white border border-pink-500/30 shadow-lg"
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                    )}
                  >
                    <Icon className={cn("flex-shrink-0 transition-colors w-5 h-5 mr-4")} />
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto bg-slate-700 text-slate-300 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="px-3 py-4 border-t border-slate-700/50">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full text-slate-300 hover:bg-slate-700/50 hover:text-white justify-start"
              >
                <LogOut className="transition-colors w-4 h-4 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar */}
      <div className={cn(
        "flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-72"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-center h-20 px-4 border-b border-slate-700/50">
          {!sidebarCollapsed ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Beauty Admin</h1>
                <p className="text-xs text-slate-400">v2.0 Dashboard</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-white border border-pink-500/30 shadow-lg"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                )}
              >
                <Icon className={cn("flex-shrink-0 transition-colors", sidebarCollapsed ? "w-6 h-6" : "w-5 h-5 mr-4")} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto bg-slate-700 text-slate-300 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-700/50">
          <Button 
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-slate-300 hover:bg-slate-700/50 hover:text-white",
              sidebarCollapsed ? "px-3" : "justify-start"
            )}
          >
            <LogOut className={cn("transition-colors", sidebarCollapsed ? "w-5 h-5" : "w-4 h-4 mr-3")} />
            {!sidebarCollapsed && "Logout"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/60">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-slate-600 hover:text-slate-900"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products, orders, customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 border-slate-200/60 placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    setIsSearchOpen(true);
                  }
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    setIsSearchOpen(true);
                  }
                }}
                onFocus={() => {
                  if (searchTerm.trim()) {
                    setIsSearchOpen(true);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 border-l border-slate-200 pl-4 h-auto p-2">
                  <div className="relative">
                    <div className="w-9 h-9 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-md">
                      {(() => {
                        const userStr = localStorage.getItem('user');
                        if (userStr) {
                          try {
                            const user = JSON.parse(userStr);
                            if (user.firstName && user.lastName) {
                              return (
                                <span className="text-white text-sm font-medium">
                                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </span>
                              );
                            } else if (user.name) {
                              const names = user.name.split(' ');
                              return (
                                <span className="text-white text-sm font-medium">
                                  {names[0].charAt(0)}{names[1] ? names[1].charAt(0) : ''}
                                </span>
                              );
                            } else if (user.email) {
                              return (
                                <span className="text-white text-sm font-medium">
                                  {user.email.charAt(0).toUpperCase()}
                                </span>
                              );
                            }
                          } catch (error) {
                            // fallback to icon
                          }
                        }
                        return <User className="h-5 w-5 text-white" />;
                      })()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-slate-900">
                      {(() => {
                        const userStr = localStorage.getItem('user');
                        if (userStr) {
                          try {
                            const user = JSON.parse(userStr);
                            return user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : user.name || user.email || 'Admin User';
                          } catch (error) {
                            return 'Admin User';
                          }
                        }
                        return 'Admin User';
                      })()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(() => {
                        const userStr = localStorage.getItem('user');
                        if (userStr) {
                          try {
                            const user = JSON.parse(userStr);
                            return user.role === 'admin' ? 'Super Admin' : 'Admin';
                          } catch (error) {
                            return 'Admin';
                          }
                        }
                        return 'Admin';
                      })()}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100/50">
          {children}
        </main>

        {/* Global Search Command */}
        <AdminSearchCommand 
          open={isSearchOpen} 
          onOpenChange={(open) => {
            setIsSearchOpen(open);
            if (!open) {
              setSearchTerm("");
            }
          }}
          initialQuery={searchTerm}
        />
      </div>
    </div>
  );
}