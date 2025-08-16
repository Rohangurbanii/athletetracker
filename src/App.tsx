import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { MobileLayout } from "@/components/layout/MobileLayout";

// Lazy load pages for code splitting
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Practice = lazy(() => import("@/pages/Practice"));
const Sleep = lazy(() => import("@/pages/Sleep"));
const Tournaments = lazy(() => import("@/pages/Tournaments"));
const Progress = lazy(() => import("@/pages/Progress"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AthleteStats = lazy(() => import("@/pages/AthleteStats"));
const MyStats = lazy(() => import("@/pages/MyStats"));

// Lazy load forms for code splitting
const LogSessionForm = lazy(() => import("@/components/forms/LogSessionForm"));
const LogSleepForm = lazy(() => import("@/components/forms/LogSleepForm"));
const SetGoalForm = lazy(() => import("@/components/forms/SetGoalForm"));
const SchedulePracticeForm = lazy(() => import("@/components/forms/SchedulePracticeForm"));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="mobile-container flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // Reduced to 30s to prevent stale data issues on reload
      gcTime: 1000 * 60 * 5, // Reduced to 5 mins
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry on network errors during page reload
        if (failureCount >= 2) return false;
        if (error?.message?.includes('abort')) return false;
        return true;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 2000),
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<MobileLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="practice" element={<Practice />} />
          <Route path="sleep" element={<Sleep />} />
          <Route path="tournaments" element={<Tournaments />} />
          <Route path="progress" element={<Progress />} />
          <Route path="log-session" element={<LogSessionForm />} />
          <Route path="log-sleep" element={<LogSleepForm />} />
          <Route path="set-goal" element={<SetGoalForm />} />
          <Route path="schedule-practice" element={<SchedulePracticeForm />} />
          <Route path="athlete-stats" element={<AthleteStats />} />
          <Route path="my-stats" element={<MyStats />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProtectedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
