import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dna, TrendingUp, TrendingDown, Users, Star, AlertTriangle, Heart, Zap } from 'lucide-react';

interface CustomerDNAProps {
  customers: any[];
}

const SEGMENTS = [
  { name: 'Champions', description: 'High LTV, frequent buyers', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { name: 'Loyal', description: 'Consistent purchasers', icon: Heart, color: 'text-green-500', bg: 'bg-green-500/10' },
  { name: 'At-Risk', description: 'Previously active, now dormant', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { name: 'New', description: 'First or second contact', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { name: 'Lost', description: 'No activity in 90+ days', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
];

export function CustomerDNA({ customers }: CustomerDNAProps) {
  // Generate segment distribution based on actual customer data
  const now = new Date();
  const segments = customers.reduce((acc: Record<string, number>, c: any) => {
    const lastContact = c.last_contact_at ? new Date(c.last_contact_at) : null;
    const firstContact = c.first_contact_at ? new Date(c.first_contact_at) : null;
    const daysSinceContact = lastContact ? Math.floor((now.getTime() - lastContact.getTime()) / 86400000) : 999;
    const daysSinceFirst = firstContact ? Math.floor((now.getTime() - firstContact.getTime()) / 86400000) : 0;

    if (daysSinceContact > 90) acc['Lost'] = (acc['Lost'] || 0) + 1;
    else if (daysSinceContact > 30) acc['At-Risk'] = (acc['At-Risk'] || 0) + 1;
    else if (daysSinceFirst < 14) acc['New'] = (acc['New'] || 0) + 1;
    else if (daysSinceContact < 7) acc['Champions'] = (acc['Champions'] || 0) + 1;
    else acc['Loyal'] = (acc['Loyal'] || 0) + 1;

    return acc;
  }, {});

  const total = customers.length || 1;

  // Channel distribution
  const channels = customers.reduce((acc: Record<string, number>, c: any) => {
    acc[c.channel_type || 'unknown'] = (acc[c.channel_type || 'unknown'] || 0) + 1;
    return acc;
  }, {});

  // Churn risk overview
  const atRiskCount = (segments['At-Risk'] || 0) + (segments['Lost'] || 0);
  const churnRate = total > 0 ? Math.round((atRiskCount / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Dna className="w-5 h-5 text-primary" />
          Customer DNA Intelligence
        </h3>
        <p className="text-sm text-muted-foreground">AI-powered customer segmentation & churn prediction</p>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {SEGMENTS.map(seg => {
          const count = segments[seg.name] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <Card key={seg.name} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${seg.bg}`}>
                  <seg.icon className={`w-3.5 h-3.5 ${seg.color}`} />
                </div>
                <span className="text-xs font-medium">{seg.name}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{count}</p>
              <p className="text-[10px] text-muted-foreground">{pct}% of customers</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Churn Risk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Churn Risk Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">At-risk + Lost customers</span>
              <Badge variant={churnRate > 30 ? 'destructive' : churnRate > 15 ? 'secondary' : 'default'}>
                {churnRate}% churn risk
              </Badge>
            </div>
            <Progress value={100 - churnRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {atRiskCount > 0
                ? `💡 ${atRiskCount} customer${atRiskCount > 1 ? 's' : ''} need${atRiskCount === 1 ? 's' : ''} a follow-up. Send a personalized WhatsApp message to re-engage.`
                : '✅ Customer retention looks healthy!'}
            </p>
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Channel Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(channels)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([channel, count]) => (
                <div key={channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm capitalize">{channel.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={((count as number) / total) * 100} className="w-20 h-1.5" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            <p className="text-xs text-muted-foreground italic mt-2">
              Focus engagement on the top channel — meet customers where they are.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
