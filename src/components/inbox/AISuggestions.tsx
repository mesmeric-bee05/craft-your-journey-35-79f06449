import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/hooks/useMessages';

interface AISuggestionsProps {
  messages: Message[];
  customerName: string;
  onUseSuggestion: (suggestion: string) => void;
  onClose: () => void;
}

export function AISuggestions({ messages, customerName, onUseSuggestion, onClose }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: invokeError } = await supabase.functions.invoke('suggest-reply', {
          body: {
            messages: messages.slice(-10),
            customerName,
          },
        });

        if (invokeError) throw invokeError;

        setSuggestions(data?.suggestions || []);
      } catch (err: any) {
        setError(err.message || 'Failed to generate suggestions');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [messages, customerName]);

  return (
    <div className="border-b border-border bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-primary" />
          AI-Powered Reply Suggestions
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Generating suggestions...
        </div>
      ) : error ? (
        <div className="text-sm text-destructive py-2">
          {error}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          No suggestions available for this conversation.
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onUseSuggestion(suggestion)}
              className="w-full text-left p-3 rounded-lg bg-background border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
