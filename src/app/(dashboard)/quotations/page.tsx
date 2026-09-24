'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { QuotationPreviewModal } from '@/components/quotations/QuotationPreviewModal';
import { StatCard } from '@/components/invoices/StatCard';
import { quotationsApi } from '@/lib/quotations';
import { openPdfBlob } from '@/lib/invoices';
import { apiErrorMessage } from '@/lib/customers';
import { useDebounce } from '@/hooks/useDebounce';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { PaginationMeta } from '@/types/index';
import { Quotation, QuotationListParams, QuotationStatus, QuotationSummary } from '@/types/quotation';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  MoreVertical,
  Pencil,
  Copy,
  Download,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowRightLeft,
  FileText,
  Clock,
  Check,
  MapPin,
  AlertCircle
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

const EMPTY_SUMMARY: QuotationSummary = {
  totalCount: 0,
  draftCount: 0,
  sentCount: 0,
  acceptedCount: 0,
  convertedCount: 0,
  expiredCount: 0,
  rejectedCount: 0,
  cancelledCount: 0,
  totalValue: 0,
  convertedValue: 0
};

export default function QuotationsPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [summary, setSummary] = useState<QuotationSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | ''>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Floating portal action dropdown state
  const [menuAnchor, setMenuAnchor] = useState<{
    q: Quotation;
    top: number;
    right: number;
    openUpwards: boolean;
  } | null>(null);

  // Modals & dialog states
  const [previewTarget, setPreviewTarget] = useState<Quotation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [convertTarget, setConvertTarget] = useState<Quotation | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Quotation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Quotation | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleDismiss = () => setMenuAnchor(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAnchor(null);
    };

    window.addEventListener('click', handleDismiss);
    window.addEventListener('resize', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('resize', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchQuotations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: QuotationListParams = {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        sortBy: 'quotationDate',
        sortOrder: 'desc'
      };
      const result = await quotationsApi.list(params);
      setQuotations(result.quotations);
      setSummary(result.summary);
      setMeta(result.meta);
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Failed to fetch quotations');
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Handle actions
  const handleSend = async (q: Quotation) => {
    try {
      await quotationsApi.send(q.id);
      toast.success(`Quotation ${q.quotationNumber} marked as Sent`);
      fetchQuotations();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to send quotation'));
    }
  };

  const handleAccept = async (q: Quotation) => {
    try {
      await quotationsApi.accept(q.id);
      toast.success(`Quotation ${q.quotationNumber} marked as Accepted`);
      fetchQuotations();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to accept quotation'));
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    setActionInProgress(true);
    try {
      await quotationsApi.reject(rejectTarget.id, reasonInput);
      toast.success(`Quotation ${rejectTarget.quotationNumber} marked as Rejected`);
      setRejectTarget(null);
      setReasonInput('');
      fetchQuotations();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to reject quotation'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelTarget) return;
    setActionInProgress(true);
    try {
      await quotationsApi.cancel(cancelTarget.id, reasonInput);
      toast.success(`Quotation ${cancelTarget.quotationNumber} Cancelled`);
      setCancelTarget(null);
      setReasonInput('');
      fetchQuotations();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to cancel quotation'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDuplicate = async (q: Quotation) => {
    try {
      const copy = await quotationsApi.duplicate(q.id);
      toast.success(`Quotation duplicated as ${copy.quotationNumber}`);
      router.push(`/quotations/${copy.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to duplicate quotation'));
    }
  };

  const handleConvertToInvoice = async () => {
    if (!convertTarget) return;
    setActionInProgress(true);
    try {
      const invoice = await quotationsApi.convertToInvoice(convertTarget.id);
      toast.success(`Quotation ${convertTarget.quotationNumber} converted to Invoice ${invoice.invoiceNumber}`);
      setConvertTarget(null);
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to convert quotation to invoice'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionInProgress(true);
    try {
      await quotationsApi.remove(deleteTarget.id);
      toast.success(`Quotation ${deleteTarget.quotationNumber} deleted`);
      setDeleteTarget(null);
      fetchQuotations();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete quotation'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDownloadPdf = async (q: Quotation) => {
    try {
      const blob = await quotationsApi.fetchPdf(q.id);
      const cleanQNum = q.quotationNumber.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const cleanCust = (q.billingName || 'Quotation').replace(/[^a-zA-Z0-9._-]+/g, '-');
      openPdfBlob(blob, `${cleanQNum}-${cleanCust}.pdf`, 'download');
      toast.success(`Downloaded Quotation ${q.quotationNumber}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to download PDF'));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Quotations"
          description="Create, manage, and convert quotation estimates into GST Tax Invoices"
          actions={
            <Link href="/quotations/new">
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-warm-accent hover:bg-warm-accent-hover text-white shadow-xs font-semibold"
              >
                Create Quotation
              </Button>
            </Link>
          }
        />

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Quotations"
            value={summary.totalValue ?? 0}
            hint={`${summary.totalCount ?? 0} ${(summary.totalCount ?? 0) === 1 ? 'quotation' : 'quotations'}`}
            icon={<FileSpreadsheet className="w-4 h-4" />}
            tone="accent"
            isLoading={isLoading}
          />
          <StatCard
            label="Accepted"
            value={summary.acceptedCount ?? 0}
            isCurrency={false}
            hint="Ready for invoice conversion"
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="success"
            isLoading={isLoading}
          />
          <StatCard
            label="Converted to Invoices"
            value={summary.convertedValue ?? 0}
            hint={`${summary.convertedCount ?? 0} converted`}
            icon={<ArrowRightLeft className="w-4 h-4" />}
            tone="purple"
            isLoading={isLoading}
          />
          <StatCard
            label="Pending / Sent"
            value={(summary.sentCount ?? 0) + (summary.draftCount ?? 0)}
            isCurrency={false}
            hint={`${summary.draftCount ?? 0} drafts, ${summary.sentCount ?? 0} sent`}
            icon={<Clock className="w-4 h-4" />}
            tone="info"
            isLoading={isLoading}
          />
        </div>

        {/* Filter Bar */}
        <div className="bg-warm-surface border border-warm-border/70 p-4 shadow-warm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-warm-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by Q. No., customer, subject..."
                className="pl-9"
              />
            </div>

            <div className="w-44">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as QuotationStatus | '');
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SENT', label: 'Sent' },
                  { value: 'ACCEPTED', label: 'Accepted' },
                  { value: 'CONVERTED', label: 'Converted' },
                  { value: 'EXPIRED', label: 'Expired' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'CANCELLED', label: 'Cancelled' }
                ]}
              />
            </div>
          </div>

          <div className="text-xs text-warm-textMuted">
            Showing <span className="font-semibold text-warm-text">{quotations.length}</span> of{' '}
            <span className="font-semibold text-warm-text">{meta.total}</span>
          </div>
        </div>

        {/* Main Quotations Table */}
        {isLoading ? (
          <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
            <LoadingState message="Loading quotations..." />
          </div>
        ) : quotations.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="w-6 h-6 text-warm-accent" />}
            title="No quotations found"
            description={
              debouncedSearch || statusFilter
                ? 'No quotations match the active search and filter criteria.'
                : 'Get started by creating your first sales quotation.'
            }
            actionLabel="Create Quotation"
            onAction={() => router.push('/quotations/new')}
          />
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Customer / M/S</TableHead>
                  <TableHead className="hidden md:table-cell">Subject & Terms</TableHead>
                  <TableHead className="hidden sm:table-cell">Date & Validity</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => {
                  return (
                    <TableRow key={q.id} className="hover:bg-warm-input/30">
                      {/* Quotation No */}
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Link
                            href={`/quotations/${q.id}`}
                            className="font-bold text-warm-text hover:text-warm-accent transition-colors"
                          >
                            {q.quotationNumber}
                          </Link>
                          {q.inquiryNumber && (
                            <span className="inline-block text-[10px] font-semibold text-warm-textMuted bg-warm-input px-1.5 py-0.5 border border-warm-border/50">
                              Inq: {q.inquiryNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Customer / M/S */}
                      <TableCell>
                        <p className="text-xs font-semibold text-warm-text truncate max-w-[220px]">
                          {q.billingName || q.customer?.name || '—'}
                        </p>
                        <p className="text-[11px] text-warm-textSubtle truncate max-w-[220px]">
                          {q.billingCity ? (
                            <span className="inline-flex items-center gap-1 text-warm-textMuted">
                              <MapPin className="w-3 h-3 text-warm-accent shrink-0" />
                              {[q.billingCity, q.billingState].filter(Boolean).join(', ')}
                            </span>
                          ) : q.billingGstin ? (
                            `GST: ${q.billingGstin}`
                          ) : (
                            q.billingEmail || '—'
                          )}
                        </p>
                      </TableCell>

                      {/* Subject & Terms */}
                      <TableCell className="hidden md:table-cell">
                        <p className="text-xs text-warm-text truncate max-w-[240px]" title={q.subject || ''}>
                          {q.subject || '—'}
                        </p>
                        {q.paymentTerms && (
                          <p className="text-[11px] text-warm-accent font-medium mt-0.5">
                            Terms: {q.paymentTerms}
                          </p>
                        )}
                      </TableCell>

                      {/* Date & Validity */}
                      <TableCell className="hidden sm:table-cell">
                        <p className="text-xs font-semibold text-warm-text">
                          {formatDate(q.quotationDate)}
                        </p>
                        <p className="text-[11px] text-warm-textMuted">
                          {q.validUntil ? (
                            <span className={q.isExpired ? 'text-amber-700 font-semibold' : ''}>
                              Valid: {formatDate(q.validUntil)}
                            </span>
                          ) : (
                            'No expiry set'
                          )}
                        </p>
                      </TableCell>

                      {/* Total Amount */}
                      <TableCell className="text-right">
                        <span className="font-semibold text-warm-text tabular-nums">
                          {formatCurrency(Number(q.grandTotal))}
                        </span>
                        <span className="block text-[10px] text-warm-textSubtle uppercase">
                          {q.isIgst ? 'IGST' : 'CGST+SGST'}
                        </span>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="text-center">
                        <QuotationStatusBadge status={q.status} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* View */}
                          <Link
                            href={`/quotations/${q.id}`}
                            title="View Quotation"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-warm-text bg-warm-input/50 hover:bg-warm-accent hover:text-white border border-warm-border/60 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Link>

                          {/* Preview PDF */}
                          <button
                            type="button"
                            onClick={() => setPreviewTarget(q)}
                            className="p-1 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight border border-warm-border/60 transition-colors cursor-pointer"
                            title="Preview PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* More Options */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (menuAnchor?.q.id === q.id) {
                                setMenuAnchor(null);
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuHeight = 280;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;
                              setMenuAnchor({
                                q,
                                top: openUpwards ? rect.top - 4 : rect.bottom + 4,
                                right: window.innerWidth - rect.right,
                                openUpwards
                              });
                            }}
                            aria-label={`Actions for quotation ${q.quotationNumber}`}
                            className={cn(
                              'p-1 text-warm-textMuted hover:text-warm-text hover:bg-warm-input border border-warm-border/60 transition-colors cursor-pointer',
                              menuAnchor?.q.id === q.id && 'bg-warm-input text-warm-text'
                            )}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Table Footer with Summary totals & Pagination */}
            <div className="border-x border-b border-warm-border/60 shadow-warm bg-warm-surface">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 border-b border-warm-border/40">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-textSubtle">
                  Summary totals
                </span>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                  <span className="text-xs text-warm-textMuted">
                    Total Value{' '}
                    <strong className="text-warm-text tabular-nums">
                      {formatCurrency(summary.totalValue)}
                    </strong>
                  </span>
                  <span className="text-xs text-warm-textMuted">
                    Converted{' '}
                    <strong className="text-purple-700 tabular-nums">
                      {formatCurrency(summary.convertedValue)}
                    </strong>
                  </span>
                  <span className="text-xs text-warm-textMuted">
                    Accepted{' '}
                    <strong className="text-emerald-700 tabular-nums">
                      {summary.acceptedCount}
                    </strong>
                  </span>
                </div>
              </div>

              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                totalItems={meta.total}
                pageSize={meta.limit}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Menu rendered outside in document.body via Portal */}
      {mounted && menuAnchor && (
        createPortal(
          <div
            className={cn(
              'fixed z-[9999] w-52 bg-warm-surface border border-warm-border/80 shadow-warmLg py-1 text-left animate-in fade-in zoom-in-95 duration-100',
              menuAnchor.openUpwards ? '-translate-y-full origin-bottom-right' : 'origin-top-right'
            )}
            style={{
              top: `${menuAnchor.top}px`,
              right: `${menuAnchor.right}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {menuAnchor.q.status === 'DRAFT' && (
              <Link
                href={`/quotations/${menuAnchor.q.id}/edit`}
                onClick={() => setMenuAnchor(null)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-warm-text hover:bg-warm-input transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-warm-textMuted" />
                <span>Edit Quotation</span>
              </Link>
            )}

            {menuAnchor.q.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => {
                  const target = menuAnchor.q;
                  setMenuAnchor(null);
                  handleSend(target);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>Mark as Sent</span>
              </button>
            )}

            {menuAnchor.q.status === 'SENT' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const target = menuAnchor.q;
                    setMenuAnchor(null);
                    handleAccept(target);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark as Accepted</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = menuAnchor.q;
                    setMenuAnchor(null);
                    setRejectTarget(target);
                    setReasonInput('');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  <span>Reject Quotation</span>
                </button>
              </>
            )}

            {menuAnchor.q.status === 'ACCEPTED' && (
              <button
                type="button"
                onClick={() => {
                  const target = menuAnchor.q;
                  setMenuAnchor(null);
                  setConvertTarget(target);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50 transition-colors font-semibold"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                <span>Convert to Tax Invoice</span>
              </button>
            )}

            {menuAnchor.q.status === 'CONVERTED' && menuAnchor.q.convertedInvoiceId && (
              <Link
                href={`/invoices/${menuAnchor.q.convertedInvoiceId}`}
                onClick={() => setMenuAnchor(null)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50 transition-colors font-semibold"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                <span>View Converted Invoice ↗</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                const target = menuAnchor.q;
                setMenuAnchor(null);
                handleDownloadPdf(target);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-warm-text hover:bg-warm-input transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-warm-textMuted" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const target = menuAnchor.q;
                setMenuAnchor(null);
                handleDuplicate(target);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-warm-text hover:bg-warm-input transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-warm-textMuted" />
              <span>Duplicate as Draft</span>
            </button>

            {(menuAnchor.q.status === 'DRAFT' || menuAnchor.q.status === 'SENT' || menuAnchor.q.status === 'ACCEPTED') && (
              <div className="h-px bg-warm-border/60 my-1" />
            )}

            {(menuAnchor.q.status === 'DRAFT' || menuAnchor.q.status === 'SENT' || menuAnchor.q.status === 'ACCEPTED') && (
              <button
                type="button"
                onClick={() => {
                  const target = menuAnchor.q;
                  setMenuAnchor(null);
                  setCancelTarget(target);
                  setReasonInput('');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <Ban className="w-3.5 h-3.5 text-red-500" />
                <span>Cancel Quotation</span>
              </button>
            )}

            {menuAnchor.q.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => {
                  const target = menuAnchor.q;
                  setMenuAnchor(null);
                  setDeleteTarget(target);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete Draft</span>
              </button>
            )}
          </div>,
          document.body
        )
      )}

      {/* Preview PDF Modal */}
      {previewTarget && (
        <QuotationPreviewModal
          isOpen={Boolean(previewTarget)}
          onClose={() => setPreviewTarget(null)}
          quotation={{
            id: previewTarget.id,
            quotationNumber: previewTarget.quotationNumber,
            billingName: previewTarget.billingName,
            customer: previewTarget.customer
          }}
        />
      )}

      {/* Convert to Invoice Confirmation Dialog */}
      {convertTarget && (
        <ConfirmDialog
          isOpen={Boolean(convertTarget)}
          onClose={() => setConvertTarget(null)}
          onConfirm={handleConvertToInvoice}
          title="Convert Quotation to Tax Invoice"
          message={`Are you sure you want to convert Quotation ${convertTarget.quotationNumber} into a new Tax Invoice? This will atomically generate the next invoice sequence number, snapshot all customer & product line items, and mark this quotation as CONVERTED.`}
          confirmLabel="Convert to Invoice"
          isDanger={false}
          isLoading={actionInProgress}
        />
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-warm-surface border border-warm-border p-6 max-w-md w-full shadow-warmLg space-y-4">
            <h3 className="text-base font-bold text-warm-text">
              Reject Quotation {rejectTarget.quotationNumber}
            </h3>
            <p className="text-xs text-warm-textMuted">
              Provide an optional reason for the client rejection.
            </p>
            <Input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="e.g. Price too high, chosen other vendor..."
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleRejectSubmit}
                disabled={actionInProgress}
              >
                Reject Quotation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-warm-surface border border-warm-border p-6 max-w-md w-full shadow-warmLg space-y-4">
            <h3 className="text-base font-bold text-warm-text">
              Cancel Quotation {cancelTarget.quotationNumber}
            </h3>
            <p className="text-xs text-warm-textMuted">
              Provide an optional reason for cancelling this quotation.
            </p>
            <Input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="e.g. Requirement changed by customer..."
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>
                Keep Quotation
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancelSubmit}
                disabled={actionInProgress}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Modal */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Draft Quotation"
          message={`Are you sure you want to permanently delete draft quotation ${deleteTarget.quotationNumber}? This action cannot be undone.`}
          confirmLabel="Delete Quotation"
          isDanger={true}
          isLoading={actionInProgress}
        />
      )}
    </DashboardLayout>
  );
}
