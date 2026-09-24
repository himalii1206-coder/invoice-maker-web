'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { quotationsApi } from '@/lib/quotations';
import { useDebounce } from '@/hooks/useDebounce';
import { Quotation } from '@/types/quotation';
import { QuotationStatusBadge } from './QuotationStatusBadge';
import { Search, ChevronDown, Check, Loader2, X, FileSpreadsheet } from 'lucide-react';

export interface QuotationSelectProps {
  value: string;
  onChange: (quotationId: string, quotation: Quotation | null) => void;
  initialLabel?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  customerId?: string; // Optional filter by customer
}

export function QuotationSelect({
  value,
  onChange,
  initialLabel,
  label = 'Import from Quotation / Estimate',
  error,
  helperText,
  required,
  disabled,
  placeholder = 'Select a quotation to populate details...',
  allowClear = true,
  customerId
}: QuotationSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? '');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
    } else if (initialLabel) {
      setSelectedLabel(initialLabel);
    }
  }, [value, initialLabel]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const { quotations: rows } = await quotationsApi.list({
          search: debouncedSearch,
          customerId: customerId || undefined,
          limit: 20,
          sortBy: 'quotationDate',
          sortOrder: 'desc'
        });
        if (!cancelled) setQuotations(rows);
      } catch {
        if (!cancelled) setQuotations([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, debouncedSearch, customerId]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleSelect = async (q: Quotation) => {
    const labelText = `${q.quotationNumber} — ${q.billingName} (${formatCurrency(Number(q.grandTotal))})`;
    setSelectedLabel(labelText);
    setIsOpen(false);
    setSearch('');
    try {
      const fullQuotation = await quotationsApi.getById(q.id);
      onChange(q.id, fullQuotation);
    } catch {
      onChange(q.id, q);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLabel('');
    onChange('', null);
    setSearch('');
  };

  return (
    <div className="w-full space-y-1.5" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-warm-accent" />
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <span className="text-[11px] text-warm-textSubtle">
            Auto-fills items, rates &amp; customer
          </span>
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            const next = !isOpen;
            setIsOpen(next);
            if (next) setTimeout(() => searchRef.current?.focus(), 50);
          }}
          className={cn(
            'w-full h-10 px-3.5 bg-warm-input text-left text-sm rounded-none border border-warm-border/70 flex items-center justify-between gap-2 transition-colors cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent',
            error && 'border-red-500 focus:ring-red-500/40 focus:border-red-500',
            disabled && 'opacity-60 cursor-not-allowed bg-warm-input/50'
          )}
        >
          <span className={cn('truncate', !selectedLabel && 'text-warm-placeholder')}>
            {selectedLabel || placeholder}
          </span>

          <div className="flex items-center gap-1 shrink-0 text-warm-textMuted">
            {allowClear && value && !disabled && (
              <span
                onClick={handleClear}
                className="p-1 hover:text-warm-text rounded-none transition-colors"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn('w-4 h-4 transition-transform duration-150', isOpen && 'rotate-180')}
            />
          </div>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-warm-surface border border-warm-border/80 shadow-warmLg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Search filter input */}
            <div className="p-2 border-b border-warm-border/60 bg-warm-input/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-warm-textMuted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Q. No., customer, subject..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-warm-surface border border-warm-border text-warm-text placeholder:text-warm-placeholder rounded-none focus:outline-none focus:border-warm-accent"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-warm-border/40">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-warm-textMuted flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-warm-accent" />
                  Loading quotations...
                </div>
              ) : quotations.length === 0 ? (
                <div className="p-4 text-center text-xs text-warm-textMuted">
                  {search ? 'No matching quotations found' : 'No quotations available'}
                </div>
              ) : (
                quotations.map((q) => {
                  const isSelected = q.id === value;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleSelect(q)}
                      className={cn(
                        'w-full p-2.5 text-left text-xs hover:bg-warm-input/60 transition-colors flex items-center justify-between gap-3 cursor-pointer',
                        isSelected && 'bg-warm-accent-light/50 font-medium'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-warm-text">{q.quotationNumber}</span>
                          <QuotationStatusBadge status={q.status} size="sm" showIcon={false} />
                          <span className="text-[10px] text-warm-textMuted">
                            {formatDate(q.quotationDate)}
                          </span>
                        </div>
                        <p className="text-warm-text truncate mt-0.5 font-medium">{q.billingName}</p>
                        {q.subject && (
                          <p className="text-[11px] text-warm-textMuted truncate">{q.subject}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-warm-text block tabular-nums">
                          {formatCurrency(Number(q.grandTotal))}
                        </span>
                        <span className="text-[10px] text-warm-textMuted">
                          {q.items?.length ?? 0} item{(q.items?.length ?? 0) === 1 ? '' : 's'}
                        </span>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-warm-accent shrink-0 ml-1" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {helperText && !error && <p className="text-xs text-warm-textMuted">{helperText}</p>}
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
