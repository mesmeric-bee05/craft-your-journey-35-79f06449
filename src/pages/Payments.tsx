import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Wallet,
  Send,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Smartphone,
  Building2,
  Plus,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions } from '@/hooks/useTransactions';
import { useBusiness } from '@/hooks/useBusiness';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { exportTransactionsToCSV, exportTransactionsToText, type ExportableTransaction } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';

export default function Payments() {
  const { wallet, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const { 
    transactions, 
    loading: transactionsLoading, 
    createTransaction,
    filterByType,
    filterByStatus,
    activeFilters 
  } = useTransactions();
  const { business } = useBusiness();
  const { toast } = useToast();
  
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    amount: '',
    recipientPhone: '',
    recipientName: '',
    description: '',
    paymentMethod: 'mpesa',
  });
  const [depositForm, setDepositForm] = useState({
    amount: '',
    paymentMethod: 'mpesa',
  });
  const [sending, setSending] = useState(false);

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast({
        title: 'No transactions to export',
        description: 'Create some transactions first before exporting.',
        variant: 'destructive',
      });
      return;
    }

    const exportData: ExportableTransaction[] = transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      recipient_name: (t as any).recipient_name,
      recipient_phone: (t as any).recipient_phone,
      description: t.description,
      payment_method: t.payment_method,
      reference: (t as any).external_reference,
      created_at: t.created_at,
      completed_at: (t as any).completed_at,
    }));

    exportTransactionsToCSV(exportData, business?.name);
    toast({
      title: 'Export successful',
      description: 'Your transactions have been exported to CSV.',
    });
  };

  const handleExportReport = () => {
    if (transactions.length === 0) {
      toast({
        title: 'No transactions to export',
        description: 'Create some transactions first before exporting.',
        variant: 'destructive',
      });
      return;
    }

    const exportData: ExportableTransaction[] = transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      recipient_name: (t as any).recipient_name,
      recipient_phone: (t as any).recipient_phone,
      description: t.description,
      payment_method: t.payment_method,
      reference: (t as any).external_reference,
      created_at: t.created_at,
      completed_at: (t as any).completed_at,
    }));

    exportTransactionsToText(exportData, business?.name);
    toast({
      title: 'Report generated',
      description: 'Your transaction report has been downloaded.',
    });
  };

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendForm.amount || !sendForm.recipientPhone) return;
    
    setSending(true);
    try {
      await createTransaction({
        type: 'payment',
        amount: parseFloat(sendForm.amount),
        recipient_phone: sendForm.recipientPhone,
        recipient_name: sendForm.recipientName,
        description: sendForm.description,
        payment_method: sendForm.paymentMethod as 'mpesa' | 'bank' | 'card' | 'wallet',
      });
      setSendDialogOpen(false);
      setSendForm({
        amount: '',
        recipientPhone: '',
        recipientName: '',
        description: '',
        paymentMethod: 'mpesa',
      });
      refetchWallet();
    } finally {
      setSending(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositForm.amount) return;
    
    setSending(true);
    try {
      await createTransaction({
        type: 'deposit',
        amount: parseFloat(depositForm.amount),
        payment_method: depositForm.paymentMethod as 'mpesa' | 'bank' | 'card' | 'wallet',
        description: 'Wallet deposit',
      });
      setDepositDialogOpen(false);
      setDepositForm({ amount: '', paymentMethod: 'mpesa' });
      refetchWallet();
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-success" />;
      case 'withdrawal':
      case 'payment':
      case 'payout':
        return <ArrowUpRight className="w-4 h-4 text-destructive" />;
      case 'refund':
        return <ArrowDownLeft className="w-4 h-4 text-primary" />;
      default:
        return <ArrowUpRight className="w-4 h-4" />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'mpesa':
        return <Smartphone className="w-4 h-4" />;
      case 'bank':
        return <Building2 className="w-4 h-4" />;
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  // Calculate stats
  const totalDeposits = transactions
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  const totalPayments = transactions
    .filter(t => ['payment', 'payout', 'withdrawal'].includes(t.type) && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground mt-1">
              Manage your wallet, send money, and track transactions
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Money
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Money to Wallet</DialogTitle>
                  <DialogDescription>
                    Deposit funds to your SmartReach wallet via M-Pesa
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="depositAmount">Amount (KES)</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      min="100"
                      step="100"
                      placeholder="1000"
                      value={depositForm.amount}
                      onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={depositForm.paymentMethod}
                      onValueChange={(v) => setDepositForm(prev => ({ ...prev, paymentMethod: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mpesa">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            M-Pesa
                          </div>
                        </SelectItem>
                        <SelectItem value="card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Card
                          </div>
                        </SelectItem>
                        <SelectItem value="bank">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Bank Transfer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDepositDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sending}>
                      {sending ? 'Processing...' : 'Deposit'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-primary">
                  <Send className="w-4 h-4" />
                  Send Money
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Money</DialogTitle>
                  <DialogDescription>
                    Transfer funds to freelancers, suppliers, or anyone via M-Pesa
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSendMoney} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (KES)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="10"
                      step="10"
                      placeholder="1000"
                      value={sendForm.amount}
                      onChange={(e) => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientPhone">Recipient Phone</Label>
                    <Input
                      id="recipientPhone"
                      type="tel"
                      placeholder="+254 7XX XXX XXX"
                      value={sendForm.recipientPhone}
                      onChange={(e) => setSendForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                    <Input
                      id="recipientName"
                      placeholder="John Doe"
                      value={sendForm.recipientName}
                      onChange={(e) => setSendForm(prev => ({ ...prev, recipientName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Payment for services"
                      value={sendForm.description}
                      onChange={(e) => setSendForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={sendForm.paymentMethod}
                      onValueChange={(v) => setSendForm(prev => ({ ...prev, paymentMethod: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mpesa">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            M-Pesa
                          </div>
                        </SelectItem>
                        <SelectItem value="wallet">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Wallet Balance
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setSendDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sending}>
                      {sending ? 'Sending...' : 'Send Money'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Wallet Balance */}
          <Card className="bg-gradient-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary-foreground/80">
                Wallet Balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {walletLoading ? (
                <Skeleton className="h-8 w-32 bg-primary-foreground/20" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {wallet?.currency || 'KES'} {(wallet?.balance || 0).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 text-sm text-primary-foreground/80">
                <Wallet className="w-4 h-4" />
                Available for payments
              </div>
            </CardContent>
          </Card>

          {/* Total Deposits */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Deposits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-success">
                  KES {totalDeposits.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-success">
                <TrendingUp className="w-4 h-4" />
                Money In
              </div>
            </CardContent>
          </Card>

          {/* Total Payments */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-destructive">
                  KES {totalPayments.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-destructive">
                <TrendingDown className="w-4 h-4" />
                Money Out
              </div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-warning">
                  {transactions.filter(t => t.status === 'pending' || t.status === 'processing').length}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-warning">
                <Clock className="w-4 h-4" />
                Awaiting completion
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>View and filter your payment history</CardDescription>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportReport}>
                      <FileText className="w-4 h-4 mr-2" />
                      Download Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => refetchWallet()}>
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <TabsList>
                  <TabsTrigger value="all" onClick={() => filterByType('all')}>
                    All
                  </TabsTrigger>
                  <TabsTrigger value="deposits" onClick={() => filterByType('deposit')}>
                    Deposits
                  </TabsTrigger>
                  <TabsTrigger value="payments" onClick={() => filterByType('payment')}>
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value="payouts" onClick={() => filterByType('payout')}>
                    Payouts
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                  <Select value={activeFilters.status} onValueChange={(v) => filterByStatus(v)}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="all" className="mt-4">
                {transactionsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by adding money to your wallet or sending a payment
                    </p>
                    <Button onClick={() => setDepositDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Money
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTypeIcon(transaction.type)}
                                <span className="capitalize">{transaction.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {transaction.recipient_name || transaction.description || '-'}
                                </p>
                                {transaction.recipient_phone && (
                                  <p className="text-sm text-muted-foreground">
                                    {transaction.recipient_phone}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                'font-semibold',
                                ['deposit', 'refund'].includes(transaction.type)
                                  ? 'text-success'
                                  : 'text-destructive'
                              )}>
                                {['deposit', 'refund'].includes(transaction.type) ? '+' : '-'}
                                {transaction.currency} {Number(transaction.amount).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon(transaction.payment_method)}
                                <span className="capitalize">{transaction.payment_method}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(transaction.status)}
                                <Badge
                                  variant={
                                    transaction.status === 'completed' ? 'default' :
                                    transaction.status === 'pending' ? 'secondary' :
                                    'destructive'
                                  }
                                  className="capitalize"
                                >
                                  {transaction.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
