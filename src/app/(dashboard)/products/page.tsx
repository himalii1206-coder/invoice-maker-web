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
import { ProductFormModal } from '@/components/products/ProductFormModal';
import { ProductViewModal } from '@/components/products/ProductViewModal';
import { productsApi, toNumber } from '@/lib/products';
import { apiErrorMessage } from '@/lib/customers';
import { useDebounce } from '@/hooks/useDebounce';
import { PaginationMeta, Product, ProductListParams } from '@/types/index';
import { formatCurrency } from '@/lib/utils';
import { Package, Plus, Search, Eye, Pencil, Trash2, Tag } from 'lucide-react';

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

const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'General', label: 'General' },
  { value: 'Raw Material', label: 'Raw Material' },
  { value: 'Finished Goods', label: 'Finished Goods' },
  { value: 'Packaging', label: 'Packaging' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Textiles', label: 'Textiles' },
  { value: 'Chemicals', label: 'Chemicals' },
  { value: 'Machinery', label: 'Machinery' },
  { value: 'FMCG', label: 'FMCG' },
  { value: 'Services', label: 'Services' },
  { value: 'Other', label: 'Other' }
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<SortValue>('createdAt:desc');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 350);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [isDeletingBusy, setIsDeletingBusy] = useState(false);

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
        category: category || undefined,
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
  }, [page, debouncedSearch, category, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, sort]);

  const hasFilters = Boolean(search || category);

  const resetFilters = () => {
    setSearch('');
    setCategory('');
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

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeletingBusy(true);
    try {
      await productsApi.remove(deleting.id);
      toast.success('Product deleted successfully');
      setDeleting(null);

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
          title="No products match your search"
          description="Try a different search term, or clear filters to view all products."
          icon={<Search className="w-6 h-6 text-warm-accent" />}
          actionLabel="Clear Filters"
          onAction={resetFilters}
        />
      ) : (
        <EmptyState
          title="No products cataloged"
          description="Add your first product with category, product code, product name, units, HSN code, and price in INR."
          icon={<Package className="w-6 h-6 text-warm-accent" />}
          actionLabel="Add Product"
          onAction={openCreate}
        />
      );
    }

    return (
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Product Code</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>HSN Code</TableHead>
              <TableHead className="text-right">Price in INR</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {products.map((product) => {
              const code = product.productCode || product.sku;
              return (
                <TableRow key={product.id}>
                  {/* Category */}
                  <TableCell>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-warm-accentLight text-warm-accent border border-warm-border">
                      <Tag className="w-3 h-3" />
                      {product.category || 'General'}
                    </span>
                  </TableCell>

                  {/* Product Code */}
                  <TableCell>
                    {code ? (
                      <span className="text-xs font-semibold text-warm-text px-2 py-0.5 bg-warm-input border border-warm-border/60">
                        {code}
                      </span>
                    ) : (
                      <span className="text-xs text-warm-textMuted">—</span>
                    )}
                  </TableCell>

                  {/* Product Name */}
                  <TableCell>
                    <span className="font-semibold text-warm-text">{product.name}</span>
                  </TableCell>

                  {/* Units */}
                  <TableCell>
                    <span className="text-xs font-medium text-warm-text">{product.unit || 'PCS'}</span>
                  </TableCell>

                  {/* HSN Code */}
                  <TableCell>
                    {product.hsnSacCode ? (
                      <span className="text-xs font-semibold text-warm-text">
                        {product.hsnSacCode}
                      </span>
                    ) : (
                      <span className="text-xs text-warm-textMuted">—</span>
                    )}
                  </TableCell>

                  {/* Price in INR */}
                  <TableCell className="text-right">
                    <span className="font-bold text-warm-text text-sm">
                      {formatCurrency(toNumber(product.price))}
                    </span>
                  </TableCell>

                  {/* Actions */}
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
                        title="Delete product"
                        onClick={() => setDeleting(product)}
                        className="p-1.5 text-warm-textMuted hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
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
        title="Products & Services"
        description="Catalog of items with category, code, units, HSN, and price."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products & Services' }
        ]}
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add Product
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search by product name, code, category, HSN..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            options={CATEGORY_FILTER_OPTIONS}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-warm-border/50">
          <p className="text-xs text-warm-textMuted">
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                <span className="font-semibold text-warm-text">{meta.total}</span> product
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
                { value: 'name:asc', label: 'Product Name (A–Z)' },
                { value: 'name:desc', label: 'Product Name (Z–A)' },
                { value: 'price:asc', label: 'Price (low to high)' },
                { value: 'price:desc', label: 'Price (high to low)' },
                { value: 'category:asc', label: 'Category (A–Z)' },
                { value: 'productCode:asc', label: 'Product Code (A–Z)' }
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
