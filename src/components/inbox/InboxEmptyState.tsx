import { useState } from 'react';
import { MessageSquare, ArrowRight, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';

interface InboxEmptyStateProps {
  onDataSeeded?: () => void;
}

export function InboxEmptyState({ onDataSeeded }: InboxEmptyStateProps) {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const handleLoadSampleData = async () => {
    if (!business?.id) {
      toast({ 
        title: 'No business found', 
        description: 'Please complete onboarding first.', 
        variant: 'destructive' 
      });
      return;
    }

    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-inbox-data', {
        body: { business_id: business.id },
      });

      if (error) throw error;

      toast({ 
        title: 'Sample data loaded!', 
        description: `Created ${data.customersCreated} customers, ${data.conversationsCreated} conversations, and ${data.quickRepliesCreated || 0} quick replies.` 
      });
      
      onDataSeeded?.();
    } catch (err: any) {
      console.error('Error seeding data:', err);
      toast({ 
        title: 'Failed to load sample data', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Choose a conversation from the list to view messages and respond to your customers.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          variant="default" 
          className="gap-2"
          onClick={handleLoadSampleData}
          disabled={seeding}
        >
          {seeding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          <span>{seeding ? 'Loading...' : 'Load Sample Data'}</span>
        </Button>
        <Button variant="outline" className="gap-2">
          <span>Connect a channel</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
