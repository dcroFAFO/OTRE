import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Landing from '@/pages/Landing';
import BookAccount from '@/pages/BookAccount';
import Portal from '@/pages/Portal';
import Store from '@/pages/Store';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Overview from '@/pages/dashboard/Overview';
import Jobs from '@/pages/dashboard/Jobs';
import Calendar from '@/pages/dashboard/Calendar';
import Inventory from '@/pages/dashboard/Inventory';
import Templates from '@/pages/dashboard/Templates';
import Notifications from '@/pages/dashboard/Notifications';
import Parts from '@/pages/dashboard/Parts';
import AdminFeedback from '@/pages/admin/AdminFeedback';
import AdminClients from '@/pages/admin/AdminClients';
import FeedbackButton from '@/components/feedback/FeedbackButton';

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
      <Route path="/portal" element={<Portal />} />
      <Route path="/store" element={<Store />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="templates" element={<Templates />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="parts" element={<Parts />} />
      </Route>
      <Route path="/admin/feedback" element={<AdminFeedback />} />
      <Route path="/admin/clients" element={<AdminClients />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
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
  )
}

export default App