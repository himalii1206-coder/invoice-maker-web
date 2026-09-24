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
import { customersApi, apiErrorMessage } from '@/lib/customers';
import { useDebounce } from '@/hooks/useDebounce';
import { Customer, CustomerListParams, PaginationMeta } from '@/types/index';
import { formatDate, formatCurrency } from '@/lib/utils';
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
  Phone,
  PhoneCall,
  MapPin,
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

type SortValue = `${NonNullable<CustomerListParams['sortBy']>}:${'asc' | 'desc'}`;

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [accountGroup, setAccountGroup] = useState('');
  const [partyCategory, setPartyCategory] = useState('');
  const [status, setStatus] = useState<'' | 'true' | 'false'>('');
  const [sort, setSort] = useState<SortValue>('createdAt:desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

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
        accountGroup: accountGroup || undefined,
        partyCategory: partyCategory || undefined,
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
  }, [page, debouncedSearch, accountGroup, partyCategory, status, sort]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, accountGroup, partyCategory, status, sort]);

  const hasFilters = Boolean(search || accountGroup || partyCategory || status);

  const resetFilters = () => {
    setSearch('');
    setAccountGroup('');
    setPartyCategory('');
    setStatus('');
    setSort('createdAt:desc');
    setPage(1);
  };

  const handleToggleStatus = async (customer: Customer) => {
    setTogglingId(customer.id);
    try {
      const updated = await customersApi.setStatus(customer.id, !customer.isActive);

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
          description="Try modifying search keywords or clearing filters to see your full directory."
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
          onAction={() => router.push('/customers/new')}
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
              <TableHead className="hidden lg:table-cell">Location &amp; GSTIN</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Opening Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                {/* Customer Info */}
                <TableCell>
                  <div className="space-y-1">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-bold text-warm-text hover:text-warm-accent transition-colors block text-sm"
                    >
                      {customer.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-warm-textMuted">
                      {customer.contactPerson && (
                        <span>{customer.contactPerson}</span>
                      )}
                      {customer.contactPerson && customer.partyCategory && (
                        <span>•</span>
                      )}
                      {customer.partyCategory && (
                        <span className="px-1.5 py-0.2 bg-warm-input text-warm-text text-[10px] font-medium border border-warm-border/60">
                          {customer.partyCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Contact */}
                <TableCell className="hidden md:table-cell">
                  <div className="space-y-1 text-xs text-warm-textMuted">
                    {customer.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-warm-accent" />
                        <span className="font-medium text-warm-text">{customer.phone}</span>
                      </p>
                    )}
                    {customer.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[200px]">{customer.email}</span>
                      </p>
                    )}
                    {!customer.phone && !customer.email && <span>—</span>}
                  </div>
                </TableCell>

                {/* Location & GSTIN */}
                <TableCell className="hidden lg:table-cell">
                  <div className="space-y-1 text-xs">
                    {(customer.city || customer.state) ? (
                      <p className="flex items-center gap-1 text-warm-text font-medium">
                        <MapPin className="w-3.5 h-3.5 text-warm-accent shrink-0" />
                        <span>
                          {[customer.city, customer.state].filter(Boolean).join(', ')}
                        </span>
                      </p>
                    ) : (
                      <span className="text-warm-textMuted">—</span>
                    )}
                    {customer.gstin ? (
                      <p className="text-[11px] text-warm-textMuted">
                        GST: {customer.gstin}
                      </p>
                    ) : (
                      <span className="text-[10px] text-warm-textSubtle uppercase">Unregistered</span>
                    )}
                  </div>
                </TableCell>

                {/* Opening Balance */}
                <TableCell className="hidden sm:table-cell text-right">
                  <div className="text-xs">
                    {customer.openingBalance !== null && customer.openingBalance !== undefined && Number(customer.openingBalance) > 0 ? (
                      <span className="font-semibold text-warm-text tabular-nums">
                        {formatCurrency(Number(customer.openingBalance))}{' '}
                        <span className="text-[10px] text-warm-textMuted font-normal">
                          ({customer.balanceType || 'Dr.'})
                        </span>
                      </span>
                    ) : (
                      <span className="text-warm-textMuted">₹0.00</span>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/customers/${customer.id}`}
                      title="View details"
                      className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors inline-flex items-center"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/customers/${customer.id}/edit`}
                      title="Edit customer"
                      className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors inline-flex items-center"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
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
        description="Manage client directory, ledger account groups, contacts, and balances."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Customers' }]}
        actions={
          <Link href="/customers/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Add Customer
            </Button>
          </Link>
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2 md:col-span-1">
            <Input
              placeholder="Search by name, phone, email, contact, GSTIN..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            options={[
              { value: '', label: 'All Account Groups' },
              { value: 'Sales', label: 'Sales' },
              { value: 'Purchase', label: 'Purchase' },
              { value: 'Sundry Debtors', label: 'Sundry Debtors' },
              { value: 'Sundry Creditors', label: 'Sundry Creditors' },
              { value: 'Customers', label: 'Customers' },
              { value: 'Distributors', label: 'Distributors' },
              { value: 'Retailers', label: 'Retailers' },
              { value: 'Branch / Division', label: 'Branch / Division' },
              { value: 'Other', label: 'Other' }
            ]}
            value={accountGroup}
            onChange={(e) => setAccountGroup(e.target.value)}
          />

          <Select
            options={[
              { value: '', label: 'All Categories' },
              { value: 'Wholesaler', label: 'Wholesaler' },
              { value: 'Retailer', label: 'Retailer' },
              { value: 'Manufacturer', label: 'Manufacturer' },
              { value: 'Trader', label: 'Trader' },
              { value: 'Distributor', label: 'Distributor' },
              { value: 'Service Provider', label: 'Service Provider' },
              { value: 'End Consumer', label: 'End Consumer' },
              { value: 'Other', label: 'Other' }
            ]}
            value={partyCategory}
            onChange={(e) => setPartyCategory(e.target.value)}
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-warm-border/50">
          <div className="flex items-center gap-2 text-xs text-warm-textMuted">
            <Filter className="w-3.5 h-3.5 text-warm-accent" />
            {isLoading ? (
              'Searching...'
            ) : (
              <>
                <span className="font-semibold text-warm-text">{meta.total}</span> customer
                {meta.total === 1 ? '' : 's'} found
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              className="h-9 text-xs"
              options={[
                { value: 'createdAt:desc', label: 'Newest first' },
                { value: 'createdAt:asc', label: 'Oldest first' },
                { value: 'name:asc', label: 'Account Head (A–Z)' },
                { value: 'name:desc', label: 'Account Head (Z–A)' },
                { value: 'openingBalance:desc', label: 'Opening Balance (High to Low)' },
                { value: 'openingBalance:asc', label: 'Opening Balance (Low to High)' },
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

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isLoading={isDeletingBusy}
        isDanger
        title="Delete this customer?"
        message={`"${deleting?.name}" will be permanently removed. Customers with existing invoices cannot be deleted — deactivate them instead.`}
        confirmLabel="Delete Customer"
      />
    </DashboardLayout>
  );
}
