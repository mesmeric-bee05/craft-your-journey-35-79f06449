import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Calendar, Loader2, Sparkles, ShoppingCart, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DemandForecastProps {
  products: any[];
}

export function DemandForecast({ products }: DemandForecastProps) {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<string | null>(null);

  // Generate mock forecast data based on actual products
  const forecastData = products.slice(0, 8).map((p: any) => {
    const current = p.current_stock || 0;
    const reorderLevel = p.reorder_level || 5;
    const daysUntilStockout = current > 0 ? Math.floor(current / Math.max(1, reorderLevel / 7)) : 0;
    return {
      name: p.name?.substring(0, 12) || 'Product',
      currentStock: current,
      predictedDemand: Math.floor(current * 0.8 + Math.random() * 20),
      daysLeft: daysUntilStockout,
      reorderLevel,
      needsReorder: current <= reorderLevel,
    };
  });

  const urgentReorders = forecastData.filter(f => f.needsReorder);

  // Kenyan market events that affect demand
  const upcomingEvents = [
    { name: 'Month-End Salary Week', daysAway: Math.floor(Math.random() * 10) + 1, impact: 'high' },
    { name: 'School Opening Season', daysAway: Math.floor(Math.random() * 30) + 10, impact: 'medium' },
    { name: 'Weekend Market Rush', daysAway: Math.max(1, 6 - new Date().getDay()), impact: 'medium' },
  ];

  const generateAIForecast = async () => {
    setLoading(true);
    try {
      const productSummary = products.slice(0, 10).map((p: any) =>
        `${p.name}: ${p.current_stock} units in stock, reorder at ${p.reorder_level}, sells at KES ${p.selling_price}`
      ).join('\n');

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: `You are a demand forecasting AI for Kenyan SMEs. Analyze this inventory:\n\n${productSummary}\n\nProvide: 1) Which products will stock out first, 2) Optimal reorder quantities based on Kenyan market patterns (salary cycles, weekends, holidays), 3) Flash sale timing recommendations, 4) One specific actionable insight. Use KES currency and Kenyan business context. Be concise.`,
          type: 'forecast',
        },
      });
      if (error) throw error;
      setForecast(data?.content || data?.text || 'Forecast generated.');
      toast.success('AI demand forecast generated');
    } catch {
      toast.error('Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            SmartReach Predict — Demand Forecasting
          </h3>
          <p className="text-sm text-muted-foreground">AI-powered inventory intelligence for Kenyan market patterns</p>
        </div>
        <Button variant="outline" size="sm" onClick={generateAIForecast} disabled={loading || products.length === 0} className="gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          AI Forecast
        </Button>
      </div>

      {/* Urgent Reorder Alerts */}
      {urgentReorders.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">
                {urgentReorders.length} product{urgentReorders.length > 1 ? 's' : ''} need reordering
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {urgentReorders.map(r => (
                <Badge key={r.name} variant="destructive" className="text-xs">
                  {r.name}: {r.currentStock} left
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock vs Demand Chart */}
        {forecastData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Stock vs Predicted Demand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="currentStock" fill="hsl(var(--primary))" name="Current Stock" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="predictedDemand" fill="hsl(var(--chart-5))" name="Predicted Demand" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Market Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Market Events Affecting Demand
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map(event => (
              <div key={event.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{event.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{event.daysAway}d away</span>
                  <Badge variant={event.impact === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {event.impact} impact
                  </Badge>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground italic">
              💡 M-Pesa salary cycle: Peak demand 25th-5th of each month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Forecast */}
      {forecast && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">AI Demand Intelligence</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-line">{forecast}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
