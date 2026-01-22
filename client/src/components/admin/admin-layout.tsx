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
  ChevronDown,
  FileText,
  Images,
  Sparkles,
  MessageSquare,
  Briefcase,
  MapPin,
  Mail,
  Palette,
  Wallet,
  Tag, // Added Tag icon for promo codes
  Gift, // Added Gift icon for gift settings
  Shield // Added Shield icon for master admin
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
import { getCurrentUser } from '@/lib/utils';

// Helper function to check if user has access to a route
const hasAccess = (route: string, userRole: string): boolean => {
  const ROLE_PERMISSIONS: Record<string, string[]> = {
    dashboard: ['master_admin', 'admin', 'ecommerce', 'marketing', 'digital_marketing', 'hr', 'account'],
    notifications: ['master_admin', 'admin'],
    categories: ['master_admin', 'admin', 'ecommerce'],
    products: ['master_admin', 'admin', 'ecommerce'],
    orders: ['master_admin', 'admin', 'ecommerce'],
    customers: ['master_admin', 'admin', 'ecommerce', 'marketing'],
    announcements: ['master_admin', 'admin', 'marketing'],
    shades: ['master_admin', 'admin', 'ecommerce'],
    sliders: ['master_admin', 'admin', 'digital_marketing'],
    stores: ['master_admin', 'admin', 'ecommerce'],
    'contact-submissions': ['master_admin', 'admin', 'marketing'],
    testimonials: ['master_admin', 'admin', 'digital_marketing'],
    'video-testimonials': ['master_admin', 'admin', 'digital_marketing'],
    'influencer-videos': ['master_admin', 'admin', 'digital_marketing'],
    'affiliate-videos': ['master_admin', 'admin', 'digital_marketing'],
    'channel-partner-videos': ['master_admin', 'admin', 'digital_marketing'],
    blog: ['master_admin', 'admin', 'digital_marketing'],
    combos: ['master_admin', 'admin', 'ecommerce'],
    'combo-sliders': ['master_admin', 'admin', 'ecommerce'],
    'job-positions': ['master_admin', 'admin', 'hr'],
    'job-applications': ['master_admin', 'admin', 'hr'],
    'influencer-applications': ['master_admin', 'admin', 'digital_marketing'],
    'affiliate-applications': ['master_admin', 'admin', 'marketing'],
    'affiliate-withdrawals': ['master_admin', 'admin', 'account'],
    'promo-codes': ['master_admin'],
    'promo-code-usage': ['master_admin'],
    'gift-settings': ['master_admin'],
    offers: ['master_admin', 'admin', 'marketing'],
    contests: ['master_admin', 'admin', 'marketing'],
    media: ['master_admin', 'admin', 'digital_marketing'],
    settings: ['master_admin']
  };

  const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
  const permissions = ROLE_PERMISSIONS[cleanRoute];
  return permissions ? permissions.includes(userRole) : false;
};

const sidebarItems = [
  {
    title: "Dashboard",
    href: "",
    icon: LayoutDashboard,
    badge: null,
    requiredRole: 'dashboard'
  },
  {
    title: "Categories",
    href: "/categories",
    icon: FolderTree,
    badge: null,
    requiredRole: 'categories'
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
    requiredRole: 'products'
  },
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
    requiredRole: 'orders'
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    requiredRole: 'customers'
  },
  {
      title: "Notifications",
      href: "/notifications",
      icon: MessageSquare,
      badge: null,
      requiredRole: 'notifications'
    },
  {
    title: "Announcements",
    href: "/announcements",
    icon: Bell,
    badge: null,
    requiredRole: 'announcements'
  },
  {
    title: "Shades",
    href: "/shades",
    icon: Palette,
    badge: null,
    requiredRole: 'shades'
  },
  {
    title: "Sliders",
    href: "/sliders",
    icon: Images,
    badge: null,
    requiredRole: 'sliders'
  },
  {
    title: "Stores",
    href: "/stores",
    icon: MapPin,
    badge: null,
    requiredRole: 'stores'
  },
  {
    title: "Contact Submissions",
    href: "/contact-submissions",
    icon: Mail,
    badge: null,
    requiredRole: 'contact-submissions'
  },
  {
    title: "Testimonials",
    href: "/testimonials",
    icon: User,
    badge: null,
    requiredRole: 'testimonials'
  },
  {
    title: "UGC Video",
    href: "/video-testimonials",
    icon: FileText,
    badge: null,
    requiredRole: 'video-testimonials'
  },
  {
    title: "Influencer Videos",
    href: "/influencer-videos",
    icon: FileText,
    badge: null,
    requiredRole: 'influencer-videos'
  },
  {
    title: "Affiliate Videos",
    href: "/affiliate-videos",
    icon: FileText,
    badge: null,
    requiredRole: 'affiliate-videos'
  },
  {
    title: "Channel Partner Videos",
    href: "/channel-partner-videos",
    icon: FileText,
    badge: null,
    requiredRole: 'channel-partner-videos'
  },
  {
    title: "Blog",
    href: "/blog",
    icon: FileText,
    badge: null,
    requiredRole: 'blog'
  },
  {
    title: "Combos",
    href: "/combos",
    icon: Package,
    badge: null,
    requiredRole: 'combos'
  },
  {
    title: "Combo Sliders",
    href: "/combo-sliders",
    icon: Images,
    badge: null,
    requiredRole: 'combo-sliders'
  },
  {
    title: "Job Positions",
    href: "/job-positions",
    icon: Briefcase,
    badge: null,
    requiredRole: 'job-positions'
  },
  {
    title: "Job Applications",
    href: "/job-applications",
    icon: Briefcase,
    badge: null,
    requiredRole: 'job-applications'
  },
  // {
  //   title: "Influencer Applications",
  //   href: "/influencer-applications",
  //   icon: Users,
  //   badge: null,
  //   requiredRole: 'influencer-applications'
  // },
  {
    title: "Affiliate Applications",
    href: "/affiliate-applications",
    icon: Users,
    badge: null,
    requiredRole: 'affiliate-applications'
  },
  {
    title: "Affiliate Withdrawals",
    href: "/affiliate-withdrawals",
    icon: Wallet,
    badge: null,
    requiredRole: 'affiliate-withdrawals'
  },
  {
    title: "Promo Codes",
    href: "/promo-codes",
    icon: Tag,
    badge: null,
    requiredRole: 'promo-codes'
  },
  {
    title: "Promo Usage",
    href: "/promo-code-usage",
    icon: Tag,
    badge: null,
    requiredRole: 'promo-code-usage'
  },
  {
    title: "Gift Settings",
    href: "/gift-settings",
    icon: Gift,
    badge: null,
    requiredRole: 'gift-settings'
  },
  {
    title: "Offers",
    href: "/offers",
    icon: Sparkles,
    badge: null,
    requiredRole: 'offers'
  },
  {
    title: "Contests",
    href: "/contests",
    icon: Sparkles,
    badge: null,
    requiredRole: 'contests'
  },
  {
    title: "Media",
    href: "/media",
    icon: Images,
    badge: null,
    requiredRole: 'media'
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    badge: null,
    requiredRole: 'settings'
  },
];

// Master Admin only items
const masterAdminItems = [
  {
    title: "Master Dashboard",
    href: "/master",
    icon: Shield,
    badge: null,
    requiredRole: 'master'
  },
  {
    title: "User Management",
    href: "/master/users",
    icon: Users,
    badge: null,
    requiredRole: 'master/users'
  },
  {
    title: "System Settings",
    href: "/master/settings",
    icon: Settings,
    badge: null,
    requiredRole: 'master/settings'
  },
  {
    title: "Activity Logs",
    href: "/master/logs",
    icon: Activity,
    badge: null,
    requiredRole: 'master/logs'
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [allowedModules, setAllowedModules] = useState<Set<string> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Check authentication on component mount
  useEffect(() => {
    // Skip auth check if we're on the admin login page
    if (location === '/auth/admin-login') {
      setIsAuthenticating(false);
      return;
    }

    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        console.log('No token or user found, redirecting to admin login');
        setLocation('/auth/admin-login');
        return;
      }

      try {
        const user = JSON.parse(userStr);

        // Check if user has any admin role
        const adminRoles = ['admin', 'master_admin', 'ecommerce', 'marketing', 'digital_marketing', 'hr', 'account'];
        if (!adminRoles.includes(user.role)) {
          console.log('User does not have admin role, redirecting to home page');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setLocation('/');
          return;
        }

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
        if (!adminRoles.includes(validationResult.user.role)) {
          console.log('User role is not valid admin role, redirecting to home page');
          setLocation('/');
          return;
        }

        // User is authenticated
        setIsAuthenticating(false);

        // Fetch effective permissions for this user (best-effort). Store a set of allowed modules.
        try {
          const token = localStorage.getItem('token');
          const currentUser = getCurrentUser();
          const userId = currentUser?.id || currentUser?.userId || currentUser?.ID || null;
          if (token && userId) {
            const permResp = await fetch(`/api/master-admin/users/${userId}/permissions`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (permResp.ok) {
              const permData = await permResp.json();

              // If permissions array is empty, treat it as "no permissions configured"
              // and fallback to the built-in ROLE_PERMISSIONS logic instead of
              // persisting an empty allowedModules set which would block access.
              if (!Array.isArray(permData.permissions) || permData.permissions.length === 0) {
                try { localStorage.removeItem('allowedModules'); } catch {}
                setAllowedModules(null);
              } else {
                const modules = new Set<string>();
                permData.permissions.forEach((p: any) => {
                  if (p.canRead || p.canCreate || p.canUpdate || p.canDelete || p.canExport) {
                    modules.add(p.module);
                  }
                });
                try { localStorage.setItem('allowedModules', JSON.stringify(Array.from(modules))); } catch {}
                setAllowedModules(modules);
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch user permissions', e);
        }
      } catch (error) {
        console.error('Auth validation error:', error);
        // On error, remove token and redirect to admin login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLocation('/auth/admin-login');
      }
    };

    checkAuth();
  }, [setLocation, location]);

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
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-custom">
              {/* Master Admin Section (mobile) - show at top */}
              {(() => {
                const user = getCurrentUser();
                if (user) {
                  try {
                    const showMasterSection = user.role === 'master_admin' || (allowedModules && masterAdminItems.some(mi => allowedModules.has(mi.requiredRole)));
                    if (showMasterSection) {
                      return (
                        <>
                          <div className="px-3 py-2 mb-2">
                            {!sidebarCollapsed && (
                              <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                                <Shield className="h-4 w-4" />
                                <span>Master Admin</span>
                              </div>
                            )}
                          </div>
                          {masterAdminItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location === item.href;
                            return (
                              <Link
                                key={`mobile-${item.href}`}
                                to={item.href}
                                className={cn(
                                  "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                                  isActive
                                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
                                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                )}
                              >
                                <Icon className={cn("flex-shrink-0 transition-colors w-5 h-5 mr-4")} />
                                <span className="flex-1">{item.title}</span>
                              </Link>
                            );
                          })}
                        </>
                      );
                    }
                  } catch (error) {
                    console.error('Error parsing user data:', error);
                  }
                }
                return null;
              })()}

              {sidebarItems.filter((item) => {
                    const user = getCurrentUser();
                    if (!user) return false;
                    try {
                      // If we have fetched allowedModules, prefer that set for access decisions
                      if (allowedModules) {
                        return allowedModules.has(item.requiredRole || item.href);
                      }
                      return hasAccess(item.requiredRole || item.href, user.role);
                    } catch {
                      return false;
                    }
                  }).map((item) => {
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
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-custom">
          {/* Master Admin Section (desktop) - show at top */}
          {(() => {
            const user = getCurrentUser();
            if (user) {
              try {
                const showMasterSection = user.role === 'master_admin' || (allowedModules && masterAdminItems.some(mi => allowedModules.has(mi.requiredRole)));
                if (showMasterSection) {
                  return (
                    <>
                      <div className="px-3 py-2 mb-4">
                        {!sidebarCollapsed && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                            <Shield className="h-4 w-4" />
                            <span>Master Admin</span>
                          </div>
                        )}
                      </div>
                      {masterAdminItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location === item.href;

                        return (
                          <Link
                            key={`desktop-${item.href}`}
                            to={item.href}
                            className={cn(
                              "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                              isActive
                                ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30 shadow-lg"
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
                    </>
                  );
                }
              } catch (error) {
                console.error('Error parsing user data:', error);
              }
            }
            return null;
            
          })()}




          {/* Regular Admin Section Header */}
          <div className="px-3 py-2 mt-4">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 text-xs  font-semibold text-slate-400 uppercase tracking-wider">
                <LayoutDashboard className="h-4 w-4  text-xs font-semibold text-purple-400" />
                <span className=" text-xs font-semibold text-purple-400 text-xs  font-semibold">Admin Panel</span>
              </div>
            )}
          </div>

          {/* Regular Admin Items */}
          {sidebarItems.filter((item) => {
            const user = getCurrentUser();
            if (!user) return false;
            try {
              if (allowedModules) return allowedModules.has(item.requiredRole || item.href);
              return hasAccess(item.requiredRole || item.href, user.role);
            } catch {
              return false;
            }
          }).map((item) => {
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

          {/* Master Admin section moved above regular items */}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-700/50">
          {/* <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-slate-300 hover:bg-slate-700/50 hover:text-white",
              sidebarCollapsed ? "px-3" : "justify-start"
            )}
          >
            <LogOut className={cn("transition-colors", sidebarCollapsed ? "w-5 h-5" : "w-4 h-4 mr-3")} />
            {!sidebarCollapsed && "Logout"}
          </Button> */}
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
                    <div className="w-9 h-9 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-md">
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
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
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