import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireOnboarding } from "@/components/auth/RequireOnboarding";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Inbox from "./pages/Inbox";
import Marketing from "./pages/Marketing";
import Talent from "./pages/Talent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <RequireOnboarding>
                    <Dashboard />
                  </RequireOnboarding>
                </RequireAuth>
              }
            />
            <Route
              path="/inbox"
              element={
                <RequireAuth>
                  <RequireOnboarding>
                    <Inbox />
                  </RequireOnboarding>
                </RequireAuth>
              }
            />
            <Route
              path="/marketing"
              element={
                <RequireAuth>
                  <RequireOnboarding>
                    <Marketing />
                  </RequireOnboarding>
                </RequireAuth>
              }
            />
            <Route
              path="/talent"
              element={
                <RequireAuth>
                  <RequireOnboarding>
                    <Talent />
                  </RequireOnboarding>
                </RequireAuth>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
