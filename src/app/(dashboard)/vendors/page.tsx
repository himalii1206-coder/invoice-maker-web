'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
import { vendorsApi } from '@/lib/purchases';
import { useDebounce } from '@/hooks/useDebounce';
import { Vendor, VendorListParams } from '@/types/purchase';
import { PaginationMeta } from '@/types/index';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Truck,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Receipt
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

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'INDIVIDUAL' | 'BUSINESS' | ''>('');

  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: VendorListParams = {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        type: typeFilter || undefined
      };
      const result = await vendorsApi.list(params);
      setVendors(result.vendors);
      setMeta(result.meta);
    } catch (err: any) {
      toast.error('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, typeFilter]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleDelete = async () => {
    if (!deleteVendor) return;
    setIsDeleting(true);
    try {
      await vendorsApi.delete(deleteVendor.id);
      toast.success('Vendor deleted successfully');
      setDeleteVendor(null);
      fetchVendors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Vendors & Suppliers"
          // description="Manage supplier profiles, statutory GST details, payment terms and inward purchases."
          actions={
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link href="/purchases/new">
                <Button variant="outline" size="sm" leftIcon={<Receipt className="w-4 h-4" />}>
                  + New Purchase Bill
                </Button>
              </Link>
              <Link href="/vendors/new">
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Add Vendor
                </Button>
              </Link>
            </div>
          }
        />

        {/* Search and Filters */}
        <div className="p-4 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search vendor name, GSTIN, phone, city..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Vendor Types' },
                { value: 'BUSINESS', label: 'Registered Business' },
                { value: 'INDIVIDUAL', label: 'Individual / Proprietor' }
              ]}
            />
          </div>
        </div>

        {/* Vendors Table */}
        {isLoading ? (
          <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
            <LoadingState message="Loading vendors & suppliers..." />
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-6 h-6 text-warm-accent" />}
            title="No vendors found"
            description={
              search
                ? 'No vendors matched your search criteria. Try a different query.'
                : 'Get started by registering your raw material and service suppliers.'
            }
            actionLabel="Add First Vendor"
            onAction={() => router.push('/vendors/new')}
          />
        ) : (
          <div className="bg-warm-surface border border-warm-border/70 shadow-warm rounded-none overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Vendor</TableHead>
                  <TableHead className="min-w-[180px]">Contact</TableHead>
                  <TableHead className="min-w-[170px]">Location &amp; GSTIN</TableHead>
                  <TableHead className="min-w-[140px]">Payment Terms</TableHead>
                  <TableHead className="min-w-[140px] text-right">Balance</TableHead>
                  <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    {/* Vendor Info */}
                    <TableCell className="min-w-[200px]">
                      <div className="space-y-1">
                        <Link
                          href={`/vendors/${v.id}`}
                          className="font-bold text-warm-text hover:text-warm-accent transition-colors block text-sm"
                        >
                          {v.name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-[11px] text-warm-textMuted whitespace-nowrap">
                          {(v.tradeName || v.contactPerson) && (
                            <span className="font-medium text-warm-text truncate max-w-[150px]">
                              {v.tradeName || v.contactPerson}
                            </span>
                          )}
                          {(v.tradeName || v.contactPerson) && (
                            <span className="text-warm-textSubtle">•</span>
                          )}
                          <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 bg-warm-input text-warm-text border border-warm-border/60">
                            {v.type === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'BUSINESS'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="min-w-[180px]">
                      <div className="space-y-1 text-xs text-warm-textMuted">
                        {v.phone && (
                          <p className="flex items-center gap-1.5 whitespace-nowrap">
                            <Phone className="w-3.5 h-3.5 shrink-0 text-warm-accent" />
                            <span className="font-medium text-warm-text">{v.phone}</span>
                          </p>
                        )}
                        {v.email && (
                          <p className="flex items-center gap-1.5 whitespace-nowrap">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[170px]">{v.email}</span>
                          </p>
                        )}
                        {!v.phone && !v.email && <span>—</span>}
                      </div>
                    </TableCell>

                    {/* Location & GSTIN */}
                    <TableCell className="min-w-[170px]">
                      <div className="space-y-1 text-xs">
                        {(v.city || v.state) ? (
                          <p className="flex items-center gap-1 text-xs text-warm-text font-medium whitespace-nowrap">
                            <MapPin className="w-3.5 h-3.5 text-warm-accent shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {[v.city, v.state].filter(Boolean).join(', ')}
                            </span>
                          </p>
                        ) : (
                          <span className="text-warm-textMuted text-xs">—</span>
                        )}
                        {v.gstin ? (
                          <p className="text-[11px] text-warm-textMuted font-mono whitespace-nowrap">
                            GST: <span className="font-semibold text-warm-text">{v.gstin}</span>
                          </p>
                        ) : (
                          <span className="text-[10px] text-warm-textSubtle uppercase whitespace-nowrap">
                            Unregistered
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Payment Terms */}
                    <TableCell className="min-w-[140px]">
                      <div className="space-y-1 text-xs">
                        <span className="text-warm-text font-medium block whitespace-nowrap">
                          {v.paymentTerms
                            ? (v.paymentTerms.toLowerCase().includes('day') || v.paymentTerms.toLowerCase().includes('due') || v.paymentTerms.toLowerCase().includes('advance')
                              ? v.paymentTerms
                              : `${v.paymentTerms} Days`)
                            : 'Net 30 Days'}
                        </span>
                        {v._count?.purchaseBills !== undefined && (
                          <Link
                            href={`/purchases?vendorId=${v.id}`}
                            className="text-[11px] font-semibold text-warm-accent hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>{v._count.purchaseBills} {v._count.purchaseBills === 1 ? 'Bill' : 'Bills'}</span>
                          </Link>
                        )}
                      </div>
                    </TableCell>

                    {/* Balance */}
                    <TableCell className="min-w-[140px] text-right">
                      {(() => {
                        let balanceVal = 0;
                        let balType: 'Payable' | 'Receivable' = 'Payable';

                        if (v.currentBalance !== undefined && v.currentBalance !== null) {
                          balanceVal = Number(v.currentBalance);
                          balType = (v.currentBalanceType === 'RECEIVABLE' || v.currentBalanceType === 'Receivable')
                            ? 'Receivable'
                            : 'Payable';
                        } else {
                          const opBal = v.openingBalance !== null && v.openingBalance !== undefined
                            ? Number(v.openingBalance)
                            : 0;
                          balanceVal = Math.abs(opBal);
                          const isDebit = v.balanceType && (
                            v.balanceType.toUpperCase().startsWith('DR') ||
                            v.balanceType.toLowerCase() === 'debit' ||
                            v.balanceType.toLowerCase() === 'receivable'
                          );
                          balType = isDebit ? 'Receivable' : 'Payable';
                        }

                        if (balanceVal <= 0) {
                          return (
                            <div className="text-xs whitespace-nowrap">
                              <span className="font-semibold text-warm-textMuted tabular-nums">₹0.00</span>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-0.5 text-xs whitespace-nowrap">
                            <p className="font-bold text-warm-text tabular-nums text-sm">
                              {formatCurrency(balanceVal)}
                            </p>
                            <p
                              className={cn(
                                'text-[11px] font-semibold',
                                balType === 'Payable' ? 'text-blue-700' : 'text-amber-700'
                              )}
                            >
                              {balType}
                            </p>
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="min-w-[120px] text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/vendors/${v.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Vendor Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/vendors/${v.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Vendor"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteVendor(v)}
                          className="text-red-600 hover:bg-red-50"
                          title="Delete Vendor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteVendor)}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${deleteVendor?.name}"? Linked purchase records cannot be orphaned.`}
        confirmLabel="Delete"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteVendor(null)}
      />
    </DashboardLayout>
  );
}
