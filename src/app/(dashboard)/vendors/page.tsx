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
import { formatCurrency } from '@/lib/utils';
import { VendorModal } from '@/components/vendors/VendorModal';
import {
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Building2,
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

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
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
          description="Manage supplier profiles, statutory GST details, payment terms and inward purchases."
          actions={
            <div className="flex items-center gap-3">
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
          <LoadingState message="Loading vendors & suppliers..." />
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-6 h-6" />}
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
          <div className="bg-warm-surface border border-warm-border/70 shadow-warm rounded-none overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Location &amp; GSTIN</TableHead>
                  <TableHead className="hidden sm:table-cell">Terms &amp; Bills</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Opening Bal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    {/* Vendor Info */}
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className="font-bold text-warm-text text-sm">{v.name}</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-warm-textMuted">
                          {v.tradeName && (
                            <span className="font-medium text-warm-text">{v.tradeName}</span>
                          )}
                          {v.tradeName && (
                            <span>•</span>
                          )}
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-warm-input text-warm-text border border-warm-border/60">
                            {v.type === 'INDIVIDUAL' ? 'Individual' : 'Business'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1 text-xs text-warm-textMuted">
                        {v.contactPerson && (
                          <p className="font-medium text-warm-text">{v.contactPerson}</p>
                        )}
                        {v.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 shrink-0 text-warm-accent" />
                            <span>{v.phone}</span>
                          </p>
                        )}
                        {v.email && (
                          <p className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[180px]">{v.email}</span>
                          </p>
                        )}
                        {!v.phone && !v.email && !v.contactPerson && <span>—</span>}
                      </div>
                    </TableCell>

                    {/* Location & GSTIN */}
                    <TableCell className="hidden lg:table-cell">
                      <div className="space-y-1 text-xs">
                        {(v.city || v.state) ? (
                          <p className="flex items-center gap-1 text-warm-text font-medium">
                            <MapPin className="w-3.5 h-3.5 text-warm-accent shrink-0" />
                            <span>
                              {[v.city, v.state].filter(Boolean).join(', ')}
                            </span>
                          </p>
                        ) : (
                          <span className="text-warm-textMuted">—</span>
                        )}
                        {v.gstin ? (
                          <p className="text-[11px] text-warm-textMuted">
                            GST: {v.gstin}
                          </p>
                        ) : (
                          <span className="text-[10px] text-warm-textSubtle uppercase">Unregistered</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Terms & Bills */}
                    <TableCell className="hidden sm:table-cell">
                      <div className="space-y-1 text-xs">
                        <span className="text-warm-text font-medium block">
                          {v.paymentTerms || 'Net 30'}
                        </span>
                        <Link
                          href={`/purchases?vendorId=${v.id}`}
                          className="text-[11px] font-semibold text-warm-accent hover:underline inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>{v._count?.purchaseBills ?? 0} {v._count?.purchaseBills === 1 ? 'Bill' : 'Bills'}</span>
                        </Link>
                      </div>
                    </TableCell>

                    {/* Opening Balance */}
                    <TableCell className="hidden sm:table-cell text-right">
                      <div className="text-xs">
                        {v.openingBalance && Number(v.openingBalance) > 0 ? (
                          <span className="font-semibold text-warm-text tabular-nums">
                            {formatCurrency(Number(v.openingBalance))}{' '}
                            <span className="text-[10px] text-warm-textMuted font-normal">
                              ({v.balanceType || 'CR'})
                            </span>
                          </span>
                        ) : (
                          <span className="text-warm-textMuted">₹0.00</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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

      {/* Create / Edit Modal */}
      <VendorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vendor={selectedVendor}
        onSuccess={() => fetchVendors()}
      />

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
