import { useState, useEffect } from 'react';
import { Plus, Star, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCSATSurveys, CSATSurvey } from '@/hooks/useCSATSurveys';
import { CSATSurveyCard } from './csat/CSATSurveyCard';
import { CSATSurveyDialog } from './csat/CSATSurveyDialog';

export function CSATSettings() {
  const {
    surveys,
    metrics,
    loading,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    setAsDefault,
    fetchMetrics,
  } = useCSATSurveys();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<CSATSurvey | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleEdit = (survey: CSATSurvey) => {
    setEditingSurvey(survey);
    setDialogOpen(true);
  };

  const handleSave = (data: Partial<CSATSurvey>) => {
    if (editingSurvey) {
      updateSurvey(editingSurvey.id, data);
    } else {
      createSurvey(data);
    }
    setEditingSurvey(null);
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateSurvey(id, { is_active: isActive });
  };

  return (
    <div className="space-y-6">
      {/* CSAT Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avg_rating?.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              out of 5 stars
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.total_responses || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.nps_score?.toFixed(0) || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              -100 to 100 scale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.response_rate?.toFixed(1) || '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              of resolved conversations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Surveys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CSAT Surveys</CardTitle>
              <CardDescription>
                Configure customer satisfaction surveys sent after conversations
              </CardDescription>
            </div>
            <Button onClick={() => {
              setEditingSurvey(null);
              setDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Survey
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading surveys...
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No surveys created yet</p>
              <p className="text-sm">
                Create a survey to start collecting customer feedback
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {surveys.map((survey) => (
                <CSATSurveyCard
                  key={survey.id}
                  survey={survey}
                  onEdit={handleEdit}
                  onDelete={deleteSurvey}
                  onToggleActive={handleToggleActive}
                  onSetDefault={setAsDefault}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CSATSurveyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        survey={editingSurvey}
        onSave={handleSave}
      />
    </div>
  );
}
