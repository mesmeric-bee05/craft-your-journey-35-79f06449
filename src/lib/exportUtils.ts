import { format } from 'date-fns';

export interface ExportableTransaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  description?: string | null;
  payment_method: string;
  reference?: string | null;
  created_at: string;
  completed_at?: string | null;
}

/**
 * Generate CSV content from transactions
 */
export function generateTransactionCSV(
  transactions: ExportableTransaction[],
  businessName?: string
): string {
  const headers = [
    'Date',
    'Type',
    'Amount',
    'Currency',
    'Status',
    'Recipient',
    'Phone',
    'Description',
    'Payment Method',
    'Reference',
    'Completed At',
  ];

  const rows = transactions.map((t) => [
    format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
    t.type.charAt(0).toUpperCase() + t.type.slice(1),
    t.amount.toFixed(2),
    t.currency,
    t.status.charAt(0).toUpperCase() + t.status.slice(1),
    t.recipient_name || '-',
    t.recipient_phone || '-',
    t.description || '-',
    t.payment_method.toUpperCase(),
    t.reference || '-',
    t.completed_at ? format(new Date(t.completed_at), 'yyyy-MM-dd HH:mm:ss') : '-',
  ]);

  const csvContent = [
    businessName ? `Transaction Report - ${businessName}` : 'Transaction Report',
    `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
    '',
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSVValue).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Escape CSV values to handle commas, quotes, and newlines
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download data as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export transactions as CSV file
 */
export function exportTransactionsToCSV(
  transactions: ExportableTransaction[],
  businessName?: string
): void {
  const csv = generateTransactionCSV(transactions, businessName);
  const filename = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8');
}

/**
 * Generate a basic PDF-like text report (for actual PDF, you'd use a library like jsPDF)
 */
export function generateTransactionReport(
  transactions: ExportableTransaction[],
  businessName?: string,
  dateRange?: { start: Date; end: Date }
): string {
  const totalDeposits = transactions
    .filter((t) => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayments = transactions
    .filter((t) => ['payment', 'payout', 'withdrawal'].includes(t.type) && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const pending = transactions.filter((t) => t.status === 'pending' || t.status === 'processing');

  const report = `
================================================================================
                          TRANSACTION REPORT
================================================================================

Business: ${businessName || 'N/A'}
Generated: ${format(new Date(), 'PPpp')}
${dateRange ? `Period: ${format(dateRange.start, 'PP')} - ${format(dateRange.end, 'PP')}` : ''}

--------------------------------------------------------------------------------
                             SUMMARY
--------------------------------------------------------------------------------

Total Transactions: ${transactions.length}
Total Deposits: KES ${totalDeposits.toLocaleString()}
Total Payments: KES ${totalPayments.toLocaleString()}
Net Flow: KES ${(totalDeposits - totalPayments).toLocaleString()}
Pending Transactions: ${pending.length}

--------------------------------------------------------------------------------
                         TRANSACTION DETAILS
--------------------------------------------------------------------------------

${transactions
  .map(
    (t, i) => `
${i + 1}. ${t.type.toUpperCase()} - ${t.status.toUpperCase()}
   Amount: ${t.currency} ${t.amount.toLocaleString()}
   Date: ${format(new Date(t.created_at), 'PPpp')}
   ${t.recipient_name ? `Recipient: ${t.recipient_name}` : ''}
   ${t.description ? `Description: ${t.description}` : ''}
   Reference: ${t.reference || 'N/A'}
`
  )
  .join('\n')}

================================================================================
                          END OF REPORT
================================================================================
`;

  return report;
}

/**
 * Export transactions as text report
 */
export function exportTransactionsToText(
  transactions: ExportableTransaction[],
  businessName?: string
): void {
  const report = generateTransactionReport(transactions, businessName);
  const filename = `transaction_report_${format(new Date(), 'yyyy-MM-dd')}.txt`;
  downloadFile(report, filename, 'text/plain;charset=utf-8');
}
