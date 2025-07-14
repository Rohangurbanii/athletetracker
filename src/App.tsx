import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Practice } from "@/pages/Practice";
import { Sleep } from "@/pages/Sleep";
import { Tournaments } from "@/pages/Tournaments";
import { Analytics } from "@/pages/Analytics";
import { Progress } from "@/pages/Progress";
import { LogSessionForm } from "@/components/forms/LogSessionForm";
import { LogSleepForm } from "@/components/forms/LogSleepForm";
import { SetGoalForm } from "@/components/forms/SetGoalForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<MobileLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="practice" element={<Practice />} />
        <Route path="sleep" element={<Sleep />} />
        <Route path="tournaments" element={<Tournaments />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="progress" element={<Progress />} />
        <Route path="log-session" element={<LogSessionForm />} />
        <Route path="log-sleep" element={<LogSleepForm />} />
        <Route path="set-goal" element={<SetGoalForm />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
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
