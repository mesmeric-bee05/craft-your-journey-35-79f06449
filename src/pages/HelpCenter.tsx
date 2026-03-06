import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  HelpCircle, Search, MessageSquare, Book, Video, Keyboard,
  Zap, Users, Settings, BarChart3, Wallet, Sparkles,
  ArrowRight, Play, CheckCircle, ExternalLink,
} from 'lucide-react';
import { useFAQs } from '@/hooks/useFAQs';
import { useToast } from '@/hooks/use-toast';
import { AIChatWidget } from '@/components/help/AIChatWidget';
import { HelpContactSection } from '@/components/help/HelpContactSection';
import { GettingStartedGuide } from '@/components/help/GettingStartedGuide';
import { VideoTutorialsSection } from '@/components/help/VideoTutorialsSection';
import { KeyboardShortcutsSection } from '@/components/help/KeyboardShortcutsSection';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  getting_started: Zap,
  features: Sparkles,
  team: Users,
  billing: Wallet,
  live: Video,
  settings: Settings,
  analytics: BarChart3,
};

export default function HelpCenter() {
  const { faqs, loading: faqsLoading } = useFAQs();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('faq');

  const guideRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef<HTMLDivElement>(null);
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const quickLinks = [
    { title: 'Getting Started Guide', icon: Book, action: () => scrollTo(guideRef) },
    { title: 'Video Tutorials', icon: Video, action: () => scrollTo(videosRef) },
    { title: 'Keyboard Shortcuts', icon: Keyboard, action: () => scrollTo(shortcutsRef) },
    { title: 'API Documentation', icon: ExternalLink, action: () => {
      toast({ title: 'API Docs', description: 'API documentation coming soon. Check back later!' });
    }},
  ];

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, typeof faqs>);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">How can we help you?</h1>
          <p className="text-muted-foreground mt-2">Search our knowledge base or chat with our AI assistant</p>
          <div className="relative mt-6 max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div>

        {/* Quick Links - Now functional */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Card
              key={link.title}
              className="cursor-pointer hover:shadow-medium hover:border-primary/30 transition-all group"
              onClick={link.action}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <link.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="font-medium text-sm">{link.title}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Getting Started Guide */}
        <div ref={guideRef}>
          <GettingStartedGuide />
        </div>

        {/* Video Tutorials */}
        <div ref={videosRef}>
          <VideoTutorialsSection />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="faq" className="gap-2"><Book className="w-4 h-4" />FAQ</TabsTrigger>
            <TabsTrigger value="contact" className="gap-2"><MessageSquare className="w-4 h-4" />Contact Support</TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
            <div ref={faqRef}>
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Find quick answers to common questions</CardDescription>
                </CardHeader>
                <CardContent>
                  {faqsLoading ? (
                    <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                  ) : filteredFAQs.length === 0 ? (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No results found</h3>
                      <p className="text-muted-foreground">Try adjusting your search or contact support</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedFAQs).map(([category, categoryFaqs]) => {
                        const CategoryIcon = categoryIcons[category] || HelpCircle;
                        return (
                          <div key={category}>
                            <div className="flex items-center gap-2 mb-3">
                              <CategoryIcon className="w-5 h-5 text-primary" />
                              <h3 className="font-semibold capitalize">{category.replace('_', ' ')}</h3>
                              <Badge variant="secondary" className="ml-2">{categoryFaqs.length}</Badge>
                            </div>
                            <Accordion type="single" collapsible className="space-y-2">
                              {categoryFaqs.map((faq) => (
                                <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                                  <AccordionTrigger className="hover:no-underline"><span className="text-left">{faq.question}</span></AccordionTrigger>
                                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contact">
            <HelpContactSection />
          </TabsContent>
        </Tabs>

        {/* Keyboard Shortcuts */}
        <div ref={shortcutsRef}>
          <KeyboardShortcutsSection />
        </div>
      </div>

      <AIChatWidget />
    </DashboardLayout>
  );
}
