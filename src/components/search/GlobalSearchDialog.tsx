import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import {
  MessageSquare,
  Users,
  Megaphone,
  Briefcase,
  User,
  LayoutDashboard,
  Sparkles,
  Video,
  Wallet,
  BarChart3,
  Settings,
  HelpCircle,
  Loader2,
} from 'lucide-react';

const typeIcons: Record<SearchResult['type'], React.ComponentType<{ className?: string }>> = {
  conversation: MessageSquare,
  customer: Users,
  campaign: Megaphone,
  job: Briefcase,
  freelancer: User,
};

const quickLinks = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Social Inbox', icon: MessageSquare, href: '/inbox' },
  { label: 'AI Marketing', icon: Sparkles, href: '/marketing' },
  { label: 'Live Studio', icon: Video, href: '/live' },
  { label: 'Talent Hub', icon: Users, href: '/talent' },
  { label: 'Payments', icon: Wallet, href: '/payments' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'Help Center', icon: HelpCircle, href: '/help' },
];

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const { results, loading, search, clearResults } = useGlobalSearch();
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        search(query);
      } else {
        clearResults();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search, clearResults]);

  // Clear on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      clearResults();
    }
  }, [open, clearResults]);

  const handleSelect = useCallback((href: string) => {
    onOpenChange(false);
    navigate(href);
  }, [navigate, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search conversations, customers, campaigns..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <CommandEmpty>No results found for "{query}"</CommandEmpty>
        )}

        {/* Search Results */}
        {!loading && results.length > 0 && (
          <CommandGroup heading="Search Results">
            {results.map((result) => {
              const Icon = typeIcons[result.type];
              return (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => handleSelect(result.href)}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{result.title}</span>
                    <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Quick Links (show when no query) */}
        {!query && (
          <>
            <CommandGroup heading="Quick Navigation">
              {quickLinks.map((link) => (
                <CommandItem
                  key={link.href}
                  onSelect={() => handleSelect(link.href)}
                  className="cursor-pointer"
                >
                  <link.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{link.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Tips">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <p>• Search for customers by name, email, or phone</p>
                <p>• Find conversations by subject or content</p>
                <p>• Look up campaigns and job postings</p>
              </div>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
