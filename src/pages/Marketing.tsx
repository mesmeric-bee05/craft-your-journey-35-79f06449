import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Copy, Check, Star, Clock, Loader2, Calendar, Video, Radio, ExternalLink, Users } from 'lucide-react';
import { useAIContent, AIContent } from '@/hooks/useAIContent';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceStrict } from 'date-fns';
import { ContentCalendar } from '@/components/marketing/ContentCalendar';

export default function Marketing() {
  const navigate = useNavigate();
  const { contentHistory, generating, generateContent, rateContent, markAsUsed } = useAIContent();
  const { campaigns } = useCampaigns();
  const { streams, isStreaming, stream } = useLiveStream();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState<AIContent['content_type']>('caption');
  const [language, setLanguage] = useState('en');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const recentStreams = streams.filter(s => s.status === 'ended').slice(0, 3);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Please enter a prompt', variant: 'destructive' });
      return;
    }

    const content = await generateContent({
      prompt,
      contentType,
      language,
      tone,
      platform: platform || undefined,
    });

    if (content) {
      setGeneratedContent(content);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Marketing Suite</h1>
          <p className="text-muted-foreground">Generate engaging content with AI assistance</p>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">AI Generator</TabsTrigger>
            <TabsTrigger value="history">Content History</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2">
              <Video className="w-4 h-4" />
              Go Live
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Content Generator
                  </CardTitle>
                  <CardDescription>Describe what you want to create</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select value={contentType} onValueChange={(v) => setContentType(v as AIContent['content_type'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="caption">Social Media Caption</SelectItem>
                        <SelectItem value="description">Product Description</SelectItem>
                        <SelectItem value="email">Marketing Email</SelectItem>
                        <SelectItem value="sms">SMS Message</SelectItem>
                        <SelectItem value="ad_copy">Ad Copy</SelectItem>
                        <SelectItem value="hashtags">Hashtags</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="sw">Swahili</SelectItem>
                          <SelectItem value="sheng">Sheng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="humorous">Humorous</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Platform (optional)</Label>
                    <Input 
                      placeholder="e.g., Instagram, WhatsApp, Facebook" 
                      value={platform} 
                      onChange={(e) => setPlatform(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Your Prompt</Label>
                    <Textarea
                      placeholder="Describe your product, service, or the message you want to convey..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button onClick={handleGenerate} disabled={generating} className="w-full">
                    {generating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Generate Content</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Output Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>Your AI-generated content will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedContent ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted min-h-[200px] whitespace-pre-wrap">
                        {generatedContent}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleCopy} className="flex-1">
                          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                        <Button variant="outline" onClick={() => setGeneratedContent('')}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                      <p>Your generated content will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Content History</CardTitle>
                <CardDescription>Previously generated content</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {contentHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No content generated yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contentHistory.map((item) => (
                        <div key={item.id} className="p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">{item.content_type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {format(new Date(item.created_at), 'MMM d, HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">Prompt: {item.prompt}</p>
                          <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                          <div className="flex items-center gap-2 mt-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} onClick={() => rateContent(item.id, star)}>
                                <Star className={`w-4 h-4 ${item.rating && item.rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>Campaigns</CardTitle>
                <CardDescription>Manage your marketing campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No campaigns yet</p>
                    <Button className="mt-4">Create Campaign</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{campaign.name}</h4>
                          <Badge>{campaign.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <ContentCalendar />
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Live Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Live Streaming
                  </CardTitle>
                  <CardDescription>
                    Stream to multiple platforms simultaneously
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isStreaming && stream ? (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="destructive" className="animate-pulse">
                          <Radio className="w-3 h-3 mr-1" />
                          LIVE NOW
                        </Badge>
                        <span className="text-sm font-medium">{stream.title}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {stream.viewer_count || 0} viewers
                        </span>
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        onClick={() => navigate('/live')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Live Studio
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        No active stream. Start a new broadcast.
                      </p>
                      <Button onClick={() => navigate('/live')}>
                        <Video className="w-4 h-4 mr-2" />
                        Open Live Studio
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Streams */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Streams</CardTitle>
                  <CardDescription>Your past broadcasts</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentStreams.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No past streams yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentStreams.map((pastStream) => (
                        <div
                          key={pastStream.id}
                          className="p-3 rounded-lg border border-border"
                        >
                          <h4 className="font-medium text-sm truncate">
                            {pastStream.title}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {pastStream.peak_viewers || 0} peak viewers
                            </span>
                            {pastStream.ended_at && pastStream.started_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceStrict(
                                  new Date(pastStream.ended_at),
                                  new Date(pastStream.started_at)
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stream Features */}
            <Card>
              <CardHeader>
                <CardTitle>Streaming Features</CardTitle>
                <CardDescription>What you can do with Live Studio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Video className="w-8 h-8 text-primary mb-2" />
                    <h4 className="font-medium">Multi-Platform</h4>
                    <p className="text-sm text-muted-foreground">
                      Stream to Facebook, YouTube, TikTok and more
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Radio className="w-8 h-8 text-primary mb-2" />
                    <h4 className="font-medium">Real-time Chat</h4>
                    <p className="text-sm text-muted-foreground">
                      Engage with your audience live
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Users className="w-8 h-8 text-primary mb-2" />
                    <h4 className="font-medium">Viewer Analytics</h4>
                    <p className="text-sm text-muted-foreground">
                      Track viewer count and engagement
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Sparkles className="w-8 h-8 text-primary mb-2" />
                    <h4 className="font-medium">Screen Sharing</h4>
                    <p className="text-sm text-muted-foreground">
                      Share your screen for presentations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
