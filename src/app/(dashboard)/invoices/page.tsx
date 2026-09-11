'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/Table';
import { CustomerSelect } from '@/components/customers/CustomerSelect';
import { StatCard } from '@/components/invoices/StatCard';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { invoicesApi, invoiceSettingsApi, toNumber, openPdfBlob } from '@/lib/invoices';
import { apiErrorMessage } from '@/lib/customers';
import { useDebounce } from '@/hooks/useDebounce';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { PaginationMeta } from '@/types/index';
import {
  InvoiceDashboard,
  InvoiceListRow,
  InvoiceListParams,
  InvoiceListSummary,
  InvoiceStatus
} from '@/types/invoice';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Pencil,
  Copy,
  Download,
  Ban,
  Trash2,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  SlidersHorizontal,
  X
} from 'lucide-react';

const PAGE_SIZE = 10;

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false
};

const EMPTY_SUMMARY: InvoiceListSummary = {
  totalAmount: 0,
  paidAmount: 0,
  outstandingAmount: 0
};

type SortValue = `${NonNullable<InvoiceListParams['sortBy']>}:${'asc' | 'desc'}`;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export default function InvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [summary, setSummary] = useState<InvoiceListSummary>(EMPTY_SUMMARY);
  const [stats, setStats] = useState<InvoiceDashboard | null>(null);
  const [financialYears, setFinancialYears] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState<number | ''>('');
  const [year, setYear] = useState<number | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [onlyOutstanding, setOnlyOutstanding] = useState(false);
  const [sort, setSort] = useState<SortValue>('issueDate:desc');
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Row actions
  const [cancelling, setCancelling] = useState<InvoiceListRow | null>(null);
  const [deleting, setDeleting] = useState<InvoiceListRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    const [sortBy, sortOrder] = sort.split(':') as [
      NonNullable<InvoiceListParams['sortBy']>,
      'asc' | 'desc'
    ];

    try {
      const result = await invoicesApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        status: status || undefined,
        customerId,
        financialYear,
        month,
        year,
        dateFrom,
        dateTo,
        onlyOutstanding: onlyOutstanding ? 'true' : '',
        sortBy,
        sortOrder
      });

      setInvoices(result.invoices);
      setMeta(result.meta);
      setSummary(result.summary);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load invoices'));
      setInvoices([]);
      setMeta(EMPTY_META);
      setSummary(EMPTY_SUMMARY);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    debouncedSearch,
    status,
    customerId,
    financialYear,
    month,
    year,
    dateFrom,
    dateTo,
    onlyOutstanding,
    sort
  ]);

  // Stat cards follow the year filter but ignore search and pagination, so they
  // keep describing the business rather than the current page.
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      setStats(await invoicesApi.dashboard({ financialYear: financialYear || undefined }));
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load invoice summary'));
    } finally {
      setIsStatsLoading(false);
    }
  }, [financialYear]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    invoiceSettingsApi
      .referenceData()
      .then((data) => setFinancialYears(data.financialYears))
      .catch(() => setFinancialYears([]));
  }, []);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    status,
    customerId,
    financialYear,
    month,
    year,
    dateFrom,
    dateTo,
    onlyOutstanding,
    sort
  ]);

  const hasFilters = Boolean(
    search ||
      status ||
      customerId ||
      financialYear ||
      month ||
      year ||
      dateFrom ||
      dateTo ||
      onlyOutstanding
  );

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setCustomerId('');
    setFinancialYear('');
    setMonth('');
    setYear('');
    setDateFrom('');
    setDateTo('');
    setOnlyOutstanding(false);
    setSort('issueDate:desc');
    setPage(1);
  };

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, index) => current - index);
  }, []);

  // ---------------------------------------------------------------------------
  // Row actions
  // ---------------------------------------------------------------------------

  const handleDuplicate = async (invoice: InvoiceListRow) => {
    setBusyId(invoice.id);
    try {
      const created = await invoicesApi.duplicate(invoice.id);
      toast.success(`Created ${created.invoiceNumber} as a draft copy`);
      router.push(`/invoices/${created.id}/edit`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not duplicate the invoice'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (invoice: InvoiceListRow) => {
    setBusyId(invoice.id);
    try {
      const blob = await invoicesApi.fetchPdf(invoice.id, 'attachment');
      openPdfBlob(blob, `${invoice.invoiceNumber}.pdf`, 'download');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not generate the PDF'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelling) return;

    setIsActionBusy(true);
    try {
      await invoicesApi.cancel(cancelling.id);
      toast.success(`Invoice ${cancelling.invoiceNumber} cancelled`);
      setCancelling(null);
      fetchInvoices();
      fetchStats();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not cancel the invoice'));
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;

    setIsActionBusy(true);
    try {
      await invoicesApi.remove(deleting.id);
      toast.success('Draft invoice deleted');
      setDeleting(null);

      // Stepping back avoids landing on a page that no longer exists.
      if (invoices.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchInvoices();
      }
      fetchStats();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not delete the invoice'));
      setDeleting(null);
    } finally {
      setIsActionBusy(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading invoices..." />
        </div>
      );
    }

    if (invoices.length === 0) {
      return hasFilters ? (
        <EmptyState
          title="No invoices match your filters"
          description="Try a different search term or date range, or clear the filters to see everything."
          icon={<Search className="w-6 h-6 text-warm-accent" />}
          actionLabel="Clear Filters"
          onAction={resetFilters}
        />
      ) : (
        <EmptyState
          title="No invoices created yet"
          description="Create your first GST compliant invoice to start tracking what your customers owe you."
          icon={<FileText className="w-6 h-6 text-warm-accent" />}
          actionLabel="Create First Invoice"
          onAction={() => router.push('/invoices/new')}
        />
      );
    }

    return (
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead className="hidden md:table-cell">Customer</TableHead>
              <TableHead className="hidden lg:table-cell">Dates</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {invoices.map((invoice) => {
              const balance = toNumber(invoice.balanceDue);
              const isBusy = busyId === invoice.id;

              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="font-semibold text-warm-text hover:text-warm-accent transition-colors"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <span className="block text-[11px] text-warm-textMuted md:hidden mt-0.5 truncate max-w-[160px]">
                      {invoice.billingName}
                    </span>
                    <span className="block text-[11px] text-warm-textSubtle lg:hidden mt-0.5">
                      {formatDate(invoice.issueDate)}
                    </span>
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    <p className="text-xs font-medium text-warm-text truncate max-w-[180px]">
                      {invoice.billingName}
                    </p>
                    <p className="text-[11px] text-warm-textSubtle truncate max-w-[180px]">
                      {invoice.billingGstin || invoice.customer?.email || '—'}
                    </p>
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    <p className="text-[11px] text-warm-textMuted">
                      Issued {formatDate(invoice.issueDate)}
                    </p>
                    <p
                      className={cn(
                        'text-[11px]',
                        invoice.status === 'OVERDUE'
                          ? 'text-red-600 font-semibold'
                          : 'text-warm-textSubtle'
                      )}
                    >
                      Due {formatDate(invoice.dueDate)}
                    </p>
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="font-semibold text-warm-text tabular-nums">
                      {formatCurrency(toNumber(invoice.grandTotal))}
                    </span>
                    <span className="block text-[11px] text-warm-textSubtle">
                      {invoice.isIgst ? 'IGST' : 'CGST+SGST'}
                    </span>
                  </TableCell>

                  <TableCell className="hidden sm:table-cell text-right">
                    <span
                      className={cn(
                        'font-semibold tabular-nums text-sm',
                        balance > 0 ? 'text-red-700' : 'text-emerald-700'
                      )}
                    >
                      {formatCurrency(balance)}
                    </span>
                    {toNumber(invoice.amountPaid) > 0 && (
                      <span className="block text-[11px] text-warm-textSubtle">
                        paid {formatCurrency(toNumber(invoice.amountPaid))}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        title="View invoice"
                        className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {invoice.status !== 'CANCELLED' && (
                        <Link
                          href={`/invoices/${invoice.id}/edit`}
                          title="Edit invoice"
                          className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}

                      <button
                        title="Duplicate as draft"
                        disabled={isBusy}
                        onClick={() => handleDuplicate(invoice)}
                        className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors disabled:opacity-40"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        title="Download PDF"
                        disabled={isBusy}
                        onClick={() => handleDownload(invoice)}
                        className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors disabled:opacity-40"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {invoice.status === 'DRAFT' ? (
                        <button
                          title="Delete draft"
                          onClick={() => setDeleting(invoice)}
                          className="p-1.5 text-warm-textMuted hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        invoice.status !== 'CANCELLED' && (
                          <button
                            title="Cancel invoice"
                            onClick={() => setCancelling(invoice)}
                            className="p-1.5 text-warm-textMuted hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Table brings its own card border, so the footer only needs the sides. */}
        <div className="border-x border-b border-warm-border/60 shadow-warm bg-warm-surface">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 border-b border-warm-border/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-textSubtle">
              Filtered totals
            </span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="text-xs text-warm-textMuted">
                Invoiced{' '}
                <span className="font-bold text-warm-text tabular-nums">
                  {formatCurrency(summary.totalAmount)}
                </span>
              </span>
              <span className="text-xs text-warm-textMuted">
                Received{' '}
                <span className="font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(summary.paidAmount)}
                </span>
              </span>
              <span className="text-xs text-warm-textMuted">
                Outstanding{' '}
                <span className="font-bold text-red-700 tabular-nums">
                  {formatCurrency(summary.outstandingAmount)}
                </span>
              </span>
            </div>
          </div>

          {meta.totalPages > 1 && (
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={meta.limit}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Invoices"
        description="Create, track and collect on GST compliant invoices."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices' }]}
        actions={
          <Link href="/invoices/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>Create Invoice</Button>
          </Link>
        }
      />

      {/* Stat cards. Each one doubles as a filter shortcut. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Invoiced"
          value={stats?.totalAmount ?? 0}
          hint={`${stats?.totalInvoices ?? 0} invoices`}
          icon={<FileText className="w-4 h-4" />}
          tone="accent"
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Paid"
          value={stats?.paidAmount ?? 0}
          hint={`${stats?.paidInvoices ?? 0} fully settled`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="success"
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Unpaid"
          value={stats?.unpaidAmount ?? 0}
          hint={`${stats?.unpaidInvoices ?? 0} awaiting payment`}
          icon={<Clock className="w-4 h-4" />}
          tone="warning"
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Overdue"
          value={stats?.overdueAmount ?? 0}
          hint={`${stats?.overdueInvoices ?? 0} past due date`}
          icon={<AlertTriangle className="w-4 h-4" />}
          tone="danger"
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Outstanding"
          value={stats?.outstandingAmount ?? 0}
          hint="Still collectable"
          icon={<Wallet className="w-4 h-4" />}
          tone="neutral"
          isLoading={isStatsLoading}
        />
      </div>

      {/* Filter bar */}
      <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search number, customer, GSTIN, PO or reference..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'SENT', label: 'Sent' },
              { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
              { value: 'PAID', label: 'Paid' },
              { value: 'OVERDUE', label: 'Overdue' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value as InvoiceStatus | '')}
          />

          <CustomerSelect
            value={customerId}
            onChange={(id) => setCustomerId(id)}
            allowClear
            clearLabel="All customers"
            placeholder="All customers"
          />
        </div>

        {/* Date and year filters, hidden until asked for so the bar stays calm. */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3 pt-3 border-t border-warm-border/50">
            <Select
              label="Financial Year"
              options={[
                { value: '', label: 'All years' },
                ...financialYears.map((fy) => ({ value: fy, label: `FY ${fy}` }))
              ]}
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
            />

            <Select
              label="Calendar Year"
              options={[
                { value: '', label: 'Any year' },
                ...yearOptions.map((y) => ({ value: String(y), label: String(y) }))
              ]}
              value={year === '' ? '' : String(year)}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
            />

            <Select
              label="Month"
              options={[
                { value: '', label: 'Any month' },
                ...MONTHS.map((label, index) => ({ value: String(index + 1), label }))
              ]}
              value={month === '' ? '' : String(month)}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}
            />

            <Input
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              label="To Date"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-warm-border/50">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-warm-textMuted">
              {isLoading ? (
                'Loading...'
              ) : (
                <>
                  <span className="font-semibold text-warm-text">{meta.total}</span> invoice
                  {meta.total === 1 ? '' : 's'} found
                </>
              )}
            </p>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOutstanding}
                onChange={(e) => setOnlyOutstanding(e.target.checked)}
                className="w-3.5 h-3.5 accent-warm-accent cursor-pointer"
              />
              <span className="text-xs font-medium text-warm-textMuted">Unpaid only</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced((open) => !open)}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            >
              {showAdvanced ? 'Less' : 'Date Filters'}
            </Button>

            <Select
              className="h-9 text-xs"
              options={[
                { value: 'issueDate:desc', label: 'Newest first' },
                { value: 'issueDate:asc', label: 'Oldest first' },
                { value: 'dueDate:asc', label: 'Due date (soonest)' },
                { value: 'grandTotal:desc', label: 'Amount (high to low)' },
                { value: 'grandTotal:asc', label: 'Amount (low to high)' },
                { value: 'balanceDue:desc', label: 'Balance (high to low)' },
                { value: 'invoiceNumber:desc', label: 'Invoice number' },
                { value: 'billingName:asc', label: 'Customer (A–Z)' }
              ]}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
            />

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                leftIcon={<X className="w-3.5 h-3.5" />}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {renderTable()}

      {/* Cancelling keeps the number consumed and the document auditable. */}
      <ConfirmDialog
        isOpen={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={handleCancel}
        isLoading={isActionBusy}
        isDanger
        title={`Cancel invoice ${cancelling?.invoiceNumber ?? ''}?`}
        message="The invoice stays on record with its number intact, but stops counting towards what your customers owe you. This cannot be undone."
        confirmLabel="Cancel Invoice"
        cancelLabel="Keep Invoice"
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isLoading={isActionBusy}
        isDanger
        title="Delete this draft?"
        message={`Draft ${deleting?.invoiceNumber ?? ''} will be permanently removed. Only drafts can be deleted — issued invoices must be cancelled.`}
        confirmLabel="Delete Draft"
      />
    </DashboardLayout>
  );
}
