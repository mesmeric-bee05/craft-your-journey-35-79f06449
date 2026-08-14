import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CultureProvider } from "@/lib/culture/CultureProvider";
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
import Feedback from "./pages/Feedback";
import FeedbackPublic from "./pages/FeedbackPublic";
import GeoIntel from "./pages/GeoIntel";
import PublicProfilePage from "./pages/PublicProfilePage";
import BusinessPublic from "./pages/BusinessPublic";
import Bundles from "./pages/Bundles";
import SecurityFindings from "./pages/SecurityFindings";
import AdminHealth from "./pages/AdminHealth";
import BestTimesToPostKenya from "./pages/resources/BestTimesToPostKenya";
import AdminSEO from "./pages/AdminSEO";
import AdminMonitoring from "./pages/admin/AdminMonitoring";
import SaccoAdmin from "./pages/admin/SaccoAdmin";
import SaccoDetail from "./pages/admin/SaccoDetail";
import SaccosPublic from "./pages/partners/SaccosPublic";
import Capital from "./pages/Capital";
import CapitalAdmin from "./pages/admin/CapitalAdmin";
import CapitalAuditPage from "./pages/admin/CapitalAuditPage";
import CapitalOpsPage from "./pages/admin/CapitalOpsPage";
import OfflineTest from "./pages/OfflineTest";
import { OfflineIndicator } from "@/pwa/OfflineIndicator";

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
          <CultureProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/feedback/:slug" element={<FeedbackPublic />} />
            <Route path="/biz/:slug" element={<BusinessPublic />} />
            <Route path="/resources/best-times-to-post-kenya" element={<BestTimesToPostKenya />} />
            <Route path="/partners/saccos" element={<SaccosPublic />} />
            <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
            <Route path="/geo" element={<ProtectedRoute><GeoIntel /></ProtectedRoute>} />
            <Route path="/public-profile" element={<ProtectedRoute><PublicProfilePage /></ProtectedRoute>} />
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
            <Route path="/security" element={<ProtectedRoute><SecurityDashboard /></ProtectedRoute>} />
            <Route path="/security/findings" element={<ProtectedRoute><SecurityFindings /></ProtectedRoute>} />
            <Route path="/bundles" element={<ProtectedRoute><Bundles /></ProtectedRoute>} />
            <Route path="/admin/monitoring" element={<ProtectedRoute><AdminMonitoring /></ProtectedRoute>} />
            <Route path="/admin/monitoring/:tab" element={<ProtectedRoute><AdminMonitoring /></ProtectedRoute>} />
            <Route path="/admin/health" element={<ProtectedRoute><AdminHealth /></ProtectedRoute>} />
            <Route path="/admin/seo" element={<ProtectedRoute><AdminSEO /></ProtectedRoute>} />
            <Route path="/admin/saccos" element={<ProtectedRoute><SaccoAdmin /></ProtectedRoute>} />
            <Route path="/admin/saccos/:id" element={<ProtectedRoute><SaccoDetail /></ProtectedRoute>} />
            <Route path="/capital" element={<ProtectedRoute><Capital /></ProtectedRoute>} />
            <Route path="/admin/capital" element={<ProtectedRoute><CapitalAdmin /></ProtectedRoute>} />
            <Route path="/admin/capital/audit" element={<ProtectedRoute><CapitalAuditPage /></ProtectedRoute>} />
            <Route path="/admin/capital/ops" element={<ProtectedRoute><CapitalOpsPage /></ProtectedRoute>} />
            <Route path="/settings/offline-test" element={<ProtectedRoute><OfflineTest /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
          </CultureProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
