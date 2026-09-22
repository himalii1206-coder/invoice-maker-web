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
                  <TableHead>Vendor / Trade Name</TableHead>
                  <TableHead>Location / State</TableHead>
                  <TableHead>GSTIN &amp; PAN</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Opening Bal</TableHead>
                  <TableHead>Purchase Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-warm-text text-sm">{v.name}</span>
                        {v.tradeName && (
                          <span className="text-xs text-warm-textMuted font-medium">
                            {v.tradeName}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-warm-accent mt-0.5">
                          {v.type === 'INDIVIDUAL' ? 'Proprietor / Individual' : 'Registered Business'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-warm-text">{v.city || '—'}</p>
                        <p className="text-warm-textMuted text-[11px]">{v.state || '—'}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <p className="text-warm-text font-semibold">{v.gstin || 'Unregistered'}</p>
                        {v.pan && <p className="text-[11px] text-warm-textMuted">PAN: {v.pan}</p>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <p className="font-medium text-warm-text">{v.contactPerson || v.name}</p>
                        <p className="text-warm-textMuted text-[11px]">{v.phone}</p>
                        {v.email && (
                          <div className="text-warm-textSubtle text-[10px] truncate max-w-[140px]">
                            {v.email}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-warm-textMuted font-medium">
                        {v.paymentTerms || 'Net 30 Days'}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-semibold text-warm-text">
                        {v.openingBalance ? formatCurrency(Number(v.openingBalance)) : '₹0.00'}
                      </span>
                      {v.balanceType && (
                        <span className="text-[10px] text-warm-textSubtle ml-1 font-bold">
                          ({v.balanceType})
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/purchases?vendorId=${v.id}`}
                        className="text-xs font-bold text-warm-accent hover:underline flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>{v._count?.purchaseBills ?? 0} Bills</span>
                      </Link>
                    </TableCell>

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
