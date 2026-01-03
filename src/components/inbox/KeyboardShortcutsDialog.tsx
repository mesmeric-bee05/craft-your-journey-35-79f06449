import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['J', '↓'], description: 'Next conversation' },
      { keys: ['K', '↑'], description: 'Previous conversation' },
      { keys: ['Enter', 'O'], description: 'Open selected conversation' },
      { keys: ['Esc'], description: 'Close conversation / Deselect' },
    ],
  },
  {
    title: 'Search & Global',
    shortcuts: [
      { keys: ['/'], description: 'Focus search' },
      { keys: ['⌘', 'K'], description: 'Global search' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['R'], description: 'Reply (focus message input)' },
      { keys: ['E'], description: 'Mark as resolved' },
      { keys: ['A'], description: 'Archive conversation' },
      { keys: ['I'], description: 'Toggle customer info panel' },
    ],
  },
  {
    title: 'Quick Status',
    shortcuts: [
      { keys: ['1'], description: 'Set status to Open' },
      { keys: ['2'], description: 'Set status to Pending' },
      { keys: ['3'], description: 'Set status to Resolved' },
      { keys: ['4'], description: 'Set status to Archived' },
    ],
  },
];

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium bg-muted border border-border rounded shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and manage your inbox faster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center gap-1">
                          <KeyBadge>{key}</KeyBadge>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground mx-0.5">or</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Press <KeyBadge>?</KeyBadge> anytime to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
