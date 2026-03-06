import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Mail, Phone, Clock, CheckCircle2, Send } from 'lucide-react';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useToast } from '@/hooks/use-toast';

export function HelpContactSection() {
  const { createTicket } = useSupportTickets();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '', description: '', category: 'general', priority: 'normal',
  });

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.description) return;
    setSubmitting(true);
    try {
      await createTicket(ticketForm);
      toast({ title: 'Support ticket created', description: 'We will get back to you within 24 hours.' });
      setTicketForm({ subject: '', description: '', category: 'general', priority: 'normal' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create support ticket.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
  );
}
