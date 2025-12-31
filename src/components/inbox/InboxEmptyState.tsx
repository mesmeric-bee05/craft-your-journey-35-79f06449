import { MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InboxEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
      <p className="text-muted-foreground max-w-sm mb-4">
        Choose a conversation from the list to view messages and respond to your customers.
      </p>
      <Button variant="outline" className="gap-2">
        <span>Connect a channel</span>
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
