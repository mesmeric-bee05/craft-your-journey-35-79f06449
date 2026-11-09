import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CultureProvider } from "@/lib/culture/CultureProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireOnboarding } from "@/components/auth/RequireOnboarding";
import { OfflineIndicator } from "@/pwa/OfflineIndicator";

const MFAChallenge = lazy(() =>
  import("./components/auth/MFAChallenge").then(({ MFAChallenge }) => ({ default: MFAChallenge })),
);
const Auth = lazy(() => import("./pages/Auth"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Social = lazy(() => import("./pages/Social"));
const Talent = lazy(() => import("./pages/Talent"));
const Settings = lazy(() => import("./pages/Settings"));
const LiveStudio = lazy(() => import("./pages/LiveStudio"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Payments = lazy(() => import("./pages/Payments"));
const Till = lazy(() => import("./pages/Till"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Inventory = lazy(() => import("./pages/Inventory"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Customers = lazy(() => import("./pages/Customers"));
const Automations = lazy(() => import("./pages/Automations"));
const Reports = lazy(() => import("./pages/Reports"));
const Index = lazy(() => import("./pages/Index"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Wellness = lazy(() => import("./pages/Wellness"));
const Competitors = lazy(() => import("./pages/Competitors"));
const Vision = lazy(() => import("./pages/Vision"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const Feedback = lazy(() => import("./pages/Feedback"));
const FeedbackPublic = lazy(() => import("./pages/FeedbackPublic"));
const GeoIntel = lazy(() => import("./pages/GeoIntel"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const BusinessPublic = lazy(() => import("./pages/BusinessPublic"));
const Bundles = lazy(() => import("./pages/Bundles"));
const SecurityFindings = lazy(() => import("./pages/SecurityFindings"));
const AdminHealth = lazy(() => import("./pages/AdminHealth"));
const BestTimesToPostKenya = lazy(() => import("./pages/resources/BestTimesToPostKenya"));
const AdminSEO = lazy(() => import("./pages/AdminSEO"));
const AdminMonitoring = lazy(() => import("./pages/admin/AdminMonitoring"));
const SaccoAdmin = lazy(() => import("./pages/admin/SaccoAdmin"));
const SaccoDetail = lazy(() => import("./pages/admin/SaccoDetail"));
const SaccosPublic = lazy(() => import("./pages/partners/SaccosPublic"));
const Capital = lazy(() => import("./pages/Capital"));
const CapitalAdmin = lazy(() => import("./pages/admin/CapitalAdmin"));
const CapitalAuditPage = lazy(() => import("./pages/admin/CapitalAuditPage"));
const CapitalOpsPage = lazy(() => import("./pages/admin/CapitalOpsPage"));
const OfflineTest = lazy(() => import("./pages/OfflineTest"));
const ConnectAssistant = lazy(() => import("./pages/ConnectAssistant"));

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

const RouteLoading = () => (
  <main className="flex min-h-[50vh] items-center justify-center" aria-live="polite" aria-busy="true">
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
      Loading SmartReach…
    </div>
  </main>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => (
  <RequireAuth>
    <RequireOnboarding>{children}</RequireOnboarding>
  </RequireAuth>
);

/** Handles provider callbacks that arrive at `/` with a Supabase hash. */
const AuthCallbackGuard = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const isRecovery = params.get('type') === 'recovery';
    const hasOAuthCallback = Boolean(params.get('access_token') || params.get('code'));
    const pendingDestination = sessionStorage.getItem('post_auth_next');
    const hasPendingOAuth = Boolean(pendingDestination && pendingDestination.startsWith('/') && !pendingDestination.startsWith('//'));

    if (isRecovery && location.pathname !== '/reset-password') {
      navigate(`/reset-password${window.location.search}${window.location.hash}`, { replace: true });
      return;
    }

    if (!loading && user && (hasOAuthCallback || hasPendingOAuth) && location.pathname === '/') {
      const destination = hasPendingOAuth ? pendingDestination! : '/dashboard';
      sessionStorage.removeItem('post_auth_next');
      navigate(destination, { replace: true });
    }
  }, [loading, user, location.pathname, navigate]);

  return null;
};

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
              <AuthCallbackGuard />
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
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
                  <Route path="/till" element={<ProtectedRoute><Till /></ProtectedRoute>} />
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
                  <Route path="/settings/ai-assistant" element={<ProtectedRoute><ConnectAssistant /></ProtectedRoute>} />
                  <Route path="/settings/offline-test" element={<ProtectedRoute><OfflineTest /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </CultureProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
