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
import { normalizeStateName } from '@/lib/geo';
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
  MoreVertical,
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
  MapPin,
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
  const [billType, setBillType] = useState('');
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<InvoiceListRow | null>(null);
  const [deleting, setDeleting] = useState<InvoiceListRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.row-action-menu')) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [openMenuId]);

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
        billType: billType || undefined,
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
    billType,
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
    billType,
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
      billType ||
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
    setBillType('');
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
              <TableHead>Bill No &amp; Type</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead className="hidden md:table-cell">Bill &amp; Order Date</TableHead>
              <TableHead className="hidden lg:table-cell">Order &amp; D.C. No</TableHead>
              <TableHead className="hidden xl:table-cell">Dispatch / LH No</TableHead>
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
              const formattedBillType = (invoice.billType || 'TAX_INVOICE').replace(/_/g, ' ');

              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-bold text-warm-text hover:text-warm-accent transition-colors"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 bg-warm-accentLight/80 text-warm-accent border border-warm-accent/20">
                        {formattedBillType}
                      </span>
                    </div>
                    <span className="block text-[11px] text-warm-textMuted md:hidden mt-1 truncate max-w-[160px]">
                      {invoice.billingName}
                    </span>
                  </TableCell>

                  <TableCell>
                    <p className="text-xs font-semibold text-warm-text truncate max-w-[190px]">
                      {invoice.billingName}
                    </p>
                    <p className="text-[11px] text-warm-textSubtle truncate max-w-[190px]">
                      {(invoice.customer?.city || invoice.billingState) ? (
                        <span className="inline-flex items-center gap-1 text-warm-textMuted">
                          <MapPin className="w-3 h-3 text-warm-accent shrink-0" />
                          {[invoice.customer?.city, normalizeStateName(invoice.billingState || invoice.customer?.state || '')].filter(Boolean).join(', ')}
                        </span>
                      ) : invoice.billingGstin ? (
                        `GST: ${invoice.billingGstin}`
                      ) : (
                        invoice.customer?.email || '—'
                      )}
                    </p>
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    <p className="text-[11px] font-medium text-warm-text">
                      Bill: {formatDate(invoice.issueDate)}
                    </p>
                    {invoice.orderDate ? (
                      <p className="text-[10px] text-warm-textMuted">
                        Order: {formatDate(invoice.orderDate)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-warm-textSubtle">
                        Due: {formatDate(invoice.dueDate)}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    <p className="text-xs font-medium text-warm-text truncate max-w-[150px]">
                      {invoice.poNumber ? `PO: ${invoice.poNumber}` : '—'}
                    </p>
                    {invoice.dcNo && (
                      <p className="text-[11px] text-warm-textMuted truncate max-w-[150px]">
                        DC: {invoice.dcNo}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="hidden xl:table-cell">
                    <p className="text-xs text-warm-text truncate max-w-[150px]">
                      {invoice.modeOfDispatch || '—'}
                    </p>
                    {invoice.lhNo && (
                      <p className="text-[11px] text-warm-textMuted truncate max-w-[150px]">
                        LH: {invoice.lhNo}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="font-semibold text-warm-text tabular-nums">
                      {formatCurrency(toNumber(invoice.grandTotal))}
                    </span>
                    <span className="block text-[10px] text-warm-textSubtle uppercase">
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

                  <TableCell className="text-right">
                    <div className="relative inline-flex items-center justify-end gap-1.5 row-action-menu">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        title="View invoice"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-warm-text bg-warm-input/50 hover:bg-warm-accent hover:text-white border border-warm-border/60 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>

                      <button
                        type="button"
                        title="More options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === invoice.id ? null : invoice.id);
                        }}
                        className={cn(
                          'p-1 text-warm-textMuted hover:text-warm-text hover:bg-warm-input border border-warm-border/60 transition-colors',
                          openMenuId === invoice.id && 'bg-warm-input text-warm-text'
                        )}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === invoice.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 bg-warm-surface border border-warm-border/80 shadow-warmLg z-50 py-1 text-left animate-in fade-in zoom-in-95 duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {invoice.status !== 'CANCELLED' && (
                            <Link
                              href={`/invoices/${invoice.id}/edit`}
                              onClick={() => setOpenMenuId(null)}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-warm-text hover:bg-warm-input transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-warm-textMuted" />
                              <span>Edit Invoice</span>
                            </Link>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDownload(invoice);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-warm-text hover:bg-warm-input transition-colors disabled:opacity-40"
                          >
                            <Download className="w-3.5 h-3.5 text-warm-textMuted" />
                            <span>Download PDF</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDuplicate(invoice);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-warm-text hover:bg-warm-input transition-colors disabled:opacity-40"
                          >
                            <Copy className="w-3.5 h-3.5 text-warm-textMuted" />
                            <span>Duplicate as Draft</span>
                          </button>

                          <div className="h-px bg-warm-border/60 my-1" />

                          {invoice.status === 'DRAFT' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setDeleting(invoice);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete Draft</span>
                            </button>
                          ) : (
                            invoice.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setCancelling(invoice);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5 text-red-500" />
                                <span>Cancel Invoice</span>
                              </button>
                            )
                          )}
                        </div>
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
                <strong className="text-warm-text tabular-nums">
                  {formatCurrency(summary.totalAmount)}
                </strong>
              </span>
              <span className="text-xs text-warm-textMuted">
                Collected{' '}
                <strong className="text-emerald-700 tabular-nums">
                  {formatCurrency(summary.paidAmount)}
                </strong>
              </span>
              <span className="text-xs text-warm-textMuted">
                Receivable{' '}
                <strong
                  className={cn(
                    'tabular-nums',
                    summary.outstandingAmount > 0 ? 'text-red-700 font-bold' : 'text-warm-text'
                  )}
                >
                  {formatCurrency(summary.outstandingAmount)}
                </strong>
              </span>
            </div>
          </div>

          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={meta.limit}
            onPageChange={(next) => setPage(next)}
          />
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Tax Invoices"
        description="Create, track and collect on GST compliant tax invoices, delivery challans, and bills."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tax Invoices' }]}
        actions={
          <Link href="/invoices/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>Create Tax Invoice</Button>
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
      <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-4">
            <Input
              placeholder="Search Bill No, customer, Order No, LH No, DC No..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              options={[
                { value: '', label: 'All Bill Types' },
                { value: 'TAX_INVOICE', label: 'Tax Invoice' },
                { value: 'BILL_OF_SUPPLY', label: 'Bill of Supply' },
                { value: 'DELIVERY_CHALLAN', label: 'Delivery Challan' },
                { value: 'PROFORMA_INVOICE', label: 'Proforma Invoice' }
              ]}
              value={billType}
              onChange={(e) => setBillType(e.target.value)}
            />
          </div>

          <div className="lg:col-span-2">
            <Input
              type="date"
              placeholder="Start Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="lg:col-span-2">
            <Input
              type="date"
              placeholder="End Date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="lg:col-span-2">
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-warm-border/30 items-center">
          <div className="lg:col-span-5">
            <CustomerSelect
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              allowClear
              clearLabel="All customers"
              placeholder="Filter by customer"
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              containerClassName="w-full"
              options={[
                { value: 'issueDate:desc', label: 'Newest first' },
                { value: 'issueDate:asc', label: 'Oldest first' },
                { value: 'dueDate:asc', label: 'Due date (soonest)' },
                { value: 'grandTotal:desc', label: 'Amount (high to low)' },
                { value: 'grandTotal:asc', label: 'Amount (low to high)' },
                { value: 'balanceDue:desc', label: 'Balance (high to low)' },
                { value: 'invoiceNumber:desc', label: 'Bill number' },
                { value: 'billingName:asc', label: 'Customer (A–Z)' }
              ]}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
            />
          </div>

          <div className="lg:col-span-4 flex items-center justify-end gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 bg-warm-input/60 border border-warm-border/60 hover:bg-warm-input transition-colors">
              <input
                type="checkbox"
                checked={onlyOutstanding}
                onChange={(e) => setOnlyOutstanding(e.target.checked)}
                className="w-3.5 h-3.5 accent-warm-accent cursor-pointer"
              />
              <span className="text-xs font-semibold text-warm-text">Unpaid only</span>
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced((open) => !open)}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            >
              {showAdvanced ? 'Less Filters' : 'More Dates'}
            </Button>

            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                leftIcon={<X className="w-3.5 h-3.5 text-red-600" />}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Extended year/month filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-warm-border/50">
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
          </div>
        )}
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
