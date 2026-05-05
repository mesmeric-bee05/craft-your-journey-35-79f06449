import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Send,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { UnifiedComposer } from '@/components/social/UnifiedComposer';
import { PlatformPreviews } from '@/components/social/PlatformPreviews';
import { ContentCalendar } from '@/components/marketing/ContentCalendar';
import { SocialAnalyticsDashboard } from '@/components/social/SocialAnalyticsDashboard';
import { PostTemplateDialog } from '@/components/social/PostTemplateDialog';
import { useScheduledPosts } from '@/hooks/useScheduledPosts';
import { usePostTemplates, type CreateTemplateData, type UpdateTemplateData } from '@/hooks/usePostTemplates';
import { PLATFORM_CONFIGS } from '@/components/social/platformConfig';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type PostTemplate = Database['public']['Tables']['post_templates']['Row'];
type ChannelType = Database['public']['Enums']['channel_type'];

export default function Social() {
  const [composerContent, setComposerContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PostTemplate | null>(null);
  
  const { posts, loading: postsLoading } = useScheduledPosts();
  const { 
    templates, 
    loading: templatesLoading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    duplicateTemplate,
    refetch: refetchTemplates 
  } = usePostTemplates();

  const scheduledPosts = posts.filter((p) => p.status === 'scheduled');
  const publishedPosts = posts.filter((p) => p.status === 'published');
  const failedPosts = posts.filter((p) => p.status === 'failed');

  const handleSaveTemplate = async (data: {
    name: string;
    content: string;
    category?: string;
    platforms?: ChannelType[];
    hashtags?: string[];
  }) => {
    if (editingTemplate) {
      const success = await updateTemplate(editingTemplate.id, data as UpdateTemplateData);
      if (success) {
        await refetchTemplates();
        setEditingTemplate(null);
      }
      return success;
    } else {
      const result = await createTemplate(data as CreateTemplateData);
      if (result) {
        await refetchTemplates();
      }
      return !!result;
    }
  };

  const handleEditTemplate = (template: PostTemplate) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteTemplate(id);
  };

  const handleDuplicateTemplate = async (id: string) => {
    await duplicateTemplate(id);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Social Media Manager</h1>
            <p className="text-muted-foreground">
              Create, schedule, and manage posts across all platforms
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold">{scheduledPosts.length}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{publishedPosts.length}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList>
            <TabsTrigger value="compose" className="gap-2">
              <Send className="w-4 h-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2">
              <Clock className="w-4 h-4" />
              Scheduled
              {scheduledPosts.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {scheduledPosts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Compose Tab */}
          <TabsContent value="compose">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <UnifiedComposer />
              </div>
              <div className="space-y-4">
                <Card className="h-[600px]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Live Preview</CardTitle>
                    <CardDescription>
                      See how your post will look on each platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-80px)]">
                    <PlatformPreviews
                      content={composerContent}
                      selectedPlatforms={selectedPlatforms}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Scheduled Tab */}
          <TabsContent value="scheduled">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Posts</CardTitle>
                <CardDescription>
                  Posts waiting to be published
                </CardDescription>
              </CardHeader>
              <CardContent>
                {postsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : scheduledPosts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No scheduled posts</p>
                    <p className="text-sm">Create a new post and schedule it for later</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {scheduledPosts.map((post) => {
                        const platformConfig = PLATFORM_CONFIGS[post.channel_type];
                        const Icon = platformConfig?.icon;

                        return (
                          <div
                            key={post.id}
                            className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                          >
                            <div
                              className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                platformConfig?.bgColor || 'bg-muted'
                              )}
                            >
                              {Icon && <Icon className={cn('w-5 h-5', platformConfig?.color)} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{platformConfig?.name || post.channel_type}</Badge>
                                {getStatusIcon(post.status)}
                              </div>
                              <p className="text-sm line-clamp-2">{post.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Scheduled for {format(new Date(post.scheduled_for), 'MMM d, yyyy HH:mm')}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <ContentCalendar />
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Post Templates</CardTitle>
                    <CardDescription>
                      Save and reuse your best performing content
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateNew}>
                    <FileText className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No templates yet</p>
                    <p className="text-sm">Create templates to speed up your content creation</p>
                    <Button className="mt-4" onClick={handleCreateNew}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Your First Template
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <Card key={template.id} className="group hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <div className="flex items-center gap-1">
                              {template.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {template.category}
                                </Badge>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateTemplate(template.id)}>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {template.content}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            {template.platforms?.map((platform) => {
                              const config = PLATFORM_CONFIGS[platform];
                              if (!config) return null;
                              const Icon = config.icon;
                              return (
                                <Icon
                                  key={platform}
                                  className={cn('w-4 h-4', config.color)}
                                />
                              );
                            })}
                            <span className="text-xs text-muted-foreground ml-auto">
                              Used {template.usage_count || 0} times
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <PostTemplateDialog
              open={templateDialogOpen}
              onOpenChange={setTemplateDialogOpen}
              template={editingTemplate}
              onSave={handleSaveTemplate}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <SocialAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
