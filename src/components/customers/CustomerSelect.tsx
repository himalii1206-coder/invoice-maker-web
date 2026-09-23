'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { customersApi } from '@/lib/customers';
import { useDebounce } from '@/hooks/useDebounce';
import { Customer } from '@/types/index';
import { Badge } from '@/components/ui/Badge';
import { Search, ChevronDown, Check, Loader2, X, Users } from 'lucide-react';

export interface CustomerSelectProps {
  value: string;
  onChange: (customerId: string, customer: Customer | null) => void;
  /** Shows the current name before the list has loaded, e.g. when editing. */
  initialLabel?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Adds an "All customers" choice - used by the list filter, not the form. */
  allowClear?: boolean;
  clearLabel?: string;
}

export function CustomerSelect({
  value,
  onChange,
  initialLabel,
  label,
  error,
  helperText,
  required,
  disabled,
  placeholder = 'Select a customer',
  allowClear = false,
  clearLabel = 'All customers'
}: CustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? '');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 350);

  // Keep the button label in sync when the parent swaps the selection.
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
    } else if (initialLabel) {
      setSelectedLabel(initialLabel);
    }
  }, [value, initialLabel]);

  // Load matches only while the dropdown is open.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const { customers: rows } = await customersApi.list({
          search: debouncedSearch,
          limit: 20,
          sortBy: 'name',
          sortOrder: 'asc'
        });
        if (!cancelled) setCustomers(rows);
      } catch {
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, debouncedSearch]);

  // Close on outside click or Escape.
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

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearch('');
    // Focus after the panel paints so typing goes straight into search.
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const pick = (customer: Customer | null) => {
    setSelectedLabel(customer?.name ?? '');
    onChange(customer?.id ?? '', customer);
    setIsOpen(false);
  };

  return (
    <div className="w-full space-y-1.5" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => (isOpen ? setIsOpen(false) : open())}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'w-full h-10 pl-3.5 pr-8 flex items-center bg-warm-input text-left text-sm rounded-none border border-warm-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent disabled:opacity-60 disabled:cursor-not-allowed',
            selectedLabel ? 'text-warm-text' : 'text-warm-textSubtle',
            error && 'border-red-500 focus:ring-red-500/40 focus:border-red-500'
          )}
        >
          <span className="truncate">
            {selectedLabel || (allowClear && !value ? clearLabel : placeholder)}
          </span>
          <ChevronDown className="w-4 h-4 text-warm-textMuted absolute right-3 pointer-events-none" />
        </button>

        {isOpen && (
          <div className="absolute z-30 mt-1 w-full bg-warm-surface border border-warm-border shadow-warmLg">
            <div className="p-2 border-b border-warm-border/50">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-warm-textMuted absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full h-9 pl-8 pr-8 bg-warm-input text-warm-text placeholder:text-warm-placeholder text-sm rounded-none border border-warm-border/60 focus:outline-none focus:ring-2 focus:ring-warm-accent/40 focus:border-warm-accent"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                    className="absolute right-2 p-0.5 text-warm-textMuted hover:text-warm-text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
              {allowClear && (
                <li>
                  <button
                    type="button"
                    onClick={() => pick(null)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left text-sm text-warm-text hover:bg-warm-accentLight transition-colors"
                  >
                    <span className="text-warm-textMuted">{clearLabel}</span>
                    {!value && <Check className="w-4 h-4 text-warm-accent" />}
                  </button>
                </li>
              )}

              {isLoading && (
                <li className="px-3 py-4 flex items-center justify-center gap-2 text-xs text-warm-textMuted">
                  <Loader2 className="w-4 h-4 animate-spin text-warm-accent" />
                  Searching...
                </li>
              )}

              {!isLoading && customers.length === 0 && (
                <li className="px-3 py-5 text-center">
                  <Users className="w-5 h-5 text-warm-textSubtle mx-auto mb-1.5" />
                  <p className="text-xs text-warm-textMuted">
                    {search ? 'No customers match that search' : 'No customers added yet'}
                  </p>
                </li>
              )}

              {!isLoading &&
                customers.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={customer.id === value}
                      onClick={() => pick(customer)}
                      className={cn(
                        'w-full px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors hover:bg-warm-accentLight',
                        customer.id === value && 'bg-warm-accentLight/60'
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm text-warm-text truncate">
                          {customer.name}
                        </span>
                        <span className="block text-xs text-warm-textMuted truncate">
                          {customer.email || customer.phone || 'No contact details'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <Badge status={customer.type} />
                        {!customer.isActive && <Badge status="INACTIVE" />}
                        {customer.id === value && <Check className="w-4 h-4 text-warm-accent" />}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-warm-textSubtle mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}
