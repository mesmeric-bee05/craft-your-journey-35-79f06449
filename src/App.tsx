import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireOnboarding } from "@/components/auth/RequireOnboarding";
import { MFAChallenge } from "@/components/auth/MFAChallenge";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Inbox from "./pages/Inbox";
import Marketing from "./pages/Marketing";
import Social from "./pages/Social";
import Talent from "./pages/Talent";
import Settings from "./pages/Settings";
import LiveStudio from "./pages/LiveStudio";
import Analytics from "./pages/Analytics";
import Payments from "./pages/Payments";
import HelpCenter from "./pages/HelpCenter";
import Inventory from "./pages/Inventory";
import NotFound from "./pages/NotFound";
import Customers from "./pages/Customers";
import Automations from "./pages/Automations";
import Reports from "./pages/Reports";
import Index from "./pages/Index";
import ResetPassword from "./pages/ResetPassword";
import Wellness from "./pages/Wellness";
import Competitors from "./pages/Competitors";
import Vision from "./pages/Vision";
import SecurityDashboard from "./pages/SecurityDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>
    <RequireOnboarding>{children}</RequireOnboarding>
  </RequireAuth>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mfa-challenge" element={<RequireAuth><MFAChallenge /></RequireAuth>} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
            <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
            <Route path="/talent" element={<ProtectedRoute><Talent /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/live" element={<ProtectedRoute><LiveStudio /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/automations" element={<ProtectedRoute><Automations /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/wellness" element={<ProtectedRoute><Wellness /></ProtectedRoute>} />
            <Route path="/competitors" element={<ProtectedRoute><Competitors /></ProtectedRoute>} />
            <Route path="/vision" element={<ProtectedRoute><Vision /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
