'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { productsApi, toNumber } from '@/lib/products';
import { apiErrorMessage } from '@/lib/customers';
import { Product } from '@/types/index';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pencil, User } from 'lucide-react';

export interface ProductViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  onEdit: (product: Product) => void;
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">{label}</p>
      <div className="text-sm text-warm-text break-words">{value || '—'}</div>
    </div>
  );
}

export function ProductViewModal({
  isOpen,
  onClose,
  productId,
  onEdit
}: ProductViewModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !productId) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await productsApi.getById(productId);
        if (!cancelled) setProduct(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(apiErrorMessage(error, 'Could not load product'));
          onClose();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    // Guards against a stale response landing after the modal moved on.
    return () => {
      cancelled = true;
    };
  }, [isOpen, productId, onClose]);

  // Drop the previous record so reopening never flashes the wrong product.
  useEffect(() => {
    if (!isOpen) setProduct(null);
  }, [isOpen]);

  const price = toNumber(product?.price);
  const taxRate = toNumber(product?.taxRate);
  const taxAmount = (price * taxRate) / 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title="Product Details"
      description="Full pricing, tax and catalog record for this item."
    >
      {isLoading || !product ? (
        <LoadingState message="Loading product..." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-warm-border/50">
            <div className="space-y-1.5">
              <h4 className="text-lg font-semibold text-warm-text tracking-tight">
                {product.name}
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <Badge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />
                <span className="text-xs text-warm-textMuted">per {product.unit}</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-lg font-semibold text-warm-text">{formatCurrency(price)}</p>
              <p className="text-xs text-warm-textMuted">
                + {taxRate}% tax = {formatCurrency(price + taxAmount)}
              </p>
            </div>
          </div>

          <div className="bg-warm-input border border-warm-border/60 px-4 py-3 flex items-center gap-2.5">
            <User className="w-4 h-4 text-warm-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                Customer / Business
              </p>
              <p className="text-sm text-warm-text truncate">{product.customer?.name ?? '—'}</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 shrink-0">
              {product.customer?.type && <Badge status={product.customer.type} />}
              {product.customer && !product.customer.isActive && <Badge status="INACTIVE" />}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Unit Price" value={formatCurrency(price)} />
            <Field label="Tax Rate" value={`${taxRate}%`} />
            <Field label="HSN / SAC Code" value={product.hsnSacCode} />
            <Field label="SKU" value={product.sku} />

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted mb-1">
                Description
              </p>
              <p className="text-sm text-warm-text whitespace-pre-line leading-relaxed">
                {product.description || '—'}
              </p>
            </div>

            <Field label="Created On" value={formatDate(product.createdAt)} />
            <Field label="Last Updated" value={formatDate(product.updatedAt)} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border/50">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button leftIcon={<Pencil className="w-4 h-4" />} onClick={() => onEdit(product)}>
              Edit Product
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
