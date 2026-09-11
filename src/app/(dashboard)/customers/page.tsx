'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
import { CustomerFormModal } from '@/components/customers/CustomerFormModal';
import { CustomerViewModal } from '@/components/customers/CustomerViewModal';
import { customersApi, apiErrorMessage } from '@/lib/customers';
import { useDebounce } from '@/hooks/useDebounce';
import { Customer, CustomerListParams, PaginationMeta } from '@/types/index';
import { formatDate } from '@/lib/utils';
import {
  Users,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  Ban,
  Mail,
  Phone
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

type SortValue = `${NonNullable<CustomerListParams['sortBy']>}:${'asc' | 'desc'}`;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | 'BUSINESS' | 'INDIVIDUAL'>('');
  const [status, setStatus] = useState<'' | 'true' | 'false'>('');
  const [sort, setSort] = useState<SortValue>('createdAt:desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [isDeletingBusy, setIsDeletingBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    const [sortBy, sortOrder] = sort.split(':') as [
      NonNullable<CustomerListParams['sortBy']>,
      'asc' | 'desc'
    ];

    try {
      const result = await customersApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        type,
        isActive: status,
        sortBy,
        sortOrder
      });
      setCustomers(result.customers);
      setMeta(result.meta);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load customers'));
      setCustomers([]);
      setMeta(EMPTY_META);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, type, status, sort]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, status, sort]);

  const hasFilters = Boolean(search || type || status);

  const resetFilters = () => {
    setSearch('');
    setType('');
    setStatus('');
    setSort('createdAt:desc');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setViewingId(null);
    setEditing(customer);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (customer: Customer) => {
    setTogglingId(customer.id);
    try {
      const updated = await customersApi.setStatus(customer.id, !customer.isActive);

      // Patch just this row from the server's response - refetching the page
      // here would flash the whole table and lose the user's scroll position.
      setCustomers((rows) =>
        rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
      );

      toast.success(customer.isActive ? 'Customer deactivated' : 'Customer activated');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not update status'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeletingBusy(true);
    try {
      await customersApi.remove(deleting.id);
      toast.success('Customer deleted successfully');
      setDeleting(null);

      // Stepping back avoids landing on a page that no longer exists.
      if (customers.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchCustomers();
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not delete customer'));
      setDeleting(null);
    } finally {
      setIsDeletingBusy(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading customers..." />
        </div>
      );
    }

    if (customers.length === 0) {
      return hasFilters ? (
        <EmptyState
          title="No customers match your filters"
          description="Try a different search term, or clear the filters to see your full directory."
          icon={<Search className="w-6 h-6 text-warm-accent" />}
          actionLabel="Clear Filters"
          onAction={resetFilters}
        />
      ) : (
        <EmptyState
          title="No customers added yet"
          description="Add client businesses or individuals to easily select them during invoice creation."
          icon={<Users className="w-6 h-6 text-warm-accent" />}
          actionLabel="Add First Customer"
          onAction={openCreate}
        />
      );
    }

    return (
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">GSTIN</TableHead>
              <TableHead className="hidden sm:table-cell">Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden xl:table-cell">Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-semibold text-warm-text">{customer.name}</p>
                    <Badge status={customer.type} />
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <div className="space-y-1 text-xs text-warm-textMuted">
                    {customer.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="break-all">{customer.email}</span>
                      </p>
                    )}
                    {customer.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        {customer.phone}
                      </p>
                    )}
                    {!customer.email && !customer.phone && <span>—</span>}
                  </div>
                </TableCell>

                <TableCell className="hidden lg:table-cell">
                  <span className="text-xs font-mono text-warm-textMuted">
                    {customer.gstin || '—'}
                  </span>
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <span className="text-xs text-warm-textMuted">
                    {[customer.city, customer.state].filter(Boolean).join(', ') || '—'}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </TableCell>

                <TableCell className="hidden xl:table-cell">
                  <span className="text-xs text-warm-textMuted">
                    {formatDate(customer.createdAt)}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      title="View details"
                      onClick={() => setViewingId(customer.id)}
                      className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      title="Edit customer"
                      onClick={() => openEdit(customer)}
                      className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      title={customer.isActive ? 'Deactivate' : 'Activate'}
                      disabled={togglingId === customer.id}
                      onClick={() => handleToggleStatus(customer)}
                      className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors disabled:opacity-50"
                    >
                      {customer.isActive ? (
                        <Ban className="w-4 h-4" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      title="Delete customer"
                      onClick={() => setDeleting(customer)}
                      className="p-1.5 text-warm-textMuted hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Table brings its own card border, so the footer only needs the sides. */}
        {meta.totalPages > 1 && (
          <div className="border-x border-b border-warm-border/60 shadow-warm">
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
    );
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Customers"
        description="Manage client directory, business information, and invoice histories."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Customers' }]}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add Customer
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search name, email, phone, GSTIN or city..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            options={[
              { value: '', label: 'All Types' },
              { value: 'BUSINESS', label: 'Business' },
              { value: 'INDIVIDUAL', label: 'Individual' }
            ]}
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          />

          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-warm-border/50">
          <p className="text-xs text-warm-textMuted">
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                <span className="font-semibold text-warm-text">{meta.total}</span> customer
                {meta.total === 1 ? '' : 's'} found
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <Select
              className="h-9 text-xs"
              options={[
                { value: 'createdAt:desc', label: 'Newest first' },
                { value: 'createdAt:asc', label: 'Oldest first' },
                { value: 'name:asc', label: 'Name (A–Z)' },
                { value: 'name:desc', label: 'Name (Z–A)' },
                { value: 'updatedAt:desc', label: 'Recently updated' },
                { value: 'city:asc', label: 'City (A–Z)' }
              ]}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
            />

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {renderContent()}

      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        customer={editing}
        onSaved={fetchCustomers}
      />

      <CustomerViewModal
        isOpen={Boolean(viewingId)}
        onClose={() => setViewingId(null)}
        customerId={viewingId}
        onEdit={openEdit}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isLoading={isDeletingBusy}
        isDanger
        title="Delete this customer?"
        message={`"${deleting?.name}" will be permanently removed. Customers with existing invoices cannot be deleted — deactivate them instead.`}
        confirmLabel="Delete"
      />
    </DashboardLayout>
  );
}
