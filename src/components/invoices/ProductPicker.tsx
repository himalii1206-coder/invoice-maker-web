'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { productsApi, toNumber } from '@/lib/products';
import { useDebounce } from '@/hooks/useDebounce';
import { Product } from '@/types/index';
import { formatCurrency } from '@/lib/utils';
import { Search, Package, Loader2, X, Tag } from 'lucide-react';

export interface ProductPickerProps {
  value: string;
  onTextChange: (value: string) => void;
  onSelect: (product: Product) => void;
  customerId?: string;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}

export function ProductPicker({
  value,
  onTextChange,
  onSelect,
  customerId,
  placeholder = 'Item name or search catalog',
  error,
  disabled
}: ProductPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const { products: rows } = await productsApi.list({
          search: debouncedValue,
          customerId: customerId || undefined,
          isActive: 'true',
          limit: 10,
          sortBy: 'name',
          sortOrder: 'asc'
        });
        if (!cancelled) {
          setProducts(rows);
          setHighlighted(-1);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, debouncedValue, customerId]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  const pick = (product: Product) => {
    onSelect(product);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((index) => Math.min(index + 1, products.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((index) => Math.max(index - 1, -1));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      const product = products[highlighted];
      if (product) pick(product);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onTextChange(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full h-9 pl-3 pr-8 bg-warm-input text-warm-text placeholder:text-warm-textSubtle text-sm rounded-none border border-warm-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent disabled:opacity-60',
          error && 'border-red-500 focus:ring-red-500/40 focus:border-red-500'
        )}
      />

      <button
        type="button"
        tabIndex={-1}
        aria-label="Search catalog"
        onClick={() => {
          setIsOpen((open) => !open);
          inputRef.current?.focus();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-warm-textMuted hover:text-warm-accent"
      >
        <Search className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute z-40 mt-1 w-full min-w-[280px] bg-warm-surface border border-warm-border shadow-warmLg">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-warm-border/50 bg-warm-input/40">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-textSubtle">
              Product Catalog
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 text-warm-textMuted hover:text-warm-text"
              aria-label="Close suggestions"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <ul className="max-h-56 overflow-y-auto py-1">
            {isLoading && (
              <li className="px-3 py-3 flex items-center justify-center gap-2 text-xs text-warm-textMuted">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-warm-accent" />
                Searching catalog...
              </li>
            )}

            {!isLoading && products.length === 0 && (
              <li className="px-3 py-4 text-center">
                <Package className="w-4 h-4 text-warm-textSubtle mx-auto mb-1" />
                <p className="text-[11px] text-warm-textMuted">
                  No matching products found
                </p>
                <p className="text-[10px] text-warm-textSubtle mt-0.5">
                  You can type any custom item name.
                </p>
              </li>
            )}

            {!isLoading &&
              products.map((product, index) => {
                const code = product.productCode || product.sku;
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => pick(product)}
                      className={cn(
                        'w-full px-3 py-2 flex items-start justify-between gap-3 text-left transition-colors hover:bg-warm-accentLight',
                        highlighted === index && 'bg-warm-accentLight'
                      )}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-warm-text truncate">
                            {product.name}
                          </span>
                          {code && (
                            <span className="font-mono text-[10px] px-1 bg-warm-input border border-warm-border text-warm-textMuted">
                              {code}
                            </span>
                          )}
                        </span>
                        <span className="block text-[10px] text-warm-textMuted truncate">
                          {product.category ? `${product.category} · ` : ''}
                          {product.hsnSacCode ? `HSN ${product.hsnSacCode} · ` : ''}
                          per {product.unit || 'PCS'}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-warm-accent shrink-0 tabular-nums">
                        {formatCurrency(toNumber(product.price))}
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}
