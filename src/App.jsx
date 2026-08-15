import React, { lazy, Suspense } from "react";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { queryClientInstance } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ROUTE_ACCESS, routesFor } from "@/config/routeManifest";
import { lazyPages } from "@/routes/lazyPages";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "@/components/ScrollToTop";
import ProtectedRoute, { LoginRedirect } from "@/components/ProtectedRoute";
import RequireCapability from "@/components/auth/RequireCapability";
import PageLoader from "@/components/shared/PageLoader";
import ErrorState from "@/components/shared/ErrorState";

const DashboardLayout = lazy(() => import("@/components/dashboard/DashboardLayout"));
const FeedbackButton = lazy(() => import("@/components/feedback/FeedbackButton"));
const PageNotFound = lazy(() => import("@/lib/PageNotFound"));

function elementFor(route) {
  if (route.redirectTo) return <Navigate to={route.redirectTo} replace />;
  const Page = lazyPages[route.page];
  const page = <Page />;
  return route.minRole
    ? <RequireCapability minRole={route.minRole}>{page}</RequireCapability>
    : page;
}

function renderRouteSet(access) {
  return routesFor(access).map((route) => (
    <Route key={route.id} path={route.path} element={elementFor(route)} />
  ));
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, checkAppState } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoader label="Loading On The Run Electrics" />;
  }

  if (authError) {
    if (authError.type === "user_not_registered") return <UserNotRegisteredError />;
    if (authError.type === "auth_required") return <LoginRedirect />;
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <ErrorState className="max-w-lg" onRetry={checkAppState} />
      </main>
    );
  }

  return (
    <Suspense fallback={<PageLoader label="Loading page" />}>
      <Routes>
        {renderRouteSet(ROUTE_ACCESS.PUBLIC)}
        <Route element={<ProtectedRoute unauthenticatedElement={<LoginRedirect />} />}>
          {renderRouteSet(ROUTE_ACCESS.AUTHENTICATED)}
          <Route element={<DashboardLayout />}>
            {renderRouteSet(ROUTE_ACCESS.STAFF)}
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
              <Suspense fallback={null}><FeedbackButton /></Suspense>
            </Router>
            <SonnerToaster />
          </QueryClientProvider>
        </AuthProvider>
      </HelmetProvider>
    </AppErrorBoundary>
  );
}
