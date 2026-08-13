import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Landing from '@/pages/Landing';
import BookAccount from '@/pages/BookAccount';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Terms from '@/pages/Terms';
import GuestBooking from '@/pages/GuestBooking';
import ProfileSetup from '@/pages/ProfileSetup';
import PortalSettings from '@/pages/PortalSettings';
import PortalAccount from '@/pages/PortalAccount';
import Store from '@/pages/Store';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';
import FeedbackRating from '@/pages/FeedbackRating';
import PublicTrack from '@/pages/PublicTrack';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Overview from '@/pages/dashboard/Overview';
import Jobs from '@/pages/dashboard/Jobs';
import Calendar from '@/pages/dashboard/Calendar';
import Invoices from '@/pages/dashboard/Invoices';
import Parts from '@/pages/dashboard/Parts';
import AdminFeedback from '@/pages/admin/AdminFeedback';
import AdminClients from '@/pages/admin/AdminClients';
import AdminActivityLog from '@/pages/admin/AdminActivityLog';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import SystemSettings from '@/pages/settings/SystemSettings';
import ServicePricingAdmin from '@/pages/settings/ServicePricingAdmin';
import AssetManagement from '@/pages/AssetManagement';
import ServicePricing from '@/pages/ServicePricing';
import BlogIndex from '@/pages/blog/BlogIndex';
import BlogPostPage from '@/pages/blog/BlogPostPage';
import BlogCategoryPage from '@/pages/blog/BlogCategoryPage';
import BlogTagPage from '@/pages/blog/BlogTagPage';
import BlogDashboard from '@/pages/blog-admin/BlogDashboard';
import BlogPosts from '@/pages/blog-admin/BlogPosts';
import BlogEditor from '@/pages/blog-admin/BlogEditor';
import BlogGenerator from '@/pages/blog-admin/BlogGenerator';
import BlogTaxonomy from '@/pages/blog-admin/BlogTaxonomy';
import BlogSettings from '@/pages/blog-admin/BlogSettings';
import BlogLogs from '@/pages/blog-admin/BlogLogs';
import ProtectedRoute, { LoginRedirect } from '@/components/ProtectedRoute';
import RequireCapability from '@/components/auth/RequireCapability';
import PageLoader from '@/components/shared/PageLoader';
import ErrorState from '@/components/shared/ErrorState';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, checkAppState } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoader label="Loading On The Run Electrics" />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <LoginRedirect />;
    }
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <ErrorState className="max-w-lg" onRetry={checkAppState} />
      </main>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/book" element={<BookAccount />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/book/guest" element={<GuestBooking />} />
      <Route path="/store" element={<Store />} />
      <Route path="/service-pricing" element={<ServicePricing />} />
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/blog/category/:slug" element={<BlogCategoryPage />} />
      <Route path="/blog/tag/:slug" element={<BlogTagPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />
      <Route path="/feedback" element={<FeedbackRating />} />
      <Route path="/track/:jobId" element={<PublicTrack />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<LoginRedirect />} />}>
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/portal" element={<PortalAccount />} />
        <Route path="/portal/settings" element={<PortalSettings />} />
        <Route path="/portal/account" element={<Navigate to="/portal" replace />} />

        <Route element={<DashboardLayout />}>
          <Route path="/dashboard">
            <Route index element={<Overview />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="parts" element={<RequireCapability minRole="admin"><Parts /></RequireCapability>} />
            <Route path="blog" element={<RequireCapability minRole="admin"><BlogDashboard /></RequireCapability>} />
            <Route path="blog/posts" element={<RequireCapability minRole="admin"><BlogPosts /></RequireCapability>} />
            <Route path="blog/posts/:id" element={<RequireCapability minRole="admin"><BlogEditor /></RequireCapability>} />
            <Route path="blog/generate" element={<RequireCapability minRole="admin"><BlogGenerator /></RequireCapability>} />
            <Route path="blog/taxonomy" element={<RequireCapability minRole="admin"><BlogTaxonomy /></RequireCapability>} />
            <Route path="blog/settings" element={<RequireCapability minRole="admin"><BlogSettings /></RequireCapability>} />
            <Route path="blog/logs" element={<RequireCapability minRole="admin"><BlogLogs /></RequireCapability>} />
          </Route>
          <Route path="/settings" element={<RequireCapability minRole="admin"><SystemSettings /></RequireCapability>} />
          <Route path="/settings/service-pricing" element={<RequireCapability minRole="admin"><ServicePricingAdmin /></RequireCapability>} />
          <Route path="/asset-management" element={<RequireCapability minRole="technician"><AssetManagement /></RequireCapability>} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/activity" element={<AdminActivityLog />} />
          <Route path="/customers" element={<Navigate to="/admin/clients" replace />} />
          <Route path="/job-board" element={<Navigate to="/dashboard/jobs" replace />} />
          <Route path="/parts-catalogue" element={<Navigate to="/dashboard/parts" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <HelmetProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
          <FeedbackButton />
        </Router>
        <SonnerToaster />
        </QueryClientProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App
