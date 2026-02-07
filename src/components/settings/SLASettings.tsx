import { useState, useEffect } from 'react';
import { Plus, Clock, AlertTriangle, CheckCircle, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSLAPolicies, SLAPolicy, SLAPolicyInsert } from '@/hooks/useSLAPolicies';
import { useSLATracking } from '@/hooks/useSLATracking';
import { SLAPolicyCard } from './sla/SLAPolicyCard';
import { SLAPolicyDialog } from './sla/SLAPolicyDialog';
import { useBusiness } from '@/hooks/useBusiness';

export function SLASettings() {
  const { business, loading: businessLoading } = useBusiness();
  const { policies, loading, createPolicy, updatePolicy, deletePolicy, setAsDefault } = useSLAPolicies();
  const { getSLAMetrics } = useSLATracking();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  const [metrics, setMetrics] = useState<{
    total_conversations: number;
    first_response_compliance_rate: number | null;
    resolution_compliance_rate: number | null;
    first_response_breach_count: number;
    resolution_breach_count: number;
  } | null>(null);

  useEffect(() => {
    if (business?.id) {
      getSLAMetrics().then(setMetrics);
    }
  }, [getSLAMetrics, business?.id]);

  const handleEdit = (policy: SLAPolicy) => {
    setEditingPolicy(policy);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPolicy(null);
    setDialogOpen(true);
  };

  const handleSave = async (policyData: Omit<SLAPolicyInsert, 'business_id'>) => {
    if (editingPolicy) {
      await updatePolicy(editingPolicy.id, policyData);
    } else {
      await createPolicy(policyData);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updatePolicy(id, { is_active: isActive });
  };

  if (loading || businessLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Business Found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            You need to create or join a business to manage SLA policies.
            Complete the onboarding process to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SLA Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              First Response Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.first_response_compliance_rate !== null 
                ? `${metrics.first_response_compliance_rate}%`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolution Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.resolution_compliance_rate !== null 
                ? `${metrics.resolution_compliance_rate}%`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Total Breaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {(metrics?.first_response_breach_count || 0) + (metrics?.resolution_breach_count || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Policies Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>SLA Policies</CardTitle>
            <CardDescription>
              Configure response and resolution time targets
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Policy
          </Button>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No SLA Policies</h3>
              <p className="text-muted-foreground mb-4">
                Create your first SLA policy to start tracking response times
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Policy
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map(policy => (
                <SLAPolicyCard
                  key={policy.id}
                  policy={policy}
                  onEdit={handleEdit}
                  onDelete={deletePolicy}
                  onSetDefault={setAsDefault}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SLAPolicyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        policy={editingPolicy}
        onSave={handleSave}
      />
    </div>
  );
}
