'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { productsApi, toNumber } from '@/lib/products';
import { apiErrorMessage } from '@/lib/customers';
import { Product } from '@/types/index';
import { formatCurrency } from '@/lib/utils';
import { Pencil, Tag } from 'lucide-react';

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
      <div className="text-sm text-warm-text break-words font-medium">{value || '—'}</div>
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
    return () => {
      cancelled = true;
    };
  }, [isOpen, productId, onClose]);

  useEffect(() => {
    if (!isOpen) setProduct(null);
  }, [isOpen]);

  const price = toNumber(product?.price);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title="Product Details"
      description="View product details."
    >
      {isLoading || !product ? (
        <LoadingState message="Loading product..." />
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-warm-border/50">
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-warm-text tracking-tight">
                {product.name}
              </h4>
              {product.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-warm-accentLight text-warm-accent border border-warm-border">
                  <Tag className="w-3 h-3" />
                  {product.category}
                </span>
              )}
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-warm-accent">{formatCurrency(price)}</p>
              <span className="text-xs text-warm-textMuted">per {product.unit || 'PCS'}</span>
            </div>
          </div>

          {/* 6 Fields Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-warm-surface/80 border border-warm-border/70 p-4">
            <Field
              label="Category"
              value={product.category || '—'}
            />
            <Field
              label="Product Code"
              value={
                product.productCode || product.sku ? (
                  <span className="font-mono text-warm-accent font-semibold">
                    {product.productCode || product.sku}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <Field
              label="Product Name"
              value={product.name}
            />
            <Field
              label="Units"
              value={product.unit || 'PCS'}
            />
            <Field
              label="HSN Code"
              value={
                product.hsnSacCode ? (
                  <span className="font-mono font-semibold">{product.hsnSacCode}</span>
                ) : (
                  '—'
                )
              }
            />
            <Field
              label="Price in INR"
              value={formatCurrency(price)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-border/50">
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
