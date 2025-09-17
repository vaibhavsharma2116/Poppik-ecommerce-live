import { useState, useEffect, startTransition } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, Menu, X, User, Heart, LogOut, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
import logo from "@assets/logo.png";
import headerLogo from "@assets/typo_Poppik_Black-01.png";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSearchCommandOpen, setIsSearchCommandOpen] = useState(false);
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
    startTransition(() => {
      setSearchQuery(value);
      setShowSearchResults(value.trim().length > 0);
    });
  };

  const handleSearchResultClick = (productSlug: string) => {
    startTransition(() => {
      setSearchQuery("");
      setShowSearchResults(false);
    });
    window.location.href = `/product/${productSlug}`;
  };

  const handleSearchInputFocus = () => {
    if (searchQuery.trim().length > 0) {
      startTransition(() => {
        setShowSearchResults(true);
      });
    }
  };

  const handleSearchInputBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => {
      startTransition(() => {
        setShowSearchResults(false);
      });
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

          // Filter only active categories
          setCategories(categoriesData.filter((cat: Category) => cat.status === 'Active'));
          setSubcategories(subcategoriesData.filter((sub: Subcategory) => sub.status === 'Active'));
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
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 shadow-lg z-50">
        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Hidden on mobile */}
            <Link href="/" className="hidden md:block">
              <div className="flex items-center cursor-pointer hover:scale-105 transition-transform duration-300">
                <img
                  src={headerLogo}
                  alt="Fresh Look Everyday - POPPIK"
                  className="h-12 w-auto sm:h-14 md:h-16 lg:h-20 xl:h-24 object-contain"
                />
              </div>
            </Link>

            {/* Spacer for center alignment */}
            <div className="flex-1"></div>

            {/* Mobile Layout - Left: Menu, Center: Logo, Right: Search & Cart */}
            <div className="md:hidden flex items-center justify-between w-full">
              {/* Left - Mobile Menu */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:text-yellow-300 hover:bg-white/20 transition-all duration-300" onClick={() => setIsMobileMenuOpen(true)}>
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
                  <ScrollArea className="flex-1 h-[calc(100vh-12rem)]">
                    <div className="px-4 py-4 space-y-1">
                      {/* Static Navigation Items */}
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                        Navigation
                      </div>
                      {staticNavItems.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                            isActiveLink(item.href)
                              ? "bg-red-500 text-black shadow-md"
                              : "text-gray-700 hover:bg-red-50 hover:text-red-600"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>

                    {/* Categories Section */}
                    <div className="px-4 pb-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
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
                                    <Link
                                      href={`/category/${category.slug}`}
                                      className="block px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      View All {category.name}
                                    </Link>
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
                            // Category without subcategories - simple link
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
                    </div>
                  </ScrollArea>
                  {/* User Actions Section */}
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                      Account
                    </div>
                    <div className="space-y-2">
                      {user ? (
                        <>
                          <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
                              <div className="p-2 bg-blue-100 rounded-full">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">My Profile</div>
                                <div className="text-xs text-gray-500">{user.firstName}</div>
                              </div>
                            </div>
                          </Link>

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
                          <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
                              <div className="p-2 bg-blue-100 rounded-full">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">Login / Signup</div>
                                <div className="text-xs text-gray-500">Access your account</div>
                              </div>
                            </div>
                          </Link>

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
                </SheetContent>
              </Sheet>

              {/* Center - Logo */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <Link href="/">
                  <img
                    src={headerLogo}
                    alt="Fresh Look Everyday - POPPIK"
                    className="h-8 w-auto object-contain hover:scale-105 transition-transform duration-300"
                  />
                </Link>
              </div>

              {/* Right - Search & Cart Icons */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearchBar(true)}
                  className="text-white hover:text-yellow-300 hover:bg-white/20 transition-all duration-300"
                >
                  <Search className="h-5 w-5" />
                </Button>

                <Link href="/cart">
                  <Button variant="ghost" size="sm" className="relative text-white hover:text-yellow-300 hover:bg-white/20 transition-all duration-300">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Desktop Layout - Keep existing */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Desktop Search */}
              <div className="flex items-center relative">
                {showSearchBar ? (
                  <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
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
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {product.category?.name} • ${product.price}
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
                    size="sm"
                    onClick={() => setShowSearchBar(true)}
                    className="text-white hover:text-yellow-300 hover:bg-white/20 transition-all duration-300"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Wishlist Icon */}
              <Link href="/wishlist">
                <Button variant="ghost" size="sm" className="relative text-white hover:text-yellow-300 hover:bg-white/20 transition-all duration-300">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-400 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse">
                      {wishlistCount}
                    </span>
                  )}
                </Button>
              </Link>

              <Link href="/cart">
                <Button variant="ghost" size="sm" className="relative text-white hover:text-yellow-300 hover:bg-white/20 transition-all duration-300">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>
              {user ? (
                <div className="flex items-center space-x-2">
                  <Link href="/profile">
                    <Button variant="ghost" size="sm" className="text-white hover:text-yellow-300 hover:bg-white/20 transition-all duration-300">
                      Welcome, {user.firstName}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    title="Logout"
                    className="text-black hover:text-red-300 hover:bg-white/20 transition-all duration-300"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="text-white hover:text-yellow-300 hover:bg-white/20 transition-all duration-300">
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
          <div className="md:hidden px-2 pb-3">
            <div className="relative max-w-xs mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
              <Input
                type="text"
                placeholder="Search..."
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
                className="w-full pl-10 pr-4 py-2 text-sm bg-white/90 backdrop-blur-sm border-white/50 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-yellow-300 transition-all duration-300 rounded-full"
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
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              {product.category?.name} • ${product.price}
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
        <nav className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hidden md:block shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-12">
              <ul className="flex items-center space-x-4">
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
                        <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg border border-gray-200 rounded-md z-50 min-w-[200px] max-w-[400px] py-2">
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
                    href="/about"
                    className={`text-sm font-medium transition-colors px-4 py-2 block ${
                      isActiveLink("/about")
                        ? "text-yellow-300 bg-white/20 rounded-full"
                        : "text-black hover:text-yellow-300 hover:bg-white/20 rounded-full"
                    }`}
                  >
                    About
                  </Link>
                </li>

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

                <li>
                  <Link
                    href="/contact"
                    className={`text-sm font-medium transition-colors px-4 py-2 block ${
                      isActiveLink("/contact")
                        ? "text-yellow-300 bg-white/20 rounded-full"
                        : "text-black hover:text-yellow-300 hover:bg-white/20 rounded-full"
                    }`}
                  >
                    Contact
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

      {/* Footer */}
      <footer className="bg-black text-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <div className="mb-4">
                <img
                  src={logo}
                  alt="POPPIK Logo"
                  style={{ width: 'auto', height: '140px' }}
                />
              </div>
              <p className="text-gray-400 mb-4">
                Your trusted partner for natural, effective beauty and wellness products.
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://www.instagram.com/poppikofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-pink-500 transition-colors duration-300 transform hover:scale-110"
                  title="Follow us on Instagram"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/people/Poppik/61579145279161/"
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
                  href="https://www.youtube.com/@Poppikofficial"
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
                  href="https://x.com/poppikofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-black transition-colors duration-300 transform hover:scale-110"
                  title="Follow us on X (Twitter)"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.244H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href="https://pinterest.com/poppikofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-red-600 transition-colors duration-300 transform hover:scale-110"
                  title="Follow us on Pinterest"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.093.112.105.211.077.326-.083.346-.265 1.077-.301 1.223-.047.191-.154.232-.356.14-1.279-.593-2.077-2.459-2.077-3.965 0-3.23 2.348-6.195 6.766-6.195 3.55 0 6.312 2.53 6.312 5.918 0 3.528-2.222 6.367-5.307 6.367-1.036 0-2.01-.547-2.342-1.195l-.637 2.43c-.23.892-.851 2.006-1.269 2.686C9.434 23.762 10.701 24 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/>
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
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.025-.57-.025-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.704"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Categories</h4>
              <ul className="space-y-2">
                {categories.slice(0, 6).map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/category/${category.slug}`}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
                {categories.length > 6 && (
                  <li>
                    <Link
                      href="/categories"
                      className="text-gray-400 hover:text-white transition-colors font-medium"
                    >
                      View All Categories →
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4 text-white">Customer Support</h4>
              <ul className="space-y-2">
                {user && (
                  <li>
                    <Link href="/order-history" className="text-gray-400 hover:text-white transition-colors">
                      Order History
                    </Link>
                  </li>
                )}
                <li>
                  <Link href="/track-order" className="text-gray-400 hover:text-white transition-colors">
                    Track Your Order
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                    Contact Support
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 Poppik. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}