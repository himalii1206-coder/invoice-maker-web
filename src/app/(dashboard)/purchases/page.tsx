'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
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
import { purchaseBillsApi, vendorsApi } from '@/lib/purchases';
import { useDebounce } from '@/hooks/useDebounce';
import { PurchaseBill, PurchaseBillListParams, PurchaseDashboardMetrics, Vendor, PurchaseBillStatus } from '@/types/purchase';
import { PaginationMeta } from '@/types/index';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RecordPaymentModal } from '@/components/purchases/RecordPaymentModal';
import {
  Receipt,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Truck,
  ShieldCheck,
  Calendar,
  Filter
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

const STATUS_VARIANTS: Record<PurchaseBillStatus, 'draft' | 'pending' | 'paid' | 'overdue' | 'neutral'> = {
  DRAFT: 'draft',
  RECEIVED: 'pending',
  PARTIALLY_PAID: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'neutral'
};

const STATUS_LABELS: Record<PurchaseBillStatus, string> = {
  DRAFT: 'Draft',
  RECEIVED: 'Received',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled'
};

export default function PurchasesPage() {
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [metrics, setMetrics] = useState<PurchaseDashboardMetrics | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PurchaseBillStatus | ''>('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [fyFilter, setFyFilter] = useState('2026-27');

  // Modals
  const [paymentBill, setPaymentBill] = useState<PurchaseBill | null>(null);
  const [deleteBill, setDeleteBill] = useState<PurchaseBill | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load vendors for filter dropdown
  useEffect(() => {
    vendorsApi.list({ limit: 100 }).then((res) => {
      setVendors(res.vendors);
    }).catch(() => {});
  }, []);

  const fetchBills = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: PurchaseBillListParams = {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        vendorId: vendorFilter || undefined,
        financialYear: fyFilter || undefined
      };

      const [billsRes, metricsRes] = await Promise.all([
        purchaseBillsApi.list(params),
        purchaseBillsApi.dashboard({ financialYear: fyFilter || undefined })
      ]);

      setBills(billsRes.purchaseBills);
      setMeta(billsRes.meta);
      setMetrics(metricsRes);
    } catch (err: any) {
      toast.error('Failed to load purchase bills');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, vendorFilter, fyFilter]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleDelete = async () => {
    if (!deleteBill) return;
    setIsDeleting(true);
    try {
      await purchaseBillsApi.delete(deleteBill.id);
      toast.success('Purchase bill deleted successfully');
      setDeleteBill(null);
      fetchBills();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete purchase bill');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Purchase Bills"
          description="Track raw material & merchandise procurement, inward vendor invoices, and GST Input Tax Credit (ITC)."
          actions={
            <div className="flex items-center gap-3">
              <Link href="/vendors">
                <Button variant="outline" size="sm" leftIcon={<Truck className="w-4 h-4" />}>
                  Vendors Directory
                </Button>
              </Link>
              <Link href="/purchases/new">
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  + New Purchase Bill
                </Button>
              </Link>
            </div>
          }
        />

        {/* Purchase Analytics KPI Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm">
              <div className="flex items-center justify-between text-warm-textMuted text-xs mb-1">
                <span>Total Purchases (Gross)</span>
                <Receipt className="w-4 h-4 text-warm-accent" />
              </div>
              <p className="text-xl font-bold text-warm-text">
                {formatCurrency(metrics.totalPurchases)}
              </p>
              <span className="text-[11px] text-warm-textMuted mt-1 block">
                {metrics.billCount} Inward Bill(s) in {fyFilter || 'all periods'}
              </span>
            </div>

            <div className="p-4 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm">
              <div className="flex items-center justify-between text-warm-textMuted text-xs mb-1">
                <span>Input GST (ITC Claimable)</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-emerald-700">
                {formatCurrency(metrics.itcSummary.totalItc)}
              </p>
              <div className="text-[10px] text-warm-textMuted mt-1 flex gap-2">
                <span>CGST: {formatCurrency(metrics.itcSummary.cgst)}</span>
                <span>SGST: {formatCurrency(metrics.itcSummary.sgst)}</span>
                <span>IGST: {formatCurrency(metrics.itcSummary.igst)}</span>
              </div>
            </div>

            <div className="p-4 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm">
              <div className="flex items-center justify-between text-warm-textMuted text-xs mb-1">
                <span>Outstanding Payables</span>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl font-bold text-amber-800">
                {formatCurrency(metrics.outstandingPayables)}
              </p>
              <span className="text-[11px] text-warm-textMuted mt-1 block">
                Paid: {formatCurrency(metrics.totalPaid)}
              </span>
            </div>

            <div className="p-4 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm">
              <div className="flex items-center justify-between text-warm-textMuted text-xs mb-1">
                <span>Overdue Payables</span>
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-xl font-bold text-red-700">
                {formatCurrency(metrics.overduePayables)}
              </p>
              <span className="text-[11px] text-red-600/80 mt-1 block">
                Bills past payment terms
              </span>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="lg:col-span-4">
              <Input
                placeholder="Search Bill No, Vendor Inv, PO, GRN..."
                leftIcon={<Search className="w-4 h-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* FY Filter */}
            <div className="lg:col-span-2">
              <Select
                value={fyFilter}
                onChange={(e) => {
                  setFyFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: '2026-27', label: 'FY 2026-27' },
                  { value: '2025-26', label: 'FY 2025-26' },
                  { value: '', label: 'All Periods' }
                ]}
              />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-3">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'RECEIVED', label: 'Received (Pending)' },
                  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                  { value: 'PAID', label: 'Paid' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'CANCELLED', label: 'Cancelled' }
                ]}
              />
            </div>

            {/* Vendor Filter */}
            <div className="lg:col-span-3">
              <Select
                value={vendorFilter}
                onChange={(e) => {
                  setVendorFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'All Vendors' },
                  ...vendors.map((v) => ({
                    value: v.id,
                    label: v.name
                  }))
                ]}
              />
            </div>
          </div>

          {/* Active filters / Reset bar if filtered */}
          {(search || statusFilter || vendorFilter || (fyFilter && fyFilter !== '2026-27')) && (
            <div className="flex items-center justify-between pt-2 border-t border-warm-border/40 text-xs">
              <span className="text-warm-textMuted">
                Filtering by: {[
                  search && `Search "${search}"`,
                  fyFilter && `FY ${fyFilter}`,
                  statusFilter && `Status: ${statusFilter}`,
                  vendorFilter && `Vendor: ${vendors.find((v) => v.id === vendorFilter)?.name || vendorFilter}`
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFyFilter('2026-27');
                  setStatusFilter('');
                  setVendorFilter('');
                  setPage(1);
                }}
                className="text-warm-accent hover:underline font-semibold"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Purchase Bills Table */}
        {isLoading ? (
          <LoadingState message="Loading purchase bills..." />
        ) : bills.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-6 h-6" />}
            title="No purchase bills found"
            description={
              search || statusFilter || vendorFilter
                ? 'No bills match your current filters. Try changing or clearing filters.'
                : 'Start recording inward purchases from suppliers to claim GST Input Tax Credit.'
            }
            actionLabel="+ Create First Purchase Bill"
            onAction={() => window.location.href = '/purchases/new'}
          />
        ) : (
          <div className="bg-warm-surface border border-warm-border/70 shadow-warm rounded-none overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => {
                  const balanceDueNum = Number(bill.balanceDue) || 0;
                  const grandTotalNum = Number(bill.grandTotal) || 0;
                  const amountPaidNum = Number(bill.amountPaid) || 0;

                  return (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Link
                            href={`/purchases/${bill.id}`}
                            className="font-bold text-warm-accent hover:underline text-xs block"
                          >
                            {bill.billNumber}
                          </Link>
                          {bill.vendorInvoiceNumber && (
                            <span className="text-[11px] text-warm-textMuted block">
                              Inv: {bill.vendorInvoiceNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-warm-text block text-xs truncate max-w-[200px]">
                            {bill.vendorName}
                          </span>
                          {bill.vendorGstin ? (
                            <span className="text-[10px] text-warm-textSubtle block">
                              GST: {bill.vendorGstin}
                            </span>
                          ) : (
                            <span className="text-[10px] text-warm-textSubtle block uppercase">
                              Unregistered
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-0.5 text-xs text-warm-text">
                          <span className="font-medium">{formatDate(bill.billDate)}</span>
                          {bill.dueDate && (
                            <span className="text-[11px] text-warm-textMuted block">
                              Due: {formatDate(bill.dueDate)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="font-semibold text-warm-text tabular-nums text-xs">
                          {formatCurrency(grandTotalNum)}
                        </span>
                        <span className="block text-[10px] text-warm-textSubtle uppercase">
                          {bill.isIgst ? 'IGST (ITC)' : 'CGST+SGST (ITC)'}
                        </span>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell text-right">
                        <span
                          className={`font-semibold tabular-nums text-xs ${
                            balanceDueNum > 0 ? 'text-amber-800' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(balanceDueNum)}
                        </span>
                        {amountPaidNum > 0 && (
                          <span className="block text-[11px] text-warm-textSubtle">
                            paid {formatCurrency(amountPaidNum)}
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[bill.status]}>
                          {STATUS_LABELS[bill.status]}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {balanceDueNum > 0 && bill.status !== 'CANCELLED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => setPaymentBill(bill)}
                              title="Record Payment"
                            >
                              Pay
                            </Button>
                          )}
                          <Link href={`/purchases/${bill.id}`}>
                            <Button variant="ghost" size="sm" title="View Bill Voucher">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/purchases/${bill.id}/edit`}>
                            <Button variant="ghost" size="sm" title="Edit Bill">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteBill(bill)}
                            className="text-red-600 hover:bg-red-50"
                            title="Delete Bill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {meta.totalPages > 1 && (
              <div className="p-4 border-t border-warm-border/60">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  totalItems={meta.total}
                  pageSize={meta.limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {paymentBill && (
        <RecordPaymentModal
          isOpen={Boolean(paymentBill)}
          onClose={() => setPaymentBill(null)}
          purchaseBill={paymentBill}
          onSuccess={() => fetchBills()}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteBill)}
        title="Delete Purchase Bill"
        message={`Are you sure you want to delete purchase voucher "${deleteBill?.billNumber}"? Bills with recorded payments cannot be deleted.`}
        confirmLabel="Delete"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteBill(null)}
      />
    </DashboardLayout>
  );
}
