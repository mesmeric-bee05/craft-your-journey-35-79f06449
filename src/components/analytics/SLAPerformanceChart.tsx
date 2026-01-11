import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

interface SLAPerformanceChartProps {
  dateRange: number;
}

// Mock data - in production this would come from the database
const generateMockData = (days: number) => {
  const data = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      firstResponse: Math.floor(Math.random() * 30) + 70,
      resolution: Math.floor(Math.random() * 25) + 75,
    });
  }
  return data;
};

const chartConfig = {
  firstResponse: {
    label: 'First Response',
    color: 'hsl(var(--chart-1))',
  },
  resolution: {
    label: 'Resolution',
    color: 'hsl(var(--chart-2))',
  },
};

export function SLAPerformanceChart({ dateRange }: SLAPerformanceChartProps) {
  const data = generateMockData(Math.min(dateRange, 30));

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA Compliance Trend</CardTitle>
        <CardDescription>
          First response and resolution compliance rates over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="firstResponse"
                stroke="var(--color-firstResponse)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="resolution"
                stroke="var(--color-resolution)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-1))]" />
            <span className="text-sm text-muted-foreground">First Response</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-2))]" />
            <span className="text-sm text-muted-foreground">Resolution</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
