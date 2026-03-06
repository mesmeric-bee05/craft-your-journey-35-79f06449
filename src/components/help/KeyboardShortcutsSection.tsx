import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Keyboard } from 'lucide-react';

const shortcuts = [
  { keys: ['⌘', 'K'], action: 'Open global search' },
  { keys: ['⌘', 'N'], action: 'New message' },
  { keys: ['⌘', 'E'], action: 'Mark as resolved' },
  { keys: ['⌘', '↵'], action: 'Send message' },
  { keys: ['J'], action: 'Next conversation' },
  { keys: ['K'], action: 'Previous conversation' },
  { keys: ['R'], action: 'Reply to message' },
  { keys: ['/'], action: 'Open quick replies' },
  { keys: ['?'], action: 'Show all shortcuts' },
];

export function KeyboardShortcutsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Keyboard className="w-5 h-5" />Keyboard Shortcuts</CardTitle>
        <CardDescription>Speed up your workflow with these handy shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((shortcut, i) => (
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
  );
}
