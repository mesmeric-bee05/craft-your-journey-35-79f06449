import { useEffect } from 'react';
import { Star, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useCSATSurveys } from '@/hooks/useCSATSurveys';
import { Badge } from '@/components/ui/badge';

interface CSATAnalyticsProps {
  dateRange: number;
}

const chartConfig = {
  rating: {
    label: 'Rating',
    color: 'hsl(var(--chart-1))',
  },
  responses: {
    label: 'Responses',
    color: 'hsl(var(--chart-2))',
  },
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export function CSATAnalytics({ dateRange }: CSATAnalyticsProps) {
  const { metrics, byAgent, byChannel, fetchMetrics, fetchByAgent, fetchByChannel } = useCSATSurveys();

  useEffect(() => {
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    fetchMetrics(startDate, endDate);
    fetchByAgent(startDate, endDate);
    fetchByChannel(startDate, endDate);
  }, [dateRange, fetchMetrics, fetchByAgent, fetchByChannel]);

  const ratingDistribution = [
    { name: '1 Star', value: metrics?.rating_1_count || 0 },
    { name: '2 Stars', value: metrics?.rating_2_count || 0 },
    { name: '3 Stars', value: metrics?.rating_3_count || 0 },
    { name: '4 Stars', value: metrics?.rating_4_count || 0 },
    { name: '5 Stars', value: metrics?.rating_5_count || 0 },
  ];

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-500';
    if (rating >= 3.5) return 'text-yellow-500';
    if (rating >= 2.5) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRatingColor(metrics?.avg_rating || 0)}`}>
              {metrics?.avg_rating?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">out of 5 stars</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_responses || 0}</div>
            <p className="text-xs text-muted-foreground">last {dateRange} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(metrics?.nps_score || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics?.nps_score?.toFixed(0) || '0'}
            </div>
            <p className="text-xs text-muted-foreground">-100 to 100 scale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.response_rate?.toFixed(1) || '0'}%</div>
            <p className="text-xs text-muted-foreground">of resolved conversations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>Breakdown of customer ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingDistribution} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {ratingDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* CSAT by Channel */}
        <Card>
          <CardHeader>
            <CardTitle>CSAT by Channel</CardTitle>
            <CardDescription>Average satisfaction rating per channel</CardDescription>
          </CardHeader>
          <CardContent>
            {byChannel.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No channel data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {byChannel.map((channel) => (
                  <div key={channel.channel_type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="capitalize font-medium">{channel.channel_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className={`w-4 h-4 ${getRatingColor(channel.avg_rating)}`} />
                        <span className={`font-medium ${getRatingColor(channel.avg_rating)}`}>
                          {channel.avg_rating.toFixed(1)}
                        </span>
                      </div>
                      <Badge variant="secondary">{channel.total_responses} responses</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CSAT by Agent */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
          <CardDescription>Customer satisfaction ratings by team member</CardDescription>
        </CardHeader>
        <CardContent>
          {byAgent.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No agent data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {byAgent.map((agent) => (
                <div key={agent.agent_id || 'unassigned'} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{agent.agent_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className={`w-4 h-4 ${getRatingColor(agent.avg_rating)}`} />
                      <span className={`font-medium ${getRatingColor(agent.avg_rating)}`}>
                        {agent.avg_rating.toFixed(2)}
                      </span>
                    </div>
                    <Badge variant="outline">{agent.total_responses} responses</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
