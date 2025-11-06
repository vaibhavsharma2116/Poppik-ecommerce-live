import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import AdminLayout from "@/components/admin/admin-layout";
import Home from "@/pages/home";
import Category from "@/pages/category";
import ProductsPage from "@/pages/product";
import ProductDetail from "@/pages/product-detail";
import About from "@/pages/about";
import Blog from "@/pages/blog";
import Contact from "@/pages/contact";
import Login from "./pages/auth/login";
import Signup from "./pages/auth/signup";
import OTPVerification from "./pages/auth/otp-verification";
import Profile from "./pages/profile";
import CartPage from './pages/cart';
import Checkout from "./pages/checkout";
import Wishlist from "./pages/wishlist";
import OrderHistory from "./pages/order-history";
import TrackOrder from "./pages/track-order";
import ChangePassword from "./pages/change-password";
import Wallet from "./pages/wallet";
import Terms from "./pages/terms";
import Privacy from "./pages/privacy";
import Careers from "@/pages/careers";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminCategories from "@/pages/admin/category";
import AdminOrders from "@/pages/admin/orders";
import AdminCustomers from "@/pages/admin/customers";
import AdminSettings from "@/pages/admin/settings";
import AdminProfile from "@/pages/admin/profile";
import AdminChangePassword from "@/pages/admin/change-password";
import AdminSliders from "@/pages/admin/sliders";
import AdminContactSubmissions from "@/pages/admin/contact-submissions";
import AdminTestimonials from "@/pages/admin/testimonials";
import AdminVideoTestimonials from "@/pages/admin/video-testimonials";
import AdminAnnouncements from "@/pages/admin/announcements";
import AdminCombos from "@/pages/admin/combos";
import NotFound from "@/pages/not-found";
import { lazy, Suspense, startTransition, useEffect } from 'react';
import AdminShades from "./pages/admin/shades";
import AdminFeaturedSections from "@/pages/admin/featured-sections";
import BlogPost from "./pages/blog-post";
import ComboPage from "@/pages/combo";
import JobApplications from "@/pages/admin/job-applications";
import AdminStores from "@/pages/admin/stores";
import InfluencerCollab from "@/pages/influencer-collab";
import ChannelPartnerPage from "@/pages/channel-partner";
import AffiliatePage from "@/pages/affiliate";
import AffiliateApplicationPage from "@/pages/affiliate-application";
import AdminInfluencerApplications from './pages/admin/influencer-applications';
import AdminAffiliateApplications from './pages/admin/affiliate-applications';
import AdminAffiliateWithdrawals from "@/pages/admin/affiliate-withdrawals";
const AcademyPage = lazy(() => import("./pages/academy"));
const DropShippingPage = lazy(() => import("./pages/drop-shipping"));
const ContestPage = lazy(() => import("./pages/contest"));
const MakeupStudio = lazy(() => import("./pages/makeup-studio"));
const FashionShow = lazy(() => import("./pages/fashion-show"));

const AdminBlog = lazy(() => import("./pages/admin/blog"));
const AdminReports = lazy(() => import("./pages/admin/reports"));

// Loading component for better UX
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Component to handle scroll restoration
function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
      {/* Admin Routes */}
      <Route path="/admin" nest>
        <AdminLayout>
          <Switch>
            <Route path="/" component={AdminDashboard} />
            <Route path="/products" component={AdminProducts} />
            <Route path="/categories" component={AdminCategories} />
            <Route path="/orders" component={AdminOrders} />
            <Route path="/customers" component={AdminCustomers} />
            <Route path="/sliders" component={AdminSliders} />
            <Route path="/job-applications" component={JobApplications} />
            <Route path="/influencer-applications" component={AdminInfluencerApplications} />
            <Route path="/affiliate-applications" component={AdminAffiliateApplications} />
            <Route path="/affiliate-withdrawals" component={AdminAffiliateWithdrawals} />
            <Route path="/job-positions" component={() => {
              const JobPositions = lazy(() => import("./pages/admin/job-positions"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <JobPositions />
                </Suspense>
              );
            }} />
            <Route path="/stores" component={() => {
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminStores />
                </Suspense>
              );
            }} />
            <Route path="/settings" component={AdminSettings} />
            <Route path="/profile" component={AdminProfile} />
            <Route path="/change-password" component={AdminChangePassword} />
             <Route path="/contact-submissions" component={AdminContactSubmissions} />
            <Route path="/testimonials" component={AdminTestimonials} />
            <Route path="/video-testimonials" component={AdminVideoTestimonials} />
            <Route path="/blog" component={() => {
              const AdminBlog = lazy(() => import("./pages/admin/blog"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminBlog />
                </Suspense>
              );
            }} />
            <Route path="/combos" component={AdminCombos} />
            <Route path="/announcements" component={AdminAnnouncements} />
            <Route path="/shades" component={AdminShades} />
            <Route path="/featured-sections" component={AdminFeaturedSections} />
            <Route path="/reports">
              <Suspense fallback={<LoadingSpinner />}>
                <AdminReports />
              </Suspense>
            </Route>
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
            <Route path="/combo/:id" component={() => {
              const ComboDetail = lazy(() => import("./pages/combo-detail"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <ComboDetail />
                </Suspense>
              );
            }} />
            <Route path="/academy">
              <Suspense fallback={<LoadingSpinner />}>
                <AcademyPage />
              </Suspense>
            </Route>
            <Route path="/drop-shipping">
              <Suspense fallback={<LoadingSpinner />}>
                <DropShippingPage />
              </Suspense>
            </Route>
            <Route path="/contest">
              <Suspense fallback={<LoadingSpinner />}>
                <ContestPage />
              </Suspense>
            </Route>
            <Route path="/channel-partner" component={ChannelPartnerPage} />
            <Route path="/beauty-kit/micro" component={() => {
              const BeautyKitMicro = lazy(() => import("./pages/beauty-kit-micro"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <BeautyKitMicro />
                </Suspense>
              );
            }} />
            <Route path="/beauty-kit/small" component={() => {
              const BeautyKitSmall = lazy(() => import("./pages/beauty-kit-small"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <BeautyKitSmall />
                </Suspense>
              );
            }} />
            <Route path="/beauty-kit/medium" component={() => {
              const BeautyKitMedium = lazy(() => import("./pages/beauty-kit-medium"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <BeautyKitMedium />
                </Suspense>
              );
            }} />
            <Route path="/beauty-kit/large" component={() => {
              const BeautyKitLarge = lazy(() => import("./pages/beauty-kit-large"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <BeautyKitLarge />
                </Suspense>
              );
            }} />
            <Route path="/makeup-studio">
              <Suspense fallback={<LoadingSpinner />}>
                <MakeupStudio />
              </Suspense>
            </Route>
            <Route path="/fashion-show">
              <Suspense fallback={<LoadingSpinner />}>
                <FashionShow />
              </Suspense>
            </Route>
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
            <Route path="/store-locator" component={() => {
              const StoreLocator = lazy(() => import("./pages/store-locator"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <StoreLocator />
                </Suspense>
              );
            }} />
            <Route path="/careers" component={Careers} />
            <Route path="/careers/:position" component={() => {
              const CareersDetail = lazy(() => import("./pages/careers-detail"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <CareersDetail />
                </Suspense>
              );
            }} />
            <Route path="/careers/apply/:position?" component={() => {
              const CareersApply = lazy(() => import("./pages/careers-apply"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <CareersApply />
                </Suspense>
              );
            }} />
            <Route path="/influencer-collab" component={InfluencerCollab} />
            <Route path="/affiliate" component={() => {
              const AffiliatePage = lazy(() => import("./pages/affiliate"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <AffiliatePage />
                </Suspense>
              );
            }} />
            <Route path="/affiliate-application" component={AffiliateApplicationPage} />
            <Route path="/affiliate-dashboard" component={() => {
              const AffiliateDashboard = lazy(() => import("./pages/affiliate-dashboard"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <AffiliateDashboard />
                </Suspense>
              );
            }} />
            <Route path="/affiliate-wallet" component={() => {
              const AffiliateWallet = lazy(() => import("./pages/affiliate-wallet"));
              return (
                <Suspense fallback={<LoadingSpinner />}>
                  <AffiliateWallet />
                </Suspense>
              );
            }} />
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;