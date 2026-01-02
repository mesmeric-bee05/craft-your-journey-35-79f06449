import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ChatView } from '@/components/inbox/ChatView';
import { CustomerDetails } from '@/components/inbox/CustomerDetails';
import { InboxEmptyState } from '@/components/inbox/InboxEmptyState';
import { useConversations } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

export default function Inbox() {
  const {
    conversations,
    loading,
    selectedConversation,
    selectConversation,
    updateConversationStatus,
    markAsRead,
    filterByStatus,
    filterByChannel,
    activeFilters,
    refetch,
    searchQuery,
    setSearchQuery,
    searching,
  } = useConversations();

  const [showCustomerDetails, setShowCustomerDetails] = useState(true);

  const handleSelectConversation = (conversation: typeof selectedConversation) => {
    selectConversation(conversation);
    if (conversation) {
      markAsRead(conversation.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex rounded-xl overflow-hidden border border-border bg-card">
        {/* Conversation List */}
        <div className={cn(
          'w-80 border-r border-border flex-shrink-0',
          selectedConversation ? 'hidden md:block' : 'w-full md:w-80'
        )}>
          <ConversationList
            conversations={conversations}
            loading={loading}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            onFilterStatus={filterByStatus}
            onFilterChannel={filterByChannel}
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
              onToggleDetails={() => setShowCustomerDetails(!showCustomerDetails)}
              onStatusChange={updateConversationStatus}
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
    </DashboardLayout>
  );
}
