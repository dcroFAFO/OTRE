import { Toaster } from "@/components/ui/toaster"
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
import GuestBooking from '@/pages/GuestBooking';
import ProfileSetup from '@/pages/ProfileSetup';
import Portal from '@/pages/Portal';
import Store from '@/pages/Store';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import FeedbackRating from '@/pages/FeedbackRating';
import PublicTrack from '@/pages/PublicTrack';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Overview from '@/pages/dashboard/Overview';
import Jobs from '@/pages/dashboard/Jobs';
import Calendar from '@/pages/dashboard/Calendar';
import Invoices from '@/pages/dashboard/Invoices';
import Notifications from '@/pages/dashboard/Notifications';
import Parts from '@/pages/dashboard/Parts';
import AdminFeedback from '@/pages/admin/AdminFeedback';
import AdminClients from '@/pages/admin/AdminClients';
import AdminActivityLog from '@/pages/admin/AdminActivityLog';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import SystemSettings from '@/pages/settings/SystemSettings';
import AssetManagement from '@/pages/AssetManagement';
import ServicePricing from '@/pages/ServicePricing';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/book" element={<BookAccount />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/book/guest" element={<GuestBooking />} />
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route path="/portal" element={<Portal />} />
      <Route path="/store" element={<Store />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/feedback" element={<FeedbackRating />} />
      <Route path="/track/:jobId" element={<PublicTrack />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="parts" element={<Parts />} />
      </Route>
      <Route element={<DashboardLayout />}>
        <Route path="/settings" element={<SystemSettings />} />
        <Route path="/asset-management" element={<AssetManagement />} />
        <Route path="/service-pricing" element={<ServicePricing />} />
      </Route>
      <Route path="/customers" element={<Navigate to="/admin/clients" replace />} />
      <Route path="/job-board" element={<Navigate to="/dashboard/jobs" replace />} />
      <Route path="/parts-catalogue" element={<Navigate to="/dashboard/parts" replace />} />
      <Route path="/admin/feedback" element={<AdminFeedback />} />
      <Route path="/admin/clients" element={<AdminClients />} />
      <Route path="/admin/activity" element={<AdminActivityLog />} />
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
        <Toaster />
        <SonnerToaster />
        </QueryClientProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App