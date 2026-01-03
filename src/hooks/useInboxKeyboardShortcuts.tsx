import { useEffect, useCallback } from 'react';
import { Conversation } from '@/hooks/useConversations';

interface UseInboxKeyboardShortcutsProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation | null) => void;
  onStatusChange: (id: string, status: Conversation['status']) => void;
  onToggleDetails: () => void;
  onFocusSearch: () => void;
  onFocusMessageInput: () => void;
  onShowHelp: () => void;
  enabled?: boolean;
}

export function useInboxKeyboardShortcuts({
  conversations,
  selectedConversation,
  onSelectConversation,
  onStatusChange,
  onToggleDetails,
  onFocusSearch,
  onFocusMessageInput,
  onShowHelp,
  enabled = true,
}: UseInboxKeyboardShortcutsProps) {
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle shortcuts when typing in input/textarea (except specific ones)
    const target = e.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // Handle Escape - works even when input is focused
    if (e.key === 'Escape') {
      if (isInputFocused) {
        (target as HTMLInputElement).blur();
      } else {
        onSelectConversation(null);
      }
      return;
    }

    // Handle Cmd/Ctrl+K - global search shortcut
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      onFocusSearch();
      return;
    }
    
    // Block other shortcuts when typing
    if (isInputFocused) return;
    
    const currentIndex = conversations.findIndex(c => c.id === selectedConversation?.id);
    
    switch (e.key.toLowerCase()) {
      case 'j':
      case 'arrowdown':
        e.preventDefault();
        if (currentIndex < conversations.length - 1) {
          onSelectConversation(conversations[currentIndex + 1]);
        } else if (currentIndex === -1 && conversations.length > 0) {
          onSelectConversation(conversations[0]);
        }
        break;
        
      case 'k':
      case 'arrowup':
        e.preventDefault();
        if (currentIndex > 0) {
          onSelectConversation(conversations[currentIndex - 1]);
        }
        break;
        
      case 'enter':
      case 'o':
        if (!selectedConversation && conversations.length > 0) {
          onSelectConversation(conversations[0]);
        }
        break;
        
      case '/':
        e.preventDefault();
        onFocusSearch();
        break;
        
      case 'r':
        if (selectedConversation) {
          e.preventDefault();
          onFocusMessageInput();
        }
        break;
        
      case 'e':
        if (selectedConversation) {
          e.preventDefault();
          onStatusChange(selectedConversation.id, 'resolved');
        }
        break;
        
      case 'a':
        if (selectedConversation) {
          e.preventDefault();
          onStatusChange(selectedConversation.id, 'archived');
        }
        break;
        
      case 'i':
        if (selectedConversation) {
          e.preventDefault();
          onToggleDetails();
        }
        break;
        
      case '1':
        if (selectedConversation) {
          onStatusChange(selectedConversation.id, 'open');
        }
        break;
        
      case '2':
        if (selectedConversation) {
          onStatusChange(selectedConversation.id, 'pending');
        }
        break;
        
      case '3':
        if (selectedConversation) {
          onStatusChange(selectedConversation.id, 'resolved');
        }
        break;
        
      case '4':
        if (selectedConversation) {
          onStatusChange(selectedConversation.id, 'archived');
        }
        break;
        
      case '?':
        e.preventDefault();
        onShowHelp();
        break;
    }
  }, [conversations, selectedConversation, onSelectConversation, onStatusChange, onToggleDetails, onFocusSearch, onFocusMessageInput, onShowHelp]);

  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
