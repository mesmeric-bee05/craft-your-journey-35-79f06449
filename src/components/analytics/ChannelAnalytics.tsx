import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Clock, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';

interface ChannelAnalyticsProps {
  dateRange: number;
}

interface ChannelMetrics {
  channel_type: string;
  total_conversations: number;
  resolved_conversations: number;
  avg_response_time: number;
}

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  telegram: '#0088cc',
  sms: '#6B7280',
  email: '#EA4335',
  tiktok: '#000000',
};

const chartConfig = {
  conversations: {
    label: 'Conversations',
    color: 'hsl(var(--chart-1))',
  },
};

export function ChannelAnalytics({ dateRange }: ChannelAnalyticsProps) {
  const { business } = useBusiness();
  const [channels, setChannels] = useState<ChannelMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannelMetrics = useCallback(async () => {
    if (!business?.id) return;

    try {
      setLoading(true);
      const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString();

      // Get conversations grouped by channel
      const { data: conversationData } = await supabase
        .from('conversations')
        .select('channel_type, status')
        .eq('business_id', business.id)
        .gte('created_at', startDate);

      if (!conversationData) {
        setChannels([]);
        return;
      }

      // Group by channel
      const channelMap = new Map<string, { total: number; resolved: number }>();
      
      conversationData.forEach((conv) => {
        const current = channelMap.get(conv.channel_type) || { total: 0, resolved: 0 };
        current.total += 1;
        if (conv.status === 'resolved') {
          current.resolved += 1;
        }
        channelMap.set(conv.channel_type, current);
      });

      // Get average response times per channel from SLA tracking
      const { data: slaData } = await supabase
        .from('sla_tracking')
        .select(`
          first_response_time,
          conversations!inner (
            channel_type,
            business_id
          )
        `)
        .eq('conversations.business_id', business.id)
        .gte('created_at', startDate)
        .not('first_response_time', 'is', null);

      const responseTimeMap = new Map<string, number[]>();
      slaData?.forEach((sla: any) => {
        const channel = sla.conversations?.channel_type;
        if (channel && sla.first_response_time) {
          const times = responseTimeMap.get(channel) || [];
          times.push(sla.first_response_time);
          responseTimeMap.set(channel, times);
        }
      });

      // Build final metrics
      const metrics: ChannelMetrics[] = [];
      channelMap.forEach((value, key) => {
        const times = responseTimeMap.get(key) || [];
        const avgTime = times.length > 0
          ? times.reduce((a, b) => a + b, 0) / times.length
          : 0;

        metrics.push({
          channel_type: key,
          total_conversations: value.total,
          resolved_conversations: value.resolved,
          avg_response_time: avgTime,
        });
      });

      setChannels(metrics.sort((a, b) => b.total_conversations - a.total_conversations));
    } catch (error) {
      console.error('Error fetching channel metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [business?.id, dateRange]);

  useEffect(() => {
    fetchChannelMetrics();
  }, [fetchChannelMetrics]);

  const totalConversations = channels.reduce((sum, c) => sum + c.total_conversations, 0);

  const pieData = channels.map((c) => ({
    name: c.channel_type,
    value: c.total_conversations,
    color: CHANNEL_COLORS[c.channel_type] || '#6B7280',
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Channel Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
            <CardDescription>
              Conversation volume by channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : channels.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No channel data available</p>
              </div>
            ) : (
              <>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {channels.map((channel) => (
                    <div key={channel.channel_type} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHANNEL_COLORS[channel.channel_type] || '#6B7280' }}
                      />
                      <span className="text-sm capitalize">{channel.channel_type}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Channel Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Conversations by Channel</CardTitle>
            <CardDescription>
              Total conversations in the last {dateRange} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : channels.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No channel data available</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channels} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="channel_type"
                      width={80}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_conversations" radius={[0, 4, 4, 0]}>
                      {channels.map((entry) => (
                        <Cell
                          key={entry.channel_type}
                          fill={CHANNEL_COLORS[entry.channel_type] || '#6B7280'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Channel Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
          <CardDescription>
            Detailed metrics for each communication channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading channel data...
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No channel data available</p>
              <p className="text-sm">Connect channels to see performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {channels.map((channel) => {
                const percentage = totalConversations > 0
                  ? (channel.total_conversations / totalConversations) * 100
                  : 0;
                const resolutionRate = channel.total_conversations > 0
                  ? (channel.resolved_conversations / channel.total_conversations) * 100
                  : 0;

                return (
                  <div
                    key={channel.channel_type}
                    className="p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${CHANNEL_COLORS[channel.channel_type] || '#6B7280'}20`,
                          }}
                        >
                          <MessageSquare
                            className="w-5 h-5"
                            style={{ color: CHANNEL_COLORS[channel.channel_type] || '#6B7280' }}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium capitalize">{channel.channel_type}</h4>
                          <p className="text-sm text-muted-foreground">
                            {percentage.toFixed(1)}% of total volume
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {channel.total_conversations} conversations
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Users className="w-3 h-3" />
                          <span>Resolved</span>
                        </div>
                        <span className="font-medium">
                          {channel.resolved_conversations}
                        </span>
                        <Progress value={resolutionRate} className="h-1 mt-1" />
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Clock className="w-3 h-3" />
                          <span>Avg Response</span>
                        </div>
                        <span className="font-medium">
                          {channel.avg_response_time > 0
                            ? `${channel.avg_response_time.toFixed(0)} min`
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
