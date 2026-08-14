import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SEO } from "@/components/seo/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Activity, Search, ShieldCheck } from "lucide-react";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { SystemHealthPanel } from "@/components/admin/SystemHealthPanel";
import { SEOMonitorPanel } from "@/components/admin/SEOMonitorPanel";
import { SecurityAuditTrail } from "@/components/admin/SecurityAuditTrail";
import { SecurityScanPanel } from "@/components/admin/SecurityScanPanel";
import { useSecurityNotifications } from "@/hooks/useSecurityAudit";

const TABS = ["health", "seo", "security"] as const;
type TabKey = (typeof TABS)[number];

const META: Record<TabKey, { title: string; description: string; heading: string }> = {
  health: {
    title: "System health — SmartReach",
    description: "Monitor scheduled jobs, security scans and alerts.",
    heading: "System Health",
  },
  seo: {
    title: "SEO monitor — SmartReach",
    description: "Indexing status, audit results, and Google Search Console controls.",
    heading: "SEO Monitor",
  },
  security: {
    title: "Security audit — SmartReach",
    description: "Who triggered security scans and which findings changed status.",
    heading: "Security Audit",
  },
};

export default function AdminMonitoring() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const active: TabKey = (TABS as readonly string[]).includes(tab ?? "") ? (tab as TabKey) : "health";
  const { unreadCount } = useSecurityNotifications();
  const meta = META[active];

  return (
    <DashboardLayout>
      <SEO title={meta.title} description={meta.description} path={`/admin/monitoring/${active}`} noindex />
      <RequireAdmin>
        <div className="space-y-6 max-w-5xl mx-auto">
          <div>
            <h1 className="text-3xl font-display font-bold">Admin monitoring</h1>
            <p className="text-muted-foreground">
              Scheduled jobs, security scanning and search visibility in one place.
            </p>
          </div>

          <Tabs
            value={active}
            onValueChange={(v) => navigate(`/admin/monitoring/${v}`, { replace: false })}
          >
            <TabsList>
              <TabsTrigger value="health" className="gap-2">
                <Activity className="h-4 w-4" aria-hidden="true" /> System health
              </TabsTrigger>
              <TabsTrigger value="seo" className="gap-2">
                <Search className="h-4 w-4" aria-hidden="true" /> SEO monitor
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Security audit
                {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="mt-6">
              <h2 className="sr-only">{META.health.heading}</h2>
              <SystemHealthPanel />
            </TabsContent>
            <TabsContent value="seo" className="mt-6">
              <h2 className="sr-only">{META.seo.heading}</h2>
              <SEOMonitorPanel />
            </TabsContent>
            <TabsContent value="security" className="mt-6 space-y-6">
              <h2 className="sr-only">{META.security.heading}</h2>
              <SecurityScanPanel />
              <SecurityAuditTrail />
            </TabsContent>
          </Tabs>
        </div>
      </RequireAdmin>
    </DashboardLayout>
  );
}
