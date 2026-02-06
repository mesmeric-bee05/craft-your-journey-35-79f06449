import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface ChartData {
  date: string;
  engagement: number;
  posts: number;
}

interface PostPerformanceChartProps {
  data: ChartData[];
}

export function PostPerformanceChart({ data }: PostPerformanceChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    displayDate: format(parseISO(item.date), 'MMM d'),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Engagement Over Time</CardTitle>
        <CardDescription>
          Track how your content performs day by day
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No engagement data available yet
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString(),
                    name === 'engagement' ? 'Total Engagement' : 'Posts'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#engagementGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
