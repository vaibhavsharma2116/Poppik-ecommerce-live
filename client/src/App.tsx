import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { lazy, Suspense, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { Helmet } from "react-helmet";
const AdminInfluencerVideos = lazy(() => import("@/pages/admin/influencer-videos"));
const AdminAffiliateVideos = lazy(() => import("@/pages/admin/affiliate-videos"));
const AdminChannelPartnerVideos = lazy(() => import("@/pages/admin/channel-partner-videos"));
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
const ForgotPassword = lazy(() => import("./pages/auth/forgot-password"));
const ResetPassword = lazy(() => import("./pages/auth/reset-password"));
const Profile = lazy(() => import("./pages/profile"));
const CartPage = lazy(() => import('./pages/cart'));
const Checkout = lazy(() => import("./pages/checkout"));
const SelectDeliveryAddress = lazy(() => import("./pages/select-delivery-address"));
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
const AdminThermalInvoice = lazy(() => import("@/pages/admin/thermal-invoice"));
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
const AdminNotifications = lazy(() => import("@/pages/admin/notifications"));
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
// const AdminInfluencerApplications = lazy(() => import('./pages/admin/influencer-applications'));
const AdminAffiliateApplications = lazy(() => import('./pages/admin/affiliate-applications'));
const AdminAffiliateWithdrawals = lazy(() => import("@/pages/admin/affiliate-withdrawals"));
const AcademyPage = lazy(() => import("./pages/academy"));
const DropShippingPage = lazy(() => import("./pages/drop-shipping"));
const ContestPage = lazy(() => import("./pages/contest"));
const MakeupStudio = lazy(() => import("./pages/makeup-studio"));
const FashionShow = lazy(() => import("./pages/fashion-show"));
const AdminBlog = lazy(() => import("./pages/admin/blog"));
const AdminReports = lazy(() => import("./pages/admin/reports"));
const AdminMedia = lazy(() => import("./pages/admin/media"));
const MediaLinks = lazy(() => import("@/pages/media-links"));
const OffersPage = lazy(() => import("@/pages/offers"));
const OfferDetail = lazy(() => import("@/pages/offer-detail"));
const AdminPromoCodeUsage = lazy(() => import("./pages/admin/promo-code-usage"));
const AdminGiftSettings = lazy(() => import("./pages/admin/gift-settings"));

// Loading component for better UX
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Error component for failed lazy loading
const LazyErrorFallback = ({ error }: { error?: Error }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong</h1>
      <p className="text-gray-600 mb-4">Failed to load page. Please try reloading.</p>
      {error && <p className="text-sm text-gray-500 mb-4">{error.message}</p>}
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
      >
        Reload Page
      </button>
    </div>
  </div>
);

// Wrapper component to handle transitions properly
function LazyRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
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

function AffiliateHandler() {
  useEffect(() => {
    // Capture affiliate ref parameter from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    
    if (ref && ref.startsWith('POPPIKAP')) {
      // Store affiliate ref in localStorage if not already stored
      const existingRef = localStorage.getItem('affiliateRef');
      if (!existingRef) {
        localStorage.setItem('affiliateRef', ref);
        // Log for tracking
        console.log('Affiliate link captured:', ref);
      }
    }
  }, []);

  return null;
}

function Router() {
  return (
    <>
      <AffiliateHandler />
      <ScrollToTop />
      <Switch>
      {/* Admin Login Route (outside AdminLayout) */}
      <Route path="/admin/auth/admin-login" component={() => <LazyRoute component={lazy(() => import("./pages/auth/admin-login"))} />} />

      {/* Admin Routes */}
      <Route path="/admin" nest>
        <AdminLayout>
          <Switch>
            <Route path="/" component={() => <LazyRoute component={AdminDashboard} />} />
            <Route path="/products" component={() => <LazyRoute component={AdminProducts} />} />
            <Route path="/categories" component={() => <LazyRoute component={AdminCategories} />} />
            <Route path="/orders" component={() => <LazyRoute component={AdminOrders} />} />
            <Route path="/orders/thermal-invoice" component={() => <LazyRoute component={AdminThermalInvoice} />} />
            <Route path="/customers" component={() => <LazyRoute component={AdminCustomers} />} />
<Route path="/influencer-videos" component={() => <LazyRoute component={AdminInfluencerVideos} />} />
            <Route path="/affiliate-videos" component={() => <LazyRoute component={AdminAffiliateVideos} />} />
            <Route path="/channel-partner-videos" component={() => <LazyRoute component={AdminChannelPartnerVideos} />} />
            <Route path="/sliders" component={() => <LazyRoute component={lazy(() => import("@/pages/admin/sliders"))} />} />
            <Route path="/combo-sliders" component={() => <LazyRoute component={lazy(() => import("@/pages/admin/combo-sliders"))} />} />
            <Route path="/job-applications" component={() => <LazyRoute component={JobApplications} />} />
            {/* <Route path="/influencer-applications" component={AdminInfluencerApplications} /> */}
            <Route path="/affiliate-applications" component={() => <LazyRoute component={AdminAffiliateApplications} />} />
            <Route path="/affiliate-withdrawals" component={() => <LazyRoute component={AdminAffiliateWithdrawals} />} />
            <Route path="/promo-codes" component={() => <LazyRoute component={lazy(() => import("./pages/admin/promo-codes"))} />} />
            <Route path="/promo-code-usage" component={() => <LazyRoute component={AdminPromoCodeUsage} />} />
            <Route path="/gift-settings" component={() => <LazyRoute component={AdminGiftSettings} />} />
            <Route path="/offers" component={() => <LazyRoute component={lazy(() => import("@/pages/admin/offers"))} />} />
            <Route path="/contests" component={() => <LazyRoute component={lazy(() => import("./pages/admin/contests"))} />} />
            <Route path="/job-positions" component={() => <LazyRoute component={lazy(() => import("./pages/admin/job-positions"))} />} />
            <Route path="/stores" component={() => <LazyRoute component={AdminStores} />} />
              <Route path="/notifications" component={() => <LazyRoute component={AdminNotifications} />} />
            <Route path="/settings" component={() => <LazyRoute component={AdminSettings} />} />
            <Route path="/affiliate-settings" component={() => <LazyRoute component={lazy(() => import("./pages/admin/affiliate-settings"))} />} />
            <Route path="/profile" component={() => <LazyRoute component={AdminProfile} />} />
            <Route path="/change-password" component={() => <LazyRoute component={AdminChangePassword} />} />
             <Route path="/contact-submissions" component={() => <LazyRoute component={AdminContactSubmissions} />} />
            <Route path="/testimonials" component={() => <LazyRoute component={AdminTestimonials} />} />
            <Route path="/video-testimonials" component={() => <LazyRoute component={AdminVideoTestimonials} />} />
            <Route path="/blog" component={() => <LazyRoute component={lazy(() => import("./pages/admin/blog"))} />} />
            <Route path="/combos" component={() => <LazyRoute component={AdminCombos} />} />
            <Route path="/announcements" component={() => <LazyRoute component={AdminAnnouncements} />} />
            <Route path="/shades" component={() => <LazyRoute component={AdminShades} />} />
            <Route path="/featured-sections" component={() => <LazyRoute component={AdminFeaturedSections} />} />
            
            {/* Master Admin Routes */}
            <Route path="/master" component={() => <LazyRoute component={lazy(() => import("./pages/admin/master-admin-dashboard"))} />} />
            <Route path="/master/users" component={() => <LazyRoute component={lazy(() => import("./pages/admin/master-admin-users"))} />} />
            <Route path="/master/settings" component={() => <LazyRoute component={lazy(() => import("./pages/admin/master-admin-settings"))} />} />
            <Route path="/master/logs" component={() => <LazyRoute component={lazy(() => import("./pages/admin/master-admin-activity-logs"))} />} />
            <Route path="/reports" component={() => <LazyRoute component={AdminReports} />} />
            <Route path="/media" component={() => <LazyRoute component={AdminMedia} />} />
            <Route component={() => <LazyRoute component={NotFound} />} />
          </Switch>
        </AdminLayout>
      </Route>

      {/* Public Routes */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={() => <LazyRoute component={Home} />} />
            <Route path="/combos" component={() => <LazyRoute component={ComboPage} />} />
            <Route path="/combo/:id" component={() => <LazyRoute component={lazy(() => import("./pages/combo-detail"))} />} />
            <Route path="/offers" component={() => <LazyRoute component={OffersPage} />} />
            <Route path="/offer/:id" component={() => <LazyRoute component={OfferDetail} />} />
            <Route path="/academy" component={() => <LazyRoute component={AcademyPage} />} />
            <Route path="/drop-shipping" component={() => <LazyRoute component={DropShippingPage} />} />
            <Route path="/contest" component={() => <LazyRoute component={ContestPage} />} />
            <Route path="/contest/:slug" component={() => <LazyRoute component={lazy(() => import("./pages/contest-detail"))} />} />
            <Route path="/channel-partner" component={() => <LazyRoute component={ChannelPartnerPage} />} />
            <Route path="/beauty-kit/micro" component={() => <LazyRoute component={lazy(() => import("./pages/beauty-kit-micro"))} />} />
            <Route path="/beauty-kit/small" component={() => <LazyRoute component={lazy(() => import("./pages/beauty-kit-small"))} />} />
            <Route path="/beauty-kit/medium" component={() => <LazyRoute component={lazy(() => import("./pages/beauty-kit-medium"))} />} />
            <Route path="/beauty-kit/large" component={() => <LazyRoute component={lazy(() => import("./pages/beauty-kit-large"))} />} />
            <Route path="/makeup-studio" component={() => <LazyRoute component={MakeupStudio} />} />
            <Route path="/fashion-show" component={() => <LazyRoute component={FashionShow} />} />
            <Route path="/products" component={() => <LazyRoute component={ProductsPage} />} />
            <Route path="/category/:slug" component={() => <LazyRoute component={Category} />} />
            <Route path="/product/:slug" component={() => <LazyRoute component={ProductDetail} />} />
            <Route path="/about" component={() => <LazyRoute component={About} />} />
            <Route path="/combo" component={() => <LazyRoute component={ComboPage} />} />
            <Route path="/blog" component={() => <LazyRoute component={Blog} />} />
            <Route path="/blog/:slug" component={() => <LazyRoute component={BlogPost} />} />
            <Route path="/contact" component={() => <LazyRoute component={Contact} />} />
            <Route path="/auth/login" component={() => <LazyRoute component={Login} />} />
            <Route path="/auth/signup" component={() => <LazyRoute component={Signup} />} />
            <Route path="/auth/forgot-password" component={() => <LazyRoute component={ForgotPassword} />} />
            <Route path="/auth/reset-password" component={() => <LazyRoute component={ResetPassword} />} />
            <Route path="/auth/otp-verification" component={() => <LazyRoute component={OTPVerification} />} />
            <Route path="/profile" component={() => <LazyRoute component={Profile} />} />
            <Route path="/cart" component={() => <LazyRoute component={CartPage} />} />
            <Route path="/checkout" component={() => <LazyRoute component={Checkout} />} />
            <Route path="/select-delivery-address" component={() => <LazyRoute component={SelectDeliveryAddress} />} />
            <Route path="/wishlist" component={() => <LazyRoute component={Wishlist} />} />
            <Route path="/wallet" component={() => <LazyRoute component={Wallet} />} />
            <Route path="/order-history" component={() => <LazyRoute component={OrderHistory} />} />
            <Route path="/track-order" component={() => <LazyRoute component={TrackOrder} />} />
            <Route path="/change-password" component={() => <LazyRoute component={ChangePassword} />} />
            <Route path="/terms" component={() => <LazyRoute component={Terms} />} />
            <Route path="/privacy" component={() => <LazyRoute component={Privacy} />} />
            <Route path="/store-locator" component={() => <LazyRoute component={lazy(() => import("./pages/store-locator"))} />} />
            <Route path="/careers" component={() => <LazyRoute component={Careers} />} />
            <Route path="/careers/:position" component={() => <LazyRoute component={lazy(() => import("./pages/careers-detail"))} />} />
            <Route path="/careers/apply/:position?" component={() => <LazyRoute component={lazy(() => import("./pages/careers-apply"))} />} />
            <Route path="/influencer-collab" component={() => <LazyRoute component={InfluencerCollab} />} />
            <Route path="/affiliate" component={() => <LazyRoute component={lazy(() => import("./pages/affiliate"))} />} />
            <Route path="/affiliate-application" component={() => <LazyRoute component={AffiliateApplicationPage} />} />
            <Route path="/affiliate-form" component={() => <LazyRoute component={AffiliateForm} />} />
            <Route path="/affiliate-dashboard" component={() => <LazyRoute component={lazy(() => import("./pages/affiliate-dashboard"))} />} />
            <Route path="/affiliate-wallet" component={() => <LazyRoute component={lazy(() => import("./pages/affiliate-wallet"))} />} />
            <Route path="/media-links" component={() => <LazyRoute component={MediaLinks} />} />
            <Route component={() => <LazyRoute component={NotFound} />} />
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