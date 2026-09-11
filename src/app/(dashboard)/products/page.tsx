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
import { CustomerSelect } from '@/components/customers/CustomerSelect';
import { ProductFormModal } from '@/components/products/ProductFormModal';
import { ProductViewModal } from '@/components/products/ProductViewModal';
import { productsApi, toNumber } from '@/lib/products';
import { apiErrorMessage } from '@/lib/customers';
import { useDebounce } from '@/hooks/useDebounce';
import { PaginationMeta, Product, ProductListParams } from '@/types/index';
import { formatCurrency } from '@/lib/utils';
import { Package, Plus, Search, Eye, Pencil, Trash2, RotateCcw, Ban } from 'lucide-react';

const PAGE_SIZE = 10;

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false
};

type SortValue = `${NonNullable<ProductListParams['sortBy']>}:${'asc' | 'desc'}`;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState<'' | 'true' | 'false'>('');
  const [sort, setSort] = useState<SortValue>('createdAt:desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [isDeletingBusy, setIsDeletingBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const [sortBy, sortOrder] = sort.split(':') as [
      NonNullable<ProductListParams['sortBy']>,
      'asc' | 'desc'
    ];

    try {
      const result = await productsApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        customerId,
        isActive: status,
        sortBy,
        sortOrder
      });
      setProducts(result.products);
      setMeta(result.meta);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load products'));
      setProducts([]);
      setMeta(EMPTY_META);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, customerId, status, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, customerId, status, sort]);

  const hasFilters = Boolean(search || customerId || status);

  const resetFilters = () => {
    setSearch('');
    setCustomerId('');
    setStatus('');
    setSort('createdAt:desc');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setViewingId(null);
    setEditing(product);
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (product: Product) => {
    setTogglingId(product.id);
    try {
      const updated = await productsApi.setStatus(product.id, !product.isActive);

      // Patch just this row from the server's response - refetching the page
      // here would flash the whole table and lose the user's scroll position.
      setProducts((rows) =>
        rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
      );

      toast.success(product.isActive ? 'Product deactivated' : 'Product activated');
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
      await productsApi.remove(deleting.id);
      toast.success('Product deleted successfully');
      setDeleting(null);

      // Stepping back avoids landing on a page that no longer exists.
      if (products.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchProducts();
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not delete product'));
      setDeleting(null);
    } finally {
      setIsDeletingBusy(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading products..." />
        </div>
      );
    }

    if (products.length === 0) {
      return hasFilters ? (
        <EmptyState
          title="No products match your filters"
          description="Try a different search term, or clear the filters to see your full catalog."
          icon={<Search className="w-6 h-6 text-warm-accent" />}
          actionLabel="Clear Filters"
          onAction={resetFilters}
        />
      ) : (
        <EmptyState
          title="No products or services cataloged"
          description="Add products or service items with preset prices and tax rates to speed up invoice drafting."
          icon={<Package className="w-6 h-6 text-warm-accent" />}
          actionLabel="Add Product/Service"
          onAction={openCreate}
        />
      );
    }

    return (
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product / Service</TableHead>
              <TableHead className="hidden md:table-cell">Customer</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Tax</TableHead>
              <TableHead className="hidden xl:table-cell">HSN / SKU</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="space-y-0.5 max-w-xs">
                    <p className="font-semibold text-warm-text">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-warm-textMuted line-clamp-1">
                        {product.description}
                      </p>
                    )}
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  <div className="space-y-1">
                    <p className="text-xs text-warm-text">{product.customer?.name ?? '—'}</p>
                    {product.customer?.type && <Badge status={product.customer.type} />}
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <span className="font-semibold text-warm-text">
                    {formatCurrency(toNumber(product.price))}
                  </span>
                  <span className="block text-xs text-warm-textMuted">per {product.unit}</span>
                </TableCell>

                <TableCell className="hidden lg:table-cell text-right">
                  <span className="text-xs text-warm-textMuted">{toNumber(product.taxRate)}%</span>
                </TableCell>

                <TableCell className="hidden xl:table-cell">
                  <span className="block text-xs font-mono text-warm-textMuted">
                    {product.hsnSacCode || '—'}
                  </span>
                  <span className="block text-xs font-mono text-warm-textSubtle">
                    {product.sku || '—'}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      title="View details"
                      onClick={() => setViewingId(product.id)}
                      className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      title="Edit product"
                      onClick={() => openEdit(product)}
                      className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      title={product.isActive ? 'Deactivate' : 'Activate'}
                      disabled={togglingId === product.id}
                      onClick={() => handleToggleStatus(product)}
                      className="p-1.5 text-warm-textMuted hover:text-warm-accent hover:bg-warm-accentLight transition-colors disabled:opacity-50"
                    >
                      {product.isActive ? (
                        <Ban className="w-4 h-4" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      title="Delete product"
                      onClick={() => setDeleting(product)}
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
        title="Products & Services"
        description="Catalog of items, default pricing, HSN/SAC codes, and GST rates."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products & Services' }
        ]}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add Item
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search name, description, SKU, HSN or customer..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <CustomerSelect
            value={customerId}
            onChange={(id) => setCustomerId(id)}
            allowClear
            clearLabel="All customers"
            placeholder="All customers"
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
                <span className="font-semibold text-warm-text">{meta.total}</span> item
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
                { value: 'price:asc', label: 'Price (low to high)' },
                { value: 'price:desc', label: 'Price (high to low)' },
                { value: 'updatedAt:desc', label: 'Recently updated' }
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

      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        product={editing}
        onSaved={fetchProducts}
      />

      <ProductViewModal
        isOpen={Boolean(viewingId)}
        onClose={() => setViewingId(null)}
        productId={viewingId}
        onEdit={openEdit}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        isLoading={isDeletingBusy}
        isDanger
        title="Delete this product?"
        message={`"${deleting?.name}" will be permanently removed from your catalog. Existing invoices keep their own copy of the line item.`}
        confirmLabel="Delete"
      />
    </DashboardLayout>
  );
}
