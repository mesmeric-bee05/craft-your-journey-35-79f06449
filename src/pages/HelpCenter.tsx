import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HelpCircle, Search, MessageSquare, Book, Video, Keyboard,
  Mail, Phone, Clock, CheckCircle2, Send, ExternalLink,
  Zap, Users, Settings, BarChart3, Wallet, Sparkles,
} from 'lucide-react';
import { useFAQs } from '@/hooks/useFAQs';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useToast } from '@/hooks/use-toast';
import { AIChatWidget } from '@/components/help/AIChatWidget';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  getting_started: Zap,
  features: Sparkles,
  team: Users,
  billing: Wallet,
  live: Video,
  settings: Settings,
  analytics: BarChart3,
};

const quickLinks = [
  { title: 'Getting Started Guide', href: '#', icon: Book },
  { title: 'Video Tutorials', href: '#', icon: Video },
  { title: 'Keyboard Shortcuts', href: '#', icon: Keyboard },
  { title: 'API Documentation', href: '#', icon: ExternalLink },
];

export default function HelpCenter() {
  const { faqs, loading: faqsLoading } = useFAQs();
  const { createTicket } = useSupportTickets();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'normal',
  });
  const [submitting, setSubmitting] = useState(false);

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.description) return;

    setSubmitting(true);
    try {
      await createTicket(ticketForm);
      toast({
        title: 'Support ticket created',
        description: 'We\'ll get back to you within 24 hours.',
      });
      setTicketForm({ subject: '', description: '', category: 'general', priority: 'normal' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create support ticket.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

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
            <Input placeholder="Search for help..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 h-12 text-lg" />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Card key={link.title} className="cursor-pointer hover:shadow-medium transition-shadow">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <link.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="font-medium text-sm">{link.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="faq" className="gap-2"><Book className="w-4 h-4" />FAQ</TabsTrigger>
            <TabsTrigger value="contact" className="gap-2"><MessageSquare className="w-4 h-4" />Contact Support</TabsTrigger>
          </TabsList>

          <TabsContent value="faq">
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
          </TabsContent>

          <TabsContent value="contact">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Submit a Support Ticket</CardTitle>
                  <CardDescription>Describe your issue and our team will respond within 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={ticketForm.category} onValueChange={(v) => setTicketForm(prev => ({ ...prev, category: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Question</SelectItem>
                            <SelectItem value="technical">Technical Issue</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                            <SelectItem value="feature_request">Feature Request</SelectItem>
                            <SelectItem value="bug_report">Bug Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={ticketForm.priority} onValueChange={(v) => setTicketForm(prev => ({ ...prev, priority: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input placeholder="Brief description of your issue" value={ticketForm.subject} onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea placeholder="Please provide as much detail as possible..." rows={6} value={ticketForm.description} onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))} required />
                    </div>
                    <Button type="submit" className="gap-2" disabled={submitting}>
                      {submitting ? 'Submitting...' : <><Send className="w-4 h-4" />Submit Ticket</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Mail className="w-5 h-5 text-primary" /></div>
                      <div><p className="font-medium">Email Support</p><p className="text-sm text-muted-foreground">support@smartreach.ai</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0"><Phone className="w-5 h-5 text-success" /></div>
                      <div><p className="font-medium">Phone Support</p><p className="text-sm text-muted-foreground">+254 700 000 000</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0"><Clock className="w-5 h-5 text-warning" /></div>
                      <div><p className="font-medium">Business Hours</p><p className="text-sm text-muted-foreground">Mon - Fri: 8am - 6pm EAT</p></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-primary text-primary-foreground">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3"><CheckCircle2 className="w-6 h-6" /><span className="font-semibold">Premium Support</span></div>
                    <p className="text-sm text-primary-foreground/90 mb-4">Get priority support with faster response times and dedicated assistance.</p>
                    <Button variant="secondary" size="sm">Upgrade Plan</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Keyboard className="w-5 h-5" />Keyboard Shortcuts</CardTitle>
            <CardDescription>Speed up your workflow with these handy shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { keys: ['⌘', 'K'], action: 'Open global search' },
                { keys: ['⌘', 'N'], action: 'New message' },
                { keys: ['⌘', 'E'], action: 'Mark as resolved' },
                { keys: ['⌘', '↵'], action: 'Send message' },
                { keys: ['J'], action: 'Next conversation' },
                { keys: ['K'], action: 'Previous conversation' },
                { keys: ['R'], action: 'Reply to message' },
                { keys: ['/'], action: 'Open quick replies' },
                { keys: ['?'], action: 'Show all shortcuts' },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">{shortcut.action}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd key={j} className="px-2 py-1 text-xs font-semibold bg-background border rounded shadow-sm">{key}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat Widget */}
      <AIChatWidget />
    </DashboardLayout>
  );
}
