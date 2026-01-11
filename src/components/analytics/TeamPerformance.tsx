import { useEffect, useState, useCallback } from 'react';
import { Users, Clock, MessageSquare, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';

interface TeamPerformanceProps {
  dateRange: number;
}

interface AgentMetrics {
  user_id: string;
  full_name: string;
  total_conversations: number;
  resolved_conversations: number;
  avg_response_time: number;
  avg_rating: number;
}

export function TeamPerformance({ dateRange }: TeamPerformanceProps) {
  const { business } = useBusiness();
  const [agents, setAgents] = useState<AgentMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeamMetrics = useCallback(async () => {
    if (!business?.id) return;

    try {
      setLoading(true);
      
      // Get team members
      const { data: members } = await supabase
        .from('business_members')
        .select(`
          user_id,
          profiles!business_members_user_id_fkey (
            full_name
          )
        `)
        .eq('business_id', business.id)
        .eq('is_active', true);

      if (!members) {
        setAgents([]);
        return;
      }

      // For each member, calculate their metrics
      const metricsPromises = members.map(async (member: any) => {
        const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString();

        // Get conversation counts
        const { count: totalConversations } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', member.user_id)
          .gte('created_at', startDate);

        const { count: resolvedConversations } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', member.user_id)
          .eq('status', 'resolved')
          .gte('created_at', startDate);

        // Get average SLA response time
        const { data: slaData } = await supabase
          .from('sla_tracking')
          .select('first_response_time')
          .eq('conversation_id', member.user_id)
          .not('first_response_time', 'is', null);

        const avgResponseTime = slaData?.length
          ? slaData.reduce((sum, s) => sum + (s.first_response_time || 0), 0) / slaData.length
          : 0;

        // Get average CSAT
        const { data: csatData } = await supabase
          .from('csat_responses')
          .select('rating')
          .eq('assigned_agent_id', member.user_id)
          .gte('responded_at', startDate);

        const avgRating = csatData?.length
          ? csatData.reduce((sum, c) => sum + c.rating, 0) / csatData.length
          : 0;

        return {
          user_id: member.user_id,
          full_name: member.profiles?.full_name || 'Unknown',
          total_conversations: totalConversations || 0,
          resolved_conversations: resolvedConversations || 0,
          avg_response_time: avgResponseTime,
          avg_rating: avgRating,
        };
      });

      const metrics = await Promise.all(metricsPromises);
      setAgents(metrics.sort((a, b) => b.total_conversations - a.total_conversations));
    } catch (error) {
      console.error('Error fetching team metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [business?.id, dateRange]);

  useEffect(() => {
    fetchTeamMetrics();
  }, [fetchTeamMetrics]);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-500';
    if (rating >= 3.5) return 'text-yellow-500';
    if (rating >= 2.5) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Performance
          </CardTitle>
          <CardDescription>
            Individual agent metrics for the last {dateRange} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading team metrics...
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No team data available</p>
              <p className="text-sm">Add team members to see their performance</p>
            </div>
          ) : (
            <div className="space-y-4">
              {agents.map((agent) => {
                const resolutionRate = agent.total_conversations > 0
                  ? (agent.resolved_conversations / agent.total_conversations) * 100
                  : 0;

                return (
                  <div
                    key={agent.user_id}
                    className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {agent.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">{agent.full_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {agent.total_conversations} conversations
                          </p>
                        </div>
                      </div>
                      {agent.avg_rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 ${getRatingColor(agent.avg_rating)}`} />
                          <span className={`font-medium ${getRatingColor(agent.avg_rating)}`}>
                            {agent.avg_rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>Resolved</span>
                        </div>
                        <span className="font-medium">
                          {agent.resolved_conversations} / {agent.total_conversations}
                        </span>
                        <Progress value={resolutionRate} className="h-1 mt-1" />
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Clock className="w-3 h-3" />
                          <span>Avg Response</span>
                        </div>
                        <span className="font-medium">
                          {agent.avg_response_time > 0 
                            ? `${agent.avg_response_time.toFixed(0)} min` 
                            : 'N/A'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Resolution Rate</span>
                        </div>
                        <Badge variant={resolutionRate >= 80 ? 'default' : 'secondary'}>
                          {resolutionRate.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
