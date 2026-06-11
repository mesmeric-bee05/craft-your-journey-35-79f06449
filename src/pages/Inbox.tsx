import { useState, useRef, useCallback } from 'react';
import { Keyboard } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ChatView } from '@/components/inbox/ChatView';
import { CustomerDetails } from '@/components/inbox/CustomerDetails';
import { InboxEmptyState } from '@/components/inbox/InboxEmptyState';
import { KeyboardShortcutsDialog } from '@/components/inbox/KeyboardShortcutsDialog';
import { useConversations } from '@/hooks/useConversations';
import { useInboxKeyboardShortcuts } from '@/hooks/useInboxKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SEO } from '@/components/seo/SEO';

export default function Inbox() {
  const {
    conversations,
    loading,
    selectedConversation,
    selectConversation,
    updateConversationStatus,
    assignConversation,
    markAsRead,
    filterByStatus,
    filterByChannel,
    filterByAssignee,
    activeFilters,
    refetch,
    searchQuery,
    setSearchQuery,
    searching,
    filteredConversations,
  } = useConversations();

  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<{ focus: () => void }>(null);

  const handleSelectConversation = useCallback((conversation: typeof selectedConversation) => {
    selectConversation(conversation);
    if (conversation) {
      markAsRead(conversation.id);
    }
  }, [selectConversation, markAsRead]);

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleFocusMessageInput = useCallback(() => {
    messageInputRef.current?.focus();
  }, []);

  const handleToggleDetails = useCallback(() => {
    setShowCustomerDetails(prev => !prev);
  }, []);

  const handleShowHelp = useCallback(() => {
    setShowShortcutsHelp(true);
  }, []);

  // Use keyboard shortcuts
  useInboxKeyboardShortcuts({
    conversations: filteredConversations,
    selectedConversation,
    onSelectConversation: handleSelectConversation,
    onStatusChange: updateConversationStatus,
    onToggleDetails: handleToggleDetails,
    onFocusSearch: handleFocusSearch,
    onFocusMessageInput: handleFocusMessageInput,
    onShowHelp: handleShowHelp,
  });

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex rounded-xl overflow-hidden border border-border bg-card relative">
        {/* Keyboard shortcuts help button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 h-8 w-8 opacity-60 hover:opacity-100"
              onClick={() => setShowShortcutsHelp(true)}
            >
              <Keyboard className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
        </Tooltip>

        {/* Conversation List */}
        <div className={cn(
          'w-80 border-r border-border flex-shrink-0',
          selectedConversation ? 'hidden md:block' : 'w-full md:w-80'
        )}>
          <ConversationList
            ref={searchInputRef}
            conversations={filteredConversations}
            loading={loading}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            onFilterStatus={filterByStatus}
            onFilterChannel={filterByChannel}
            onFilterAssignee={filterByAssignee}
            activeFilters={activeFilters}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searching={searching}
          />
        </div>

        {/* Chat View */}
        <div className={cn(
          'flex-1 flex flex-col',
          !selectedConversation && 'hidden md:flex'
        )}>
          {selectedConversation ? (
            <ChatView
              conversation={selectedConversation}
              onBack={() => selectConversation(null)}
              onToggleDetails={handleToggleDetails}
              onStatusChange={updateConversationStatus}
              onAssign={assignConversation}
              messageInputRef={messageInputRef}
            />
          ) : (
            <InboxEmptyState onDataSeeded={refetch} />
          )}
        </div>

        {/* Customer Details Sidebar */}
        {selectedConversation && showCustomerDetails && (
          <div className="w-80 border-l border-border hidden lg:block">
            <CustomerDetails
              customer={selectedConversation.customer}
              conversation={selectedConversation}
              onClose={() => setShowCustomerDetails(false)}
            />
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </DashboardLayout>
  );
}
