import { Switch, Route } from "wouter";
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
// import Contact from "@/pages/contact";
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
import Terms from "./pages/terms";
import Privacy from "./pages/privacy";
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
import Contact from "@/pages/contact";
import NotFound from "@/pages/not-found";
import { lazy, Suspense } from 'react';
import AdminShades from "./pages/admin/shades";

const AdminReports = lazy(() => import("./pages/admin/reports"));

function Router() {
  return (
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
            <Route path="/settings" component={AdminSettings} />
            <Route path="/profile" component={AdminProfile} />
            <Route path="/shades" component={AdminShades} />
            <Route path="/change-password" component={AdminChangePassword} />
             <Route path="/contact-submissions" component={AdminContactSubmissions} />
            <Route path="/reports">
              <Suspense fallback={<div className="flex items-center justify-center h-64">Loading reports...</div>}>
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
            <Route path="/category/:slug" component={Category} />
            <Route path="/products" component={ProductsPage} />
            <Route path="/product/:slug" component={ProductDetail} />
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route path="/auth/login" component={Login} />
            <Route path="/auth/signup" component={Signup} />
            <Route path="/auth/otp-verification" component={OTPVerification} />
            <Route path="/profile" component={Profile} />
            <Route path="/cart" component={CartPage} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/wishlist" component={Wishlist} />
            <Route path="/order-history" component={OrderHistory} />
            <Route path="/track-order" component={TrackOrder} />
            <Route path="/change-password" component={ChangePassword} />
             <Route path="/terms" component={Terms} />
            <Route path="/privacy" component={Privacy} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
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