import { ReactNode } from 'react';
import { Search, Zap, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuickReplies } from '@/hooks/useQuickReplies';
import { useState } from 'react';

interface QuickRepliesPopoverProps {
  children: ReactNode;
  onSelect: (content: string) => void;
}

export function QuickRepliesPopover({ children, onSelect }: QuickRepliesPopoverProps) {
  const { quickReplies, loading, incrementUsage } = useQuickReplies();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredReplies = quickReplies.filter((reply) =>
    reply.title.toLowerCase().includes(search.toLowerCase()) ||
    reply.content.toLowerCase().includes(search.toLowerCase()) ||
    reply.shortcut?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (reply: typeof quickReplies[0]) => {
    onSelect(reply.content);
    incrementUsage(reply.id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-medium">Quick Replies</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        <ScrollArea className="max-h-64">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {quickReplies.length === 0 
                ? 'No quick replies yet. Create one to get started!'
                : 'No matching templates found'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredReplies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => handleSelect(reply)}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{reply.title}</span>
                    {reply.shortcut && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        /{reply.shortcut}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {reply.content}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
