import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, Menu, X, User, Heart, LogOut, ChevronDown, ChevronRight, Wallet, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import SearchCommand from "@/components/search-command";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import type { Category, Subcategory, Product } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/logo.png";
import headerLogo from "@/assets/POPPIK LOGO.jpg";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import AnnouncementBar from "@/components/announcement-bar";
import loUntitled_design from "@/assets/Untitled_design.png.webp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";
import { NotificationPopup } from "./notification-popup";
import { TooltipProvider } from "@radix-ui/react-tooltip";


interface LayoutProps {
  children: React.ReactNode;
}

// WhatsApp Floating Button Component
function WhatsAppButton() {
  const handleWhatsAppClick = () => {
    const phoneNumber = "+918976261444";
    const message = "Hi! I'm interested in your beauty products. Can you help me?";
    const whatsappUrl = `https://wa.me/${phoneNumber.replace("+", "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleWhatsAppClick}
        className="text-white p-2 rounded-full"
        title="Chat with us on WhatsApp"
      >
        <img
          src={loUntitled_design}
          alt="Chat with us"
          className="w-16 h-16 rounded-full object-cover hover:scale-110 transition-transform duration-300"
          width={64}
          height={64}
        />
      </button>
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const [isSearchCommandOpen, setIsSearchCommandOpen] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(true); // State to control notification popup visibility

  const getCategoryName = (p: any) => {
    try {
      const c = p?.category;
      if (!c) return '';
      if (typeof c === 'string') return c;
      return c?.name || '';
    } catch {
      return '';
    }
  };

  // Helper function to get user initials
  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [location] = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State to manage mobile menu visibility

  // Search functionality
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery<Product[]>({
    queryKey: ["/api/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: searchQuery.trim().length > 0,
  });

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.trim().length > 0);
  };

  const handleSearchResultClick = (productSlug: string) => {
    setSearchQuery("");
    setShowSearchResults(false);
    window.location.href = `/product/${productSlug}`;
  };

  const handleSearchInputFocus = () => {
    if (searchQuery.trim().length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleSearchInputBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    // Load initial cart count
    const savedCartCount = localStorage.getItem("cartCount");
    if (savedCartCount) {
      setCartCount(parseInt(savedCartCount));
    }

    // Load initial wishlist count
    const savedWishlist = localStorage.getItem("wishlist");
    if (savedWishlist) {
      try {
        const wishlist = JSON.parse(savedWishlist);
        setWishlistCount(wishlist.length);
      } catch (error) {
        console.error("Error parsing wishlist data:", error);
      }
    }
  }, []);

  useEffect(() => {
    // Listen for cart updates
    const handleCartUpdate = () => {
      const updatedCartCount = localStorage.getItem("cartCount");
      if (updatedCartCount) {
        setCartCount(parseInt(updatedCartCount));
      }
    };

    // Listen for wishlist updates
    const handleWishlistUpdate = () => {
      const updatedWishlist = localStorage.getItem("wishlist");
      if (updatedWishlist) {
        try {
          const wishlist = JSON.parse(updatedWishlist);
          setWishlistCount(wishlist.length);
        } catch (error) {
          console.error("Error parsing wishlist data:", error);
          setWishlistCount(0);
        }
      } else {
        setWishlistCount(0);
      }
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    window.addEventListener("wishlistUpdated", handleWishlistUpdate);
    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdate);
      window.removeEventListener("wishlistUpdated", handleWishlistUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/";
  };

  // Fetch categories and subcategories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, subcategoriesRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/subcategories')
        ]);

        if (categoriesRes.ok && subcategoriesRes.ok) {
          const [categoriesData, subcategoriesData] = await Promise.all([
            categoriesRes.json(),
            subcategoriesRes.json()
          ]);

          // Ensure data is an array and filter only active items
          const categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];
          const subcategoriesArray = Array.isArray(subcategoriesData) ? subcategoriesData : [];

          setCategories(categoriesArray.filter((cat: Category) => cat.status === 'Active'));
          setSubcategories(subcategoriesArray.filter((sub: Subcategory) => sub.status === 'Active'));
        }
      } catch (error) {
        console.error('Failed to fetch navigation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get subcategories for a specific category
  const getSubcategoriesForCategory = (categoryId: number) => {
    return subcategories.filter(sub => sub.categoryId === categoryId);
  };

  const staticNavItems = [
    { name: "Home", href: "/" },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchCommandOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch wallet data
  const { data: walletData, refetch: refetchWallet } = useQuery({
    queryKey: ['/api/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/wallet?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch wallet');
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Listen for wallet update events
  useEffect(() => {
    const handleWalletUpdate = () => {
      refetchWallet();
    };

    window.addEventListener('walletUpdated', handleWalletUpdate);
    return () => {
      window.removeEventListener('walletUpdated', handleWalletUpdate);
    };
  }, [refetchWallet]);

  // Fetch affiliate wallet data
  const { data: affiliateWallet, refetch: refetchAffiliateWallet } = useQuery({
    queryKey: ['/api/affiliate/wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/affiliate/wallet?userId=${user.id}`);
      if (!res.ok) return null;
      const data = await res.json();
      console.log('Affiliate wallet data:', data);
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0, // Always consider data stale
  });

  // Listen for affiliate wallet update events
  useEffect(() => {
    const handleAffiliateWalletUpdate = () => {
      refetchAffiliateWallet();
    };

    window.addEventListener('affiliateWalletUpdated', handleAffiliateWalletUpdate);
    return () => {
      window.removeEventListener('affiliateWalletUpdated', handleAffiliateWalletUpdate);
    };
  }, [refetchAffiliateWallet]);

  // Check if user is an approved affiliate
  const { data: affiliateApplication } = useQuery({
    queryKey: ['/api/affiliate/my-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/affiliate/my-application?userId=${user.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  const isApprovedAffiliate = affiliateApplication?.status === 'approved';

  return (
    <TooltipProvider>
      {showNotificationPopup && <NotificationPopup onClose={() => setShowNotificationPopup(false)} />}
      <div className="min-h-screen bg-white">
      {/* Announcement Bar */}
      <AnnouncementBar />

      {/* Header */}
      <header className="sticky top-0 bg-white shadow-lg z-50">
        {/* Main Header */}
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Desktop and Tablet Layout */}
            <div className="hidden md:flex items-center justify-between w-full">
              {/* Left - Social Media Links */}
              <div className="flex items-center space-x-3 lg:space-x-4">
                <a
                  href="https://www.facebook.com/share/17jwSeQ3yU/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-blue-500 transition-colors duration-300 transform hover:scale-110"
                  title="Follow us on Facebook"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/poppik_lifestyle?igsh=Yzlocmpnc3lobTd5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-pink-300 transition-colors duration-300 transform hover:scale-110"
                  title="Follow us on Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://whatsapp.com/channel/0029Vb6Zmsh1yT214jsWqS3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-green-500 transition-colors duration-300 transform hover:scale-110"
                  title="Join our WhatsApp Channel"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/company/poppik-lifestyle/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-blue-600 transition-colors duration-300 transform hover:scale-110"
                  title="Connect with us on LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a
                  href="https://x.com/poppikofficial?t=WXkmP_f22BOWpfaCjGG_oA&s=09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-gray-800 transition-colors duration-300 transform hover:scale-110"
                  title="Follow us on X (Twitter)"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.244H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href="https://youtube.com/@poppik_official?si=0s1cFXQHWo4toy2f"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-red-500 transition-colors duration-300 transform hover:scale-110"
                  title="Subscribe to our YouTube channel"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>

              </div>

              {/* Left Spacer */}
              <div className="flex-1"></div>
              {/* Center Logo */}
              <Link href="/" className="flex-shrink-0">
                <div className="flex items-center cursor-pointer hover:scale-105 transition-transform duration-300">
                  <img
                    src={headerLogo}
                    alt="POPPIK LIFESTYLE"
                    className="h-8 w-auto md:h-10 lg:h-12 xl:h-14 object-contain mt-2"
                    style={{ aspectRatio: '240 / 56' }}
                    width={240}
                    height={56}
                  />
                </div>
              </Link>

              {/* Right Spacer */}
              <div className="flex-1"></div>
            </div>

            {/* Mobile Layout - Left: Menu, Center: Logo, Right: Search & Cart Icons */}
            <div className="md:hidden flex items-center justify-between w-full px-2">
              {/* Left - Mobile Menu */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-black hover:text-yellow-300 hover:bg-white/20 transition-all duration-300 h-10 w-10" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0 overflow-hidden">
                  {/* Mobile Menu Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-pink-50 border-b border-gray-100">
                    <div className="flex items-center">
                      <h2 className="font-semibold text-gray-800">Menu</h2>
                    </div>
                  </div>

                  {/* Mobile Menu Content */}
                  <ScrollArea className="flex-1 h-[calc(65vh)]">
                    <div className="px-4 py-4 space-y-1">
                      {/* A. Home */}
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                        Navigation
                      </div>
                      <Link
                        href="/"
                        className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          isActiveLink("/")
                            ? "bg-red-500 text-black shadow-md"
                            : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Home
                      </Link>

                      {/* B. Categories Section */}
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-3 px-3">
                        Categories
                      </div>
                      <Accordion type="single" collapsible className="w-full space-y-2">
                        {categories.map((category) => {
                          const categorySubcategories = getSubcategoriesForCategory(category.id);

                          if (categorySubcategories.length > 0) {
                            return (
                              <AccordionItem
                                key={category.id}
                                value={`category-${category.id}`}
                                className="border-0 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                              >
                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 rounded-xl">
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                      <span className={`font-medium ${
                                        isActiveLink(`/category/${category.slug}`)
                                          ? "text-red-600"
                                          : "text-gray-800"
                                      }`}>
                                        {category.name}
                                      </span>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-3">
                                  <div className="space-y-1 ml-5 pl-3 border-l-2 border-red-100">
                                    {categorySubcategories.map((subcategory) => (
                                      <Link
                                        key={subcategory.id}
                                        href={`/category/${category.slug}?subcategory=${subcategory.slug}`}
                                        className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                                        onClick={() => {
                                          setIsMobileMenuOpen(false);
                                          setTimeout(() => {
                                            window.location.href = `/category/${category.slug}?subcategory=${subcategory.slug}`;
                                          }, 100);
                                        }}
                                      >
                                        {subcategory.name}
                                      </Link>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          } else {
                            return (
                              <div key={category.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                <Link
                                  href={`/category/${category.slug}`}
                                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                                    isActiveLink(`/category/${category.slug}`)
                                      ? "bg-red-500 text-black shadow-md"
                                      : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                                  }`}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                  {category.name}
                                </Link>
                              </div>
                            );
                          }
                        })}
                      </Accordion>

                      {/* C. Combo */}
                      <Link
                        href="/combo"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          isActiveLink('/combo')
                            ? 'bg-red-500 text-black shadow-md'
                            : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                        }`}
                      >
                        Combo
                      </Link>

                      {/* D. Offer */}
                      <Link
                        href="/offers"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          isActiveLink('/offers')
                            ? 'bg-red-500 text-black shadow-md'
                            : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                        }`}
                      >
                        Offer
                      </Link>

                      {/* E. Design Your Beauty Kit */}
                      <Accordion type="single" collapsible className="w-full space-y-2">
                        <AccordionItem value="beauty-kit" className="border-0 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                              <span className="font-medium text-gray-800">Design Your Beauty Kit</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-3">
                            <div className="space-y-1 ml-5 pl-3 border-l-2 border-red-100">
                              <Link
                                href="/beauty-kit/micro"
                                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Micro
                              </Link>
                              <Link
                                href="/beauty-kit/small"
                                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Small
                              </Link>
                              <Link
                                href="/beauty-kit/medium"
                                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Medium
                              </Link>
                              <Link
                                href="/beauty-kit/large"
                                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                Large
                              </Link>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      {/* F. Contest */}
                      <Link
                        href="/contest"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          isActiveLink('/contest')
                            ? 'bg-red-500 text-black shadow-md'
                            : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                        }`}
                      >
                        Contest
                      </Link>
                    </div>

                    {/* G. Account Section */}
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                        Account
                      </div>
                      <div className="space-y-2">
                        {user ? (
                          <>
                            {/* My Profile with nested items */}
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem
                                key="profile"
                                value="profile"
                                className="border-0 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                              >
                                <AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-gray-50 rounded-xl">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-full">
                                      <User className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="text-sm font-medium text-gray-900">My Profile</div>
                                      <div className="text-xs text-gray-500">{user.firstName}</div>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-3">
                                  <div className="space-y-1 ml-5 pl-3 border-l-2 border-blue-100">
                                    <Link
                                      href="/profile"
                                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      Profile Settings
                                    </Link>
                                    {/* Cashback Wallet for all users */}
                                    <Link
                                      href="/wallet"
                                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      Cashback Wallet
                                    </Link>
                                    <Link
                                      href="/profile?delete=1"
                                      className="block px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      Delete Account
                                    </Link>
                                    {isApprovedAffiliate && (
                                      <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="affiliate" className="border-0">
                                          <AccordionTrigger className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg">
                                            Affiliate Partner
                                          </AccordionTrigger>
                                          <AccordionContent className="px-3">
                                            <div className="space-y-1 ml-3 pl-3 border-l-2 border-blue-100">
                                              <Link
                                                href="/affiliate-dashboard"
                                                className="block px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                              >
                                                Dashboard
                                              </Link>
                                              <Link
                                                href="/affiliate-wallet"
                                                className="block px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                              >
                                                Affiliate Partner Wallet
                                              </Link>
                                            </div>
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>

                            {/* H. Wishlist */}
                            <Link href="/wishlist" onClick={() => setIsMobileMenuOpen(false)}>
                              <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
                                <div className="p-2 bg-pink-100 rounded-full">
                                  <Heart className="h-4 w-4 text-pink-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">Wishlist</div>
                                  <div className="text-xs text-gray-500">
                                    {wishlistCount} items saved
                                  </div>
                                </div>
                                {wishlistCount > 0 && (
                                  <span className="bg-pink-100 text-pink-600 px-2 py-1 rounded-full text-xs font-medium">
                                    {wishlistCount}
                                  </span>
                                )}
                              </div>
                            </Link>

                            {/* I. Logout */}
                            <div className="pt-3 mt-3 border-t border-gray-200">
                              <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-red-50 hover:bg-red-100 transition-all duration-200 border border-red-100 w-full"
                              >
                                <div className="p-2 bg-red-100 rounded-full">
                                  <LogOut className="h-4 w-4 text-red-600" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium text-red-700">Logout</div>
                                  <div className="text-xs text-red-500">Sign out of your account</div>
                                </div>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Sign In when not logged in */}
                            <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                              <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
                                <div className="p-2 bg-blue-100 rounded-full">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">Sign In</div>
                                  <div className="text-xs text-gray-500">Access your account</div>
                                </div>
                              </div>
                            </Link>

                            {/* Wishlist for non-logged in users */}
                            <Link href="/wishlist" onClick={() => setIsMobileMenuOpen(false)}>
                              <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
                                <div className="p-2 bg-pink-100 rounded-full">
                                  <Heart className="h-4 w-4 text-pink-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">Wishlist</div>
                                  <div className="text-xs text-gray-500">
                                    {wishlistCount} items saved
                                  </div>
                                </div>
                                {wishlistCount > 0 && (
                                  <span className="bg-pink-100 text-pink-600 px-2 py-1 rounded-full text-xs font-medium">
                                    {wishlistCount}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                  {/* User Actions Section */}

                </SheetContent>
              </Sheet>

              {/* Center - Logo */}
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
                <Link href="/">
                  <img
                    src={headerLogo}
                    alt="POPPIK LIFESTYLE"
                    className="h-10 w-auto sm:h-12 object-contain hover:scale-105 transition-transform duration-300"
                    width={240}
                    height={48}
                  />
                </Link>
              </div>

              {/* Right - Search & Cart Icons */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearchBar(true)}
                  className="text-black hover:text-yellow-300 hover:bg-white/20 transition-all duration-300 h-10 w-10"
                >
                  <Search className="h-5 w-5" />
                </Button>

                <Link href="/cart">
                  <Button variant="ghost" size="icon" className="relative text-black hover:text-yellow-300 hover:bg-white/20 transition-all duration-300 h-10 w-10">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse font-semibold">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Desktop Layout - Keep existing */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Desktop Search */}
              <div className="flex items-center relative">
                {showSearchBar ? (
                  <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      onFocus={handleSearchInputFocus}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowSearchBar(false);
                          setShowSearchResults(false);
                          setSearchQuery("");
                        }, 200);
                      }}
                      autoFocus
                      className="w-full pl-10 pr-4 bg-white/90 backdrop-blur-sm border-white/50 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-yellow-300 transition-all duration-300"
                    />

                    {/* Search Results Dropdown */}
                    {showSearchResults && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                        {isSearchLoading ? (
                          <div className="p-4 text-center text-gray-500">Searching...</div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">No products found</div>
                        ) : (
                          <div className="py-2">
                            {searchResults.map((product) => (
                              <div
                                key={product.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleSearchResultClick(product.slug)}
                              >
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                  width={40}
                                  height={40}
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {getCategoryName(product)} • ₹{product.price}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSearchBar(true)}
                    className="h-10 w-10 text-black hover:text-yellow-300 hover:bg-white/20 transition-all duration-300"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Wishlist Icon */}
              <Link href="/wishlist">
                <Button variant="ghost" size="icon" className="h-10 w-10 relative text-black hover:text-pink-600 hover:bg-white/20 transition-colors">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-pink-600 hover:bg-pink-700 text-white text-xs">
                      {wishlistCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Cart Icon */}
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="h-10 w-10 relative text-black hover:text-pink-600 hover:bg-white/20 transition-colors">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-pink-600 hover:bg-pink-700 text-white text-xs">
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Wallet Dropdown */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 relative text-black hover:text-pink-600 hover:bg-white/20 transition-colors focus:outline-none">
                      <Wallet className="h-5 w-5" />

                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel className="text-base font-bold flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-gray-600" /> My Wallet
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Cashback Wallet */}
                    <DropdownMenuItem asChild>
                      <Link href="/wallet">
                        <div className="flex items-center justify-between w-full py-2 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Gift className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Cashback Wallet</p>
                              <p className="text-xs text-gray-500">Your cashback balance</p>
                            </div>
                          </div>
                          <p className="font-bold text-blue-600">
                            ₹{(walletData as any)?.displayCashbackBalance ?? (walletData as any)?.cashbackBalance ?? "0.00"}
                          </p>
                        </div>
                      </Link>
                    </DropdownMenuItem>

                    {/* Affiliate Wallet - Only show if approved affiliate */}
                    {isApprovedAffiliate && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/affiliate-wallet">
                            <div className="flex items-center justify-between w-full py-2 cursor-pointer">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <IndianRupee className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">Affiliate Wallet</p>
                                  <p className="text-xs text-gray-500">Commission earnings</p>
                                </div>
                              </div>
                              <p className="font-bold text-purple-600">
                                ₹{affiliateWallet?.commissionBalance
                                  ? parseFloat(affiliateWallet.commissionBalance).toFixed(2)
                                  : "0.00"}
                              </p>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <div className="px-2 py-3 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-600">Total Balance</p>
                        <p className="text-lg font-bold text-gray-900">
                          ₹{(
                            parseFloat(((walletData as any)?.displayCashbackBalance ?? (walletData as any)?.cashbackBalance ?? "0") as any) +
                            parseFloat(affiliateWallet?.commissionBalance || "0")
                          ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-black hover:text-yellow-300 hover:bg-white/20 transition-all duration-300">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {isApprovedAffiliate && (
                      <DropdownMenuItem asChild>
                        <Link href="/affiliate-dashboard" className="cursor-pointer">
                          <Gift className="h-4 w-4 mr-2" />
                          Affiliate Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/auth/login">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-black hover:text-yellow-300 hover:bg-white/20 transition-all duration-300">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Search Command */}
        <SearchCommand
          open={isSearchCommandOpen}
          onOpenChange={setIsSearchCommandOpen}
        />

        {/* Mobile Search Bar - Only shows when search icon is clicked */}
        {showSearchBar && (
          <div className="md:hidden px-4 pb-4 bg-white border-t border-gray-100">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={handleSearchInputFocus}
                onBlur={() => {
                  setTimeout(() => {
                    setShowSearchBar(false);
                    setShowSearchResults(false);
                    setSearchQuery("");
                  }, 200);
                }}
                autoFocus
                className="w-full pl-12 pr-4 py-3 text-base bg-gray-50 border-gray-200 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300 rounded-lg"
              />

              {/* Mobile Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  {isSearchLoading ? (
                    <div className="p-4 text-center text-gray-500">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No products found</div>
                  ) : (
                    <div className="py-2">
                      {searchResults.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleSearchResultClick(product.slug)}
                        >
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                            width={40}
                            height={40}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              {getCategoryName(product)} • ${product.price}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation - Desktop */}
        <nav className="bg-white hidden md:block shadow-md">
          <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-12">
              <ul className="flex items-center space-x-4" style={{ minHeight: '48px' }}>
                <li>
                  <Link
                    href="/"
                    className={`text-sm font-medium transition-colors px-4 py-2 block ${
                      isActiveLink("/")
                        ? "text-yellow-300 bg-white/20 rounded-full"
                        : "text-black hover:text-yellow-300 hover:bg-white/20 rounded-full"
                    }`}
                  >
                    Home
                  </Link>
                </li>

                {/* Dynamic Categories */}
                {!loading && categories.map((category) => {
                  const categorySubcategories = getSubcategoriesForCategory(category.id);

                  if (categorySubcategories.length > 0) {
                    return (
                      <li key={category.id} className="relative group">
                        <button
                          className={`text-sm font-medium transition-colors px-4 py-2 ${
                            isActiveLink(`/category/${category.slug}`)
                              ? "text-yellow-300 bg-white/20 rounded-full"
                              : "text-black hover:text-yellow-300 hover:bg-white/20 rounded-full"
                          }`}
                          onClick={() => window.location.href = `/category/${category.slug}`}
                        >
                          {category.name}
                        </button>

                        {/* Dropdown positioned under this specific menu item */}
                        <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg border border-gray-200 rounded-md z-[100] min-w-[200px] max-w-[400px] py-2 mt-0">
                          <div className="border-t border-gray-100 my-1"></div>
                          {categorySubcategories.map((subcategory) => (
                            <Link
                              key={subcategory.id}
                              href={`/category/${category.slug}?subcategory=${subcategory.slug}`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
                              title={subcategory.name}
                              onClick={() => {
                                setTimeout(() => {
                                  window.location.href = `/category/${category.slug}?subcategory=${subcategory.slug}`;
                                }, 100);
                              }}
                            >
                              {subcategory.name}
                            </Link>
                          ))}
                        </div>
                      </li>
                    );
                  } else {
                    // Category without subcategories - simple link
                    return (
                      <li key={category.id}>
                        <Link
                          href={`/category/${category.slug}`}
                          className={`text-sm font-medium transition-colors px-4 py-2 block ${
                            isActiveLink(`/category/${category.slug}`)
                              ? "text-yellow-300 bg-white/20 rounded-full"
                              : "text-black hover:text-yellow-300 hover:bg-white/20 rounded-full"
                          }`}
                        >
                          {category.name}
                        </Link>
                      </li>
                    );
                  }
                })}
 <li>
                  <Link
                    href="/combo"
                    className={`text-sm font-medium transition-colors px-4 py-2 block ${
                      isActiveLink("/combo")
                        ? "text-yellow-300 bg-white/20 rounded-full"
                        : "text-black hover:text-yellow-300 hover:bg-white/20 rounded-full"
                    }`}
                  >
                    Combo
                  </Link>
                </li>
                <li>
                  <Link
                    href="/offers"
                    className={`text-sm font-medium transition-colors px-4 py-2 block ${
                      isActiveLink("/offers")
                        ? "text-yellow-300 bg-white/20 rounded-full"
                        : "text-black hover:text-yellow-300 hover:bg-white/20 rounded-full"
                    }`}
                  >
                    Offer
                  </Link>
                </li>

                {/* Design Your Beauty Kit with Dropdown */}
                <li className="relative group">
                  <button
                    className="text-sm font-medium transition-colors px-4 py-2 text-black hover:text-yellow-300 hover:bg-white/20 rounded-full"
                  >
                    Design Your Beauty Kit
                  </button>

                  {/* Dropdown for Beauty Kit Sizes */}
                  <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg border border-gray-200 rounded-md z-[100] min-w-[200px] py-2 mt-0">
                    <Link
                      href="/beauty-kit/micro"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      Micro
                    </Link>
                    <Link
                      href="/beauty-kit/small"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      Small
                    </Link>
                    <Link
                      href="/beauty-kit/medium"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      Medium
                    </Link>
                    <Link
                      href="/beauty-kit/large"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      Large
                    </Link>
                  </div>
                </li>

                {/* Contest */}
                <li>
                  <Link
                    href="/contest"
                    className="text-sm font-medium transition-colors px-4 py-2 block text-black hover:text-yellow-300 hover:bg-white/20 rounded-full cursor-pointer"
                  >
                    Contest
                  </Link>
                </li>

                <li>
                  <a
                    href="https://poppikacademy.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium transition-colors px-4 py-2 block text-black hover:text-yellow-300 hover:bg-white/20 rounded-full cursor-pointer"
                  >
                    Academy
                  </a>
                </li>
                {/* <li>
                  <a
                    href="/drop-shipping"
                    onClick={(e) => {
                      e.preventDefault();
                      startTransition(() => {
                        window.location.href = '/drop-shipping';
                      });
                    }}
                    className="text-sm font-medium transition-colors px-4 py-2 block text-black hover:text-yellow-300 hover:bg-white/20 rounded-full cursor-pointer"
                  >
                    Drop Shipping
                  </a>
                </li> */}
                {/* <li>
                  <a
                    href="/makeup-studio"
                    onClick={(e) => {
                      e.preventDefault();
                      startTransition(() => {
                        window.location.href = '/makeup-studio';
                      });
                    }}
                    className="text-sm font-medium transition-colors px-4 py-2 block text-black hover:text-yellow-300 hover:bg-white/20 rounded-full cursor-pointer"
                  >
                    Makeup Studio
                  </a>
                </li> */}
                {/* <li>
                  <a
                    href="/fashion-show"
                    onClick={(e) => {
                      e.preventDefault();
                      startTransition(() => {
                        window.location.href = '/fashion-show';
                      });
                    }}
                    className="text-sm font-medium transition-colors px-4 py-2 block text-black hover:text-yellow-300 hover:bg-white/20 rounded-full cursor-pointer"
                  >
                    Fashion Show
                  </a>
                </li> */}
                <li>
                  <Link
                    href="/blog"
                    className={`text-sm font-medium transition-colors px-4 py-2 block ${
                      isActiveLink("/blog")
                        ? "text-yellow-300 bg-white/20 rounded-full"
                        : "text-black hover:text-yellow-300 hover:bg-white/20 rounded-full"
                    }`}
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* WhatsApp Floating Button */}
      <WhatsAppButton />

      {/* Footer */}
      <footer className="bg-gradient-to-b from-gray-900 to-black text-white py-2">
        <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Section - Centered Logo and Description */}
          <div className="text-center mb-12">
            <div className="mb-0 flex justify-center">
              <img
                src={logo}
                alt="POPPIK Logo"
                className="h-40 w-40 md:h-48 md:w-48 object-contain"
                width={500}
                height={500}
              />
            </div>

            <p className="text-gray-300 text-sm leading-relaxed mb-6 text-center px-0">
              <span className="block font-semibold text-center mb-3">WELCOME TO POPPIK – BEAUTY THAT EMPOWERS</span>
              <span className="block text-center">
                At Poppik, we believe beauty is more than skin deep. We are a modern cosmetics and personal care brand offering high-performance colour cosmetics, skincare essentials and premium bath products designed for bold, confident, and conscious consumers.
              </span>
              <span className="block text-center">
                Driven by a passion for beauty and innovation, Poppik is built on expertise and a deep understanding of evolving consumer needs.
              </span>
              <br />
              <span className="block font-semibold text-center">Poppik – Powered by Passion. Driven by Expertise. Inspired by You.</span>
            </p>

            {/* Social Media Icons - Centered below description */}
            <div className="flex justify-center space-x-5 mt-6">
              <a
                href="https://www.facebook.com/share/17jwSeQ3yU/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-500 transition-colors duration-300 transform hover:scale-110"
                title="Follow us on Facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/poppik_lifestyle?igsh=Yzlocmpnc3lobTd5"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-pink-300 transition-colors duration-300 transform hover:scale-110"
                title="Follow us on Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://whatsapp.com/channel/0029Vb6Zmsh1yT214jsWqS3D"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-green-500 transition-colors duration-300 transform hover:scale-110"
                title="Join our WhatsApp Channel"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/poppik-lifestyle/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors duration-300 transform hover:scale-110"
                title="Connect with us on LinkedIn"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href="https://x.com/poppikofficial?t=WXkmP_f22BOWpfaCjGG_oA&s=09"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500 transition-colors duration-300 transform hover:scale-110"
                title="Follow us on X (Twitter)"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.244H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com/@poppik_official?si=0s1cFXQHWo4toy2f"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-500 transition-colors duration-300 transform hover:scale-110"
                title="Subscribe to our YouTube channel"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://pin.it/7zbVvhod9"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-600 transition-colors duration-300 transform hover:scale-110"
                title="Follow us on Pinterest"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Section - 5 Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 md:gap-8 mb-8">
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4 text-white text-sm">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-white transition-colors text-sm">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/influencer-collab" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Influencer Collab
                  </Link>
                </li>
                <li>
                  <Link href="/affiliate" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Become an Affiliate
                  </Link>
                </li>
                <li >
                  <Link href="/channel-partner"  className="text-gray-400 hover:text-white transition-colors text-sm">
                    Join as a Channel Partner
                  </Link>
                </li>
              </ul>
            </div>

            {/* Order & Support */}
            <div>
              <h4 className="font-semibold mb-4 text-white text-sm">Order & Support</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/track-order" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Track Order
                  </Link>
                </li>
                <li>
                  <Link href="/order-history" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Order History
                  </Link>
                </li>
                <li>
                  <Link href="/store-locator" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Store Location
                  </Link>
                </li>
                <li>
                  <Link href="/media-links" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Media Rich
                  </Link>
                </li>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="font-semibold mb-4 text-white text-sm">Policies</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Terms & Condition
                  </Link>
                </li>
              </ul>
            </div>

            {/* Also Available On */}
            <div>
              <h4 className="font-semibold mb-4 text-white text-sm">Also Available On</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://www.amazon.in/stores/page/59FA5054-B89F-4ECA-A0D2-1D19E71E7CF7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Amazon
                  </a>
                </li>
                <li>
                  <a
                    // href="/"
                    onClick={(e) => e.preventDefault()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Flipkart
                  </a>
                </li>
                <li>
                  <a
                    // href="/"
                    onClick={(e) => e.preventDefault()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Meesho
                  </a>
                </li>
              </ul>
            </div>

            {/* Our Initiatives */}
            <div>
              <h4 className="font-semibold mb-4 text-white text-sm">Our Initiatives</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://poppikacademy.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Poppik Academy
                  </a>
                </li>
                <li>
                  <a
                    href="https://poppikdropshipping.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Poppik Dropshipping
                  </a>
                </li>
                <li  >
                  <Link href="/makeup-studio"   className="text-gray-400 hover:text-white transition-colors text-sm">
                    Poppik Makeup Studio
                  </Link>
                </li>
                <li>
                  <Link href="/fashion-show" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Poppik Fashion Show
                  </Link>
                </li>
              </ul>
            </div>
          </div>



          {/* Copyright */}
          <div className="border-t border-gray-800 pt-6 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 Poppik Lifestyle Private Limited. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </TooltipProvider>
  );
}