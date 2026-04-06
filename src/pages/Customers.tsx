import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Users, RefreshCw } from 'lucide-react';
import { useCustomers, type Customer } from '@/hooks/useCustomers';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { CustomerStats } from '@/components/customers/CustomerStats';
import { CustomerDNA } from '@/components/customers/CustomerDNA';
import { AddEditCustomerDialog } from '@/components/customers/AddEditCustomerDialog';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Customers() {
  const {
    customers, loading, searchQuery, setSearchQuery,
    channelFilter, setChannelFilter, tagFilter, setTagFilter,
    createCustomer, updateCustomer, deleteCustomer, refetch, allTags,
  } = useCustomers();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = async (data: Partial<Customer>) => {
    if (editCustomer) {
      await updateCustomer(editCustomer.id, data);
    } else {
      await createCustomer(data);
    }
    setEditCustomer(null);
  };

  const handleEdit = (c: Customer) => {
    setEditCustomer(c);
    setDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteCustomer(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Customers
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your customer relationships and contacts
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button className="gap-2" onClick={() => { setEditCustomer(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </div>
        </div>

        {/* Stats */}
        <CustomerStats customers={customers} />

        {/* Customer DNA Intelligence */}
        {customers.length > 0 && <CustomerDNA customers={customers} />}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Channels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="twitter">Twitter/X</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
            </SelectContent>
          </Select>
          {allTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Tags" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl border bg-card">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No customers yet</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery || channelFilter !== 'all'
                ? 'No customers match your filters. Try adjusting your search.'
                : 'Add your first customer to get started with CRM.'}
            </p>
            {!searchQuery && channelFilter === 'all' && (
              <Button className="mt-4 gap-2" onClick={() => { setEditCustomer(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" /> Add Customer
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteId(id)}
                onViewConversations={(c) => navigate(`/inbox?customer=${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <AddEditCustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editCustomer}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this customer and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
