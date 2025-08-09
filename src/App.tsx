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
      staleTime: 1000 * 60, // cache for 1 min
      gcTime: 1000 * 60 * 5, // garbage collect after 5 mins
      refetchOnWindowFocus: false,
      retry: 2,
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
