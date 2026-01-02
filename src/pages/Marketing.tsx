import { useState } from 'react';
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
import { Sparkles, Copy, Check, Star, Clock, Loader2, Calendar } from 'lucide-react';
import { useAIContent, AIContent } from '@/hooks/useAIContent';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ContentCalendar } from '@/components/marketing/ContentCalendar';

export default function Marketing() {
  const { contentHistory, generating, generateContent, rateContent, markAsUsed } = useAIContent();
  const { campaigns } = useCampaigns();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState<AIContent['content_type']>('caption');
  const [language, setLanguage] = useState('en');
  const [tone, setTone] = useState('professional');
  const [platform, setPlatform] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
