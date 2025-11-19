import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { lazy, Suspense, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { Helmet } from "react-helmet";

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load ALL components for better code splitting
const Layout = lazy(() => import("@/components/layout"));
const AdminLayout = lazy(() => import("@/components/admin/admin-layout"));
const Home = lazy(() => import("@/pages/home"));
const Category = lazy(() => import("@/pages/category"));
const ProductsPage = lazy(() => import("@/pages/product"));
const ProductDetail = lazy(() => import("@/pages/product-detail"));
const About = lazy(() => import("@/pages/about"));
const Blog = lazy(() => import("@/pages/blog"));
const Contact = lazy(() => import("@/pages/contact"));
const Login = lazy(() => import("./pages/auth/login"));
const Signup = lazy(() => import("./pages/auth/signup"));
const OTPVerification = lazy(() => import("./pages/auth/otp-verification"));
const Profile = lazy(() => import("./pages/profile"));
const CartPage = lazy(() => import('./pages/cart'));
const Checkout = lazy(() => import("./pages/checkout"));
const Wishlist = lazy(() => import("./pages/wishlist"));
const OrderHistory = lazy(() => import("./pages/order-history"));
const TrackOrder = lazy(() => import("./pages/track-order"));
const ChangePassword = lazy(() => import("./pages/change-password"));
const Wallet = lazy(() => import("./pages/wallet"));
const Terms = lazy(() => import("./pages/terms"));
const Privacy = lazy(() => import("./pages/privacy"));
const Careers = lazy(() => import("@/pages/careers"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/products"));
const AdminCategories = lazy(() => import("@/pages/admin/category"));
const AdminOrders = lazy(() => import("@/pages/admin/orders"));
const AdminCustomers = lazy(() => import("@/pages/admin/customers"));
const AdminSettings = lazy(() => import("@/pages/admin/settings"));
const AdminProfile = lazy(() => import("@/pages/admin/profile"));
const AdminChangePassword = lazy(() => import("@/pages/admin/change-password"));
const AdminSliders = lazy(() => import("@/pages/admin/sliders"));
const AdminContactSubmissions = lazy(() => import("@/pages/admin/contact-submissions"));
const AdminTestimonials = lazy(() => import("@/pages/admin/testimonials"));
const AdminVideoTestimonials = lazy(() => import("@/pages/admin/video-testimonials"));
const AdminAnnouncements = lazy(() => import("@/pages/admin/announcements"));
const AdminCombos = lazy(() => import("@/pages/admin/combos"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminShades = lazy(() => import("./pages/admin/shades"));
const AdminFeaturedSections = lazy(() => import("@/pages/admin/featured-sections"));
const BlogPost = lazy(() => import("./pages/blog-post"));
const ComboPage = lazy(() => import("@/pages/combo"));
const JobApplications = lazy(() => import("@/pages/admin/job-applications"));
const AdminStores = lazy(() => import("@/pages/admin/stores"));
const InfluencerCollab = lazy(() => import("@/pages/influencer-collab"));
const ChannelPartnerPage = lazy(() => import("@/pages/channel-partner"));
const AffiliatePage = lazy(() => import("@/pages/affiliate"));
const AffiliateApplicationPage = lazy(() => import("@/pages/affiliate-application"));
const AffiliateForm = lazy(() => import("@/pages/affiliate-form"));
const AdminInfluencerApplications = lazy(() => import('./pages/admin/influencer-applications'));
const AdminAffiliateApplications = lazy(() => import('./pages/admin/affiliate-applications'));
const AdminAffiliateWithdrawals = lazy(() => import("@/pages/admin/affiliate-withdrawals"));
const AcademyPage = lazy(() => import("./pages/academy"));
const DropShippingPage = lazy(() => import("./pages/drop-shipping"));
const ContestPage = lazy(() => import("./pages/contest"));
const MakeupStudio = lazy(() => import("./pages/makeup-studio"));
const FashionShow = lazy(() => import("./pages/fashion-show"));
const AdminBlog = lazy(() => import("./pages/admin/blog"));
const AdminReports = lazy(() => import("./pages/admin/reports"));
import OffersPage from "@/pages/offers";
import OfferDetail from "@/pages/offer-detail";

// Loading component for better UX
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Wrapper component to handle transitions properly
function LazyRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component />
    </Suspense>
  );
}

// Component to handle scroll restoration
function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function Router() {
  const handleRouteChange = (callback: () => void) => {
    startTransition(() => {
      callback();
    });
  };

  return (
    <>
      <ScrollToTop />
      <Switch>
      {/* Admin Login Route (outside AdminLayout) */}
      <Route path="/admin/auth/admin-login" component={() => <LazyRoute component={lazy(() => import("./pages/auth/admin-login"))} />} />

      {/* Admin Routes */}
      <Route path="/admin" nest>
        <AdminLayout>
          <Switch>
            <Route path="/" component={AdminDashboard} />
            <Route path="/products" component={AdminProducts} />
            <Route path="/categories" component={AdminCategories} />
            <Route path="/orders" component={AdminOrders} />
            <Route path="/customers" component={AdminCustomers} />

            <Route path="/sliders" component={() => <LazyRoute component={lazy(() => import("@/pages/admin/sliders"))} />} />
            <Route path="/combo-sliders" component={() => <LazyRoute component={lazy(() => import("@/pages/admin/combo-sliders"))} />} />
            <Route path="/job-applications" component={JobApplications} />
            <Route path="/influencer-applications" component={AdminInfluencerApplications} />
            <Route path="/affiliate-applications" component={AdminAffiliateApplications} />
            <Route path="/affiliate-withdrawals" component={AdminAffiliateWithdrawals} />
            <Route path="/promo-codes" component={lazy(() => import("./pages/admin/promo-codes"))} />
            <Route path="/promo-code-usage" component={lazy(() => import("./pages/admin/promo-code-usage"))} />
            <Route path="/offers" component={lazy(() => import("@/pages/admin/offers"))} />
            <Route path="/job-positions" component={() => <LazyRoute component={lazy(() => import("./pages/admin/job-positions"))} />} />
            <Route path="/stores" component={AdminStores} />
            <Route path="/settings" component={AdminSettings} />
            <Route path="/affiliate-settings" component={() => <LazyRoute component={lazy(() => import("./pages/admin/affiliate-settings"))} />} />
            <Route path="/profile" component={AdminProfile} />
            <Route path="/change-password" component={AdminChangePassword} />
             <Route path="/contact-submissions" component={AdminContactSubmissions} />
            <Route path="/testimonials" component={AdminTestimonials} />
            <Route path="/video-testimonials" component={AdminVideoTestimonials} />
            <Route path="/blog" component={() => <LazyRoute component={lazy(() => import("./pages/admin/blog"))} />} />
            <Route path="/combos" component={AdminCombos} />
            <Route path="/announcements" component={AdminAnnouncements} />
            <Route path="/shades" component={AdminShades} />
            <Route path="/featured-sections" component={AdminFeaturedSections} />
            <Route path="/reports" component={() => <LazyRoute component={AdminReports} />} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </Route>

      {/* Public Routes */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/combos" component={ComboPage} />
            <Route path="/combo/:id" component={() => <LazyRoute component={lazy(() => import("./pages/combo-detail"))} />} />
            <Route path="/offers" component={OffersPage} />
            <Route path="/offer/:id" component={OfferDetail} />
            <Route path="/academy" component={() => <LazyRoute component={AcademyPage} />} />
            <Route path="/drop-shipping" component={() => <LazyRoute component={DropShippingPage} />} />
            <Route path="/contest" component={() => <LazyRoute component={ContestPage} />} />
            <Route path="/channel-partner" component={ChannelPartnerPage} />
            <Route path="/beauty-kit/micro" component={() => <LazyRoute component={lazy(() => import("./pages/beauty-kit-micro"))} />} />
            <Route path="/beauty-kit/small" component={() => <LazyRoute component={lazy(() => import("./pages/beauty-kit-small"))} />} />
            <Route path="/beauty-kit/medium" component={() => <LazyRoute component={lazy(() => import("./pages/beauty-kit-medium"))} />} />
            <Route path="/beauty-kit/large" component={() => <LazyRoute component={lazy(() => import("./pages/beauty-kit-large"))} />} />
            <Route path="/makeup-studio" component={() => <LazyRoute component={MakeupStudio} />} />
            <Route path="/fashion-show" component={() => <LazyRoute component={FashionShow} />} />
            <Route path="/products" component={ProductsPage} />
            <Route path="/category/:slug" component={Category} />
            <Route path="/product/:slug" component={ProductDetail} />
            <Route path="/about" component={About} />
            <Route path="/combo" component={ComboPage} />


            <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
            <Route path="/contact" component={Contact} />
            <Route path="/auth/login" component={Login} />
            <Route path="/auth/signup" component={Signup} />
            <Route path="/auth/otp-verification" component={OTPVerification} />
            <Route path="/profile" component={Profile} />
            <Route path="/cart" component={CartPage} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/wishlist" component={Wishlist} />
            <Route path="/wallet" component={Wallet} />
            <Route path="/order-history" component={OrderHistory} />
            <Route path="/track-order" component={TrackOrder} />
            <Route path="/change-password" component={ChangePassword} />
             <Route path="/terms" component={Terms} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/store-locator" component={() => <LazyRoute component={lazy(() => import("./pages/store-locator"))} />} />
            <Route path="/careers" component={Careers} />
            <Route path="/careers/:position" component={() => <LazyRoute component={lazy(() => import("./pages/careers-detail"))} />} />
            <Route path="/careers/apply/:position?" component={() => <LazyRoute component={lazy(() => import("./pages/careers-apply"))} />} />
            <Route path="/influencer-collab" component={InfluencerCollab} />
            <Route path="/affiliate" component={() => <LazyRoute component={lazy(() => import("./pages/affiliate"))} />} />
            <Route path="/affiliate-application" component={AffiliateApplicationPage} />
            <Route path="/affiliate-form" component={AffiliateForm} />
            <Route path="/affiliate-dashboard" component={() => <LazyRoute component={lazy(() => import("./pages/affiliate-dashboard"))} />} />
            <Route path="/affiliate-wallet" component={() => <LazyRoute component={lazy(() => import("./pages/affiliate-wallet"))} />} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          }>
            <Router />
          </Suspense>
        </TooltipProvider>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;