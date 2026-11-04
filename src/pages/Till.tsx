import { useMemo, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Wallet,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Landmark,
  Loader2,
  Info,
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions } from '@/hooks/useTransactions';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBusiness } from '@/hooks/useBusiness';
import { exportTransactionsToCSV, type ExportableTransaction } from '@/lib/exportUtils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const DepositSchema = z.object({
  amount: z.coerce.number().min(1, 'Minimum deposit is KES 1').max(150000, 'Maximum deposit is KES 150,000'),
  phone: z.string().regex(/^(?:\+?254|0)?[17]\d{8}$/, 'Use a valid Kenyan Safaricom number'),
  description: z.string().max(100).optional(),
});

const formatKES = (value: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(value);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock; label: string }> = {
    completed: { variant: 'default', icon: CheckCircle2, label: 'Completed' },
    pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
    processing: { variant: 'secondary', icon: RefreshCw, label: 'Processing' },
    failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
    cancelled: { variant: 'outline', icon: XCircle, label: 'Cancelled' },
  };
  const cfg = map[status] ?? { variant: 'outline' as const, icon: Clock, label: status };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
};

export default function Till() {
  const { wallet, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const { transactions, loading: transactionsLoading, refetch: refetchTransactions } = useTransactions();
  const { profile } = useUserProfile();
  const { business } = useBusiness();
  const { toast } = useToast();

  const [depositOpen, setDepositOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [depositing, setDepositing] = useState(false);

  const registeredPhone = profile?.phone ?? '';
  const phoneDigits = registeredPhone.replace(/[^\d]/g, '');

  const recent = useMemo(() => transactions.slice(0, 20), [transactions]);

  const depositRows = useMemo(
    () => transactions.filter((t) => t.type === 'deposit' || t.type === 'payment' || t.type === 'payout'),
    [transactions]
  );

  const handleDeposit = async () => {
    if (!phoneDigits) {
      toast({
        title: 'No registered phone',
        description: 'Add a phone number in Settings before requesting an M-Pesa deposit.',
        variant: 'destructive',
      });
      return;
    }
    const parsed = DepositSchema.safeParse({
      amount,
      phone: phoneDigits,
      description: description || undefined,
    });
    if (!parsed.success) {
      toast({
        title: 'Check the deposit details',
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
        variant: 'destructive',
      });
      return;
    }

    setDepositOpen(false);
    setDepositing(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-deposit', {
        body: { amount: parsed.data.amount, phone: phoneDigits, description: parsed.data.description },
      });
      if (error) {
        const details =
          error instanceof FunctionsHttpError ? await error.context.text() : error.message;
        throw new Error(details);
      }
      const result = data as { success?: boolean; message?: string; error?: string; transactionId?: string };
      if (!result?.success) throw new Error(result?.error ?? 'Deposit request failed');

      toast({
        title: 'M-Pesa prompt sent',
        description: `${formatKES(parsed.data.amount)} — check your phone and enter your M-Pesa PIN. The balance updates the moment the payment confirms.`,
        duration: 8000,
      });
      setAmount('');
      setDescription('');
      await Promise.all([refetchTransactions(), refetchWallet()]);
    } catch (err: any) {
      let message = err.message ?? 'Deposit failed';
      // Surface friendly text for structured function errors.
      if (message.includes('PHONE_MISMATCH') || message.includes('registered phone')) {
        message = 'Deposits can only be sent to your registered phone number.';
      } else if (message.includes('No active business')) {
        message = 'Create or join a business first.';
      }
      toast({ title: 'Deposit failed', description: message, variant: 'destructive', duration: 8000 });
    } finally {
      setDepositing(false);
    }
  };

  const exportCsv = () => {
    if (depositRows.length === 0) {
      toast({ title: 'Nothing to export', description: 'No till movements yet.' });
      return;
    }
    const rows: ExportableTransaction[] = depositRows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      recipient_name: t.recipient_name,
      recipient_phone: t.recipient_phone,
      description: t.description,
      payment_method: t.payment_method,
      reference: t.external_reference,
      created_at: t.created_at,
      completed_at: (t as any).completed_at,
    }));
    exportTransactionsToCSV(rows);
    toast({ title: 'Export ready', description: 'Till history downloaded as CSV.' });
  };

  const balance = walletLoading ? null : wallet ? Number(wallet.balance) : 0;
  const todayTotal = depositRows
    .filter((t) => t.type === 'deposit' && t.status === 'completed' && format(new Date(t.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Landmark className="h-6 w-6 text-primary" />
              Till
            </h1>
            <p className="text-sm text-muted-foreground">
              {business?.name ? `${business.name} · ` : ''}Receive M-Pesa payments straight into your SmartReach wallet.
            </p>
          </div>
          <Button onClick={() => setDepositOpen(true)} disabled={depositing}>
            {depositing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            {depositing ? 'Sending prompt…' : 'Deposit via M-Pesa'}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Live wallet balance
              </CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums">
                {balance === null ? <Skeleton className="h-9 w-40" /> : formatKES(balance)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Updates the moment Safaricom confirms a payment — no refresh needed.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <ArrowDownLeft className="h-3.5 w-3.5" /> Collected today
              </CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums">{formatKES(todayTotal)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Confirmed M-Pesa deposits today.</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5" /> Registered till phone
              </CardDescription>
              <CardTitle className="text-xl font-semibold">
                {registeredPhone || <Skeleton className="h-7 w-32" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Deposit prompts are only sent to this number, as a fraud protection.
            </CardContent>
          </Card>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How a deposit works</AlertTitle>
          <AlertDescription>
            Tap <strong>Deposit via M-Pesa</strong>, choose an amount, and Safaricom sends the payment prompt to your
            registered phone. Enter your M-Pesa PIN — the wallet balance and the transaction below turn
            <span className="mx-1 font-semibold">Completed</span> the second it clears.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Transaction history</CardTitle>
              <CardDescription>Latest 20 movements on this till, live.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No transactions yet. Deposit via M-Pesa to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(new Date(t.created_at), 'dd MMM, HH:mm')}
                        </TableCell>
                        <TableCell className="capitalize text-xs">{t.type}</TableCell>
                        <TableCell
                          className={cn(
                            'font-semibold tabular-nums',
                            t.type === 'deposit' || t.type === 'refund' ? 'text-emerald-600 dark:text-emerald-400' : ''
                          )}
                        >
                          {t.type === 'deposit' || t.type === 'refund' ? '+' : '−'}
                          {formatKES(Number(t.amount))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{t.external_reference ?? t.metadata?.checkout_request_id ?? '—'}</TableCell>
                        <TableCell className="hidden max-w-[220px] truncate text-xs text-muted-foreground md:table-cell">
                          {t.description ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deposit via M-Pesa</DialogTitle>
            <DialogDescription>
              Safaricom will send the payment prompt to your registered phone. Enter your M-Pesa PIN to approve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="till-amount">Amount (KES)</Label>
              <Input
                id="till-amount"
                type="number"
                inputMode="decimal"
                min={1}
                max={150000}
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="till-phone">Phone</Label>
              <Input id="till-phone" value={registeredPhone} readOnly disabled />
              <p className="text-xs text-muted-foreground">
                Locked to your registered number for security. Change it in Settings if needed.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="till-desc">Note (optional)</Label>
              <Input
                id="till-desc"
                maxLength={100}
                placeholder="e.g. Monday stock float"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeposit}>
              <Smartphone className="h-4 w-4" /> Send M-Pesa prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
